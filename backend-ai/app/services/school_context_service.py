"""Crea un riassunto testuale del carico scolastico imminente dell utente
permettendo alla chat LLM di rispondere usando dati reali.
"""
from datetime import date, timedelta
from typing import Optional
from uuid import UUID

from app.core.db import get_conn


async def build_user_context(
    user_id: UUID,
    days_ahead: int = 14,
) -> str:
    """Restituisce un riassunto in Markdown di classi, compiti, verifiche,
    interrogazioni e lezioni recenti. Stringa vuota se non ci sono dati.
    """
    today = date.today()
    horizon = today + timedelta(days=days_ahead)

    async with get_conn() as conn:
        async with conn.cursor() as cur:
            # Profilo utente
            await cur.execute(
                "SELECT full_name, role FROM users WHERE id=%s",
                (str(user_id),),
            )
            user = await cur.fetchone()
            if not user:
                return ""

            # Classi a cui l utente appartiene
            await cur.execute(
                """SELECT c.id, c.name, c.subject
                   FROM classes c
                   JOIN class_members m ON m.class_id = c.id
                   WHERE m.user_id = %s AND c.deleted_at IS NULL
                   ORDER BY c.name""",
                (str(user_id),),
            )
            classes = await cur.fetchall()
            class_ids = [str(c["id"]) for c in classes]

            homework: list = []
            exams: list = []
            interrogations: list = []
            lessons: list = []
            if class_ids:
                # Compiti in scadenza nel periodo
                await cur.execute(
                    """SELECT h.title, h.subject, h.due_date, h.priority,
                              c.name AS class_name
                       FROM homework h
                       JOIN classes c ON c.id = h.class_id
                       WHERE h.class_id = ANY(%s::uuid[])
                         AND h.deleted_at IS NULL
                         AND h.due_date BETWEEN %s AND %s
                       ORDER BY h.due_date, h.priority DESC""",
                    (class_ids, today, horizon),
                )
                homework = await cur.fetchall()

                await cur.execute(
                    """SELECT e.title, e.subject, e.scheduled_for, e.topics,
                              c.name AS class_name
                       FROM exams e
                       JOIN classes c ON c.id = e.class_id
                       WHERE e.class_id = ANY(%s::uuid[])
                         AND e.scheduled_for::date BETWEEN %s AND %s
                       ORDER BY e.scheduled_for""",
                    (class_ids, today, horizon),
                )
                exams = await cur.fetchall()

                await cur.execute(
                    """SELECT i.subject, i.topic, i.scheduled_for,
                              c.name AS class_name
                       FROM interrogations i
                       JOIN classes c ON c.id = i.class_id
                       WHERE i.class_id = ANY(%s::uuid[])
                         AND i.scheduled_for::date BETWEEN %s AND %s
                         AND (i.student_id = %s OR i.student_id IS NULL)
                       ORDER BY i.scheduled_for""",
                    (class_ids, today, horizon, str(user_id)),
                )
                interrogations = await cur.fetchall()

                await cur.execute(
                    """SELECT l.title, l.topic, l.taught_on,
                              c.name AS class_name
                       FROM lessons l
                       JOIN classes c ON c.id = l.class_id
                       WHERE l.class_id = ANY(%s::uuid[])
                         AND l.taught_on >= %s
                       ORDER BY l.taught_on DESC
                       LIMIT 10""",
                    (class_ids, today - timedelta(days=14)),
                )
                lessons = await cur.fetchall()

    lines = [
        "## CONTESTO SCOLASTICO DELL'UTENTE",
        f"Nome: {user['full_name']} ({user['role']})",
        f"Data odierna: {today.isoformat()}",
        "",
    ]

    if classes:
        lines.append("### Classi/Materie")
        for c in classes:
            subj = f" — {c['subject']}" if c.get("subject") else ""
            lines.append(f"- {c['name']}{subj}")
        lines.append("")

    lines.append(f"### Compiti per casa (dal {today.isoformat()} al {horizon.isoformat()})")
    if homework:
        for h in homework:
            when = h["due_date"].isoformat()
            tag = " ⚠️" if h["priority"] and h["priority"] >= 3 else ""
            subj = h["subject"] or h["class_name"]
            lines.append(f"- {when} · {subj}: {h['title']}{tag}")
    else:
        lines.append("- Nessun compito in scadenza nel periodo considerato.")
    lines.append("")

    lines.append("### Verifiche/Esami in programma")
    if exams:
        for e in exams:
            when = e["scheduled_for"].strftime("%Y-%m-%d %H:%M")
            topics = (", ".join(e["topics"]) if e.get("topics") else "")
            t = f" — argomenti: {topics}" if topics else ""
            subj = e["subject"] or e["class_name"]
            lines.append(f"- {when} · {subj}: {e['title']}{t}")
    else:
        lines.append("- Nessuna verifica programmata.")
    lines.append("")

    lines.append("### Interrogazioni in programma")
    if interrogations:
        for i in interrogations:
            when = i["scheduled_for"].strftime("%Y-%m-%d %H:%M")
            subj = i["subject"] or i["class_name"]
            topic = f" su {i['topic']}" if i.get("topic") else ""
            lines.append(f"- {when} · {subj}{topic}")
    else:
        lines.append("- Nessuna interrogazione programmata.")
    lines.append("")

    if lessons:
        lines.append("### Argomenti svolti di recente")
        for l in lessons:
            when = l["taught_on"].isoformat()
            topic = f" — {l['topic']}" if l.get("topic") else ""
            lines.append(f"- {when} · {l['class_name']}: {l['title']}{topic}")
        lines.append("")

    return "\n".join(lines)
