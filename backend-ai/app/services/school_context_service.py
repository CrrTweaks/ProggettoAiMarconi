"""Crea un riassunto testuale del carico scolastico imminente dell utente
permettendo alla chat LLM di rispondere usando dati reali.
"""
from datetime import date, datetime, timedelta
from typing import Optional
from uuid import UUID

from app.core.db import get_conn

_IT_WEEKDAYS = [
    "lunedì", "martedì", "mercoledì", "giovedì",
    "venerdì", "sabato", "domenica",
]
_IT_MONTHS = [
    "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
    "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
]


def _it_date(value, with_time: bool = False) -> str:
    """Formatta una data/datetime in italiano includendo il giorno della
    settimana, esempio 'lunedì 18 maggio 2026' oppure
    'lunedì 18 maggio 2026 alle 09:30'. Aggiunge sempre la data ISO tra
    parentesi così il modello può disambiguare se serve."""
    if isinstance(value, datetime):
        d = value.date()
        time_part = value.strftime("%H:%M")
    elif isinstance(value, date):
        d = value
        time_part = None
    else:
        return str(value)
    base = (
        f"{_IT_WEEKDAYS[d.weekday()]} {d.day} {_IT_MONTHS[d.month - 1]} "
        f"{d.year}"
    )
    if with_time and time_part:
        base += f" alle {time_part}"
    return f"{base} ({d.isoformat()})"


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

            # Materie del teacher (per filtrare il carico)
            teacher_subjects: list = []
            if user["role"] == "teacher":
                await cur.execute(
                    """SELECT DISTINCT subject
                       FROM schedules
                       WHERE teacher_id = %s""",
                    (str(user_id),),
                )
                teacher_subjects = [r["subject"] for r in await cur.fetchall()]

            homework: list = []
            exams: list = []
            interrogations: list = []
            lessons: list = []
            if class_ids:
                subj_filter = ""
                subj_params: tuple = ()
                if user["role"] == "teacher" and teacher_subjects:
                    subj_filter = " AND h.subject = ANY(%s)"
                    subj_params = (teacher_subjects,)

                # Compiti in scadenza nel periodo
                await cur.execute(
                    f"""SELECT h.title, h.subject, h.due_date, h.priority,
                              c.name AS class_name
                       FROM homework h
                       JOIN classes c ON c.id = h.class_id
                       WHERE h.class_id = ANY(%s::uuid[])
                         AND h.deleted_at IS NULL
                         AND h.due_date BETWEEN %s AND %s
                         {subj_filter}
                       ORDER BY h.due_date, h.priority DESC""",
                    (class_ids, today, horizon) + subj_params,
                )
                homework = await cur.fetchall()

                await cur.execute(
                    f"""SELECT e.title, e.subject, e.scheduled_for, e.topics,
                              c.name AS class_name
                       FROM exams e
                       JOIN classes c ON c.id = e.class_id
                       WHERE e.class_id = ANY(%s::uuid[])
                         AND e.scheduled_for::date BETWEEN %s AND %s
                         {subj_filter}
                       ORDER BY e.scheduled_for""",
                    (class_ids, today, horizon) + subj_params,
                )
                exams = await cur.fetchall()

                await cur.execute(
                    f"""SELECT i.subject, i.topic, i.scheduled_for,
                              c.name AS class_name
                       FROM interrogations i
                       JOIN classes c ON c.id = i.class_id
                       WHERE i.class_id = ANY(%s::uuid[])
                         AND i.scheduled_for::date BETWEEN %s AND %s
                         AND (i.student_id = %s OR i.student_id IS NULL)
                         {subj_filter}
                       ORDER BY i.scheduled_for""",
                    (class_ids, today, horizon, str(user_id)) + subj_params,
                )
                interrogations = await cur.fetchall()

                await cur.execute(
                    f"""SELECT l.title, l.topic, l.taught_on,
                              c.name AS class_name
                       FROM lessons l
                       JOIN classes c ON c.id = l.class_id
                       WHERE l.class_id = ANY(%s::uuid[])
                         AND l.taught_on >= %s
                         {subj_filter}
                       ORDER BY l.taught_on DESC
                       LIMIT 10""",
                    (class_ids, today - timedelta(days=14)) + subj_params,
                )
                lessons = await cur.fetchall()

    # Confini di settimana (lunedì–venerdì, settimana corta).
    # weekday(): 0 = lunedì .. 6 = domenica
    monday_this = today - timedelta(days=today.weekday())
    friday_this = monday_this + timedelta(days=4)
    monday_next = monday_this + timedelta(days=7)
    friday_next = monday_next + timedelta(days=4)

    lines = [
        "## CONTESTO SCOLASTICO DELL'UTENTE",
        f"Nome: {user['full_name']} ({user['role']})",
        f"Data odierna: {_it_date(today)}",
        "",
        "### Definizioni di periodo (usa SEMPRE queste, non ricalcolare)",
        f"- 'oggi' = {_it_date(today)}",
        f"- 'questa settimana' = da {_it_date(monday_this)} "
        f"a {_it_date(friday_this)} (lunedì–venerdì, la scuola usa "
        "la settimana corta: niente sabato e domenica)",
        f"- 'la prossima settimana' / 'la settimana che devo affrontare' "
        f"= da {_it_date(monday_next)} a {_it_date(friday_next)}",
        "",
        "NOTA IMPORTANTE: i giorni della settimana indicati sono già stati "
        "calcolati correttamente. Usa SEMPRE quelli mostrati qui sotto, "
        "non ricalcolarli e non inventarli. Quando l'utente chiede della "
        "'settimana', filtra gli impegni nell'intervallo corrispondente "
        "indicato sopra.",
        "",
    ]

    if classes:
        lines.append("### Classi/Materie")
        for c in classes:
            subj = f" — {c['subject']}" if c.get("subject") else ""
            lines.append(f"- {c['name']}{subj}")
        lines.append("")

    lines.append(
        f"### Compiti per casa (dal {_it_date(today)} al {_it_date(horizon)})"
    )
    if homework:
        for h in homework:
            when = _it_date(h["due_date"])
            tag = " ⚠️" if h["priority"] and h["priority"] >= 3 else ""
            subj = h["subject"] or h["class_name"]
            lines.append(f"- {when} · {subj}: {h['title']}{tag}")
    else:
        lines.append("- Nessun compito in scadenza nel periodo considerato.")
    lines.append("")

    lines.append("### Verifiche/Esami in programma")
    if exams:
        for e in exams:
            when = _it_date(e["scheduled_for"], with_time=True)
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
            when = _it_date(i["scheduled_for"], with_time=True)
            subj = i["subject"] or i["class_name"]
            topic = f" su {i['topic']}" if i.get("topic") else ""
            lines.append(f"- {when} · {subj}{topic}")
    else:
        lines.append("- Nessuna interrogazione programmata.")
    lines.append("")

    if lessons:
        lines.append("### Argomenti svolti di recente")
        for l in lessons:
            when = _it_date(l["taught_on"])
            topic = f" — {l['topic']}" if l.get("topic") else ""
            lines.append(f"- {when} · {l['class_name']}: {l['title']}{topic}")
        lines.append("")

    return "\n".join(lines)
