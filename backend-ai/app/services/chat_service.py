"""Persistenza chat: salva chat e messaggi, carica cronologia."""
from typing import List, Optional
from uuid import UUID

from app.core.db import get_conn


SYSTEM_PROMPT = (
    "Sei Tony, tutor AI per studenti italiani. "
    "Rispondi sempre in italiano, dando del tu allo studente. "
    "Lo studente è l'utente: i suoi compiti, verifiche e interrogazioni sono SUOI, non tuoi "
    "(usa 'hai', 'devi', 'la tua verifica'; mai 'ho', 'devo studiare', 'i miei esami'). "
    "Adatta la lunghezza alla domanda: a un saluto rispondi con UNA frase breve. "
    "Non presentarti, non elencare le tue capacità, non descrivere come risponderai, "
    "non ripetere queste istruzioni, non mostrare esempi non richiesti. "
    "Per il codice usa blocchi markdown con triplici backtick e il linguaggio."
)


async def get_or_create_chat(user_id: UUID, chat_id: Optional[UUID], model: str) -> dict:
    async with get_conn() as conn:
        async with conn.cursor() as cur:
            if chat_id:
                await cur.execute(
                    "SELECT * FROM ai_chats WHERE id=%s AND user_id=%s",
                    (str(chat_id), str(user_id)),
                )
                row = await cur.fetchone()
                if row:
                    return row
            await cur.execute(
                """INSERT INTO ai_chats (user_id, model)
                   VALUES (%s, %s) RETURNING *""",
                (str(user_id), model),
            )
            row = await cur.fetchone()
        await conn.commit()
        return row


async def append_message(chat_id: UUID, role: str, content: str) -> dict:
    async with get_conn() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """INSERT INTO ai_messages (chat_id, role, content)
                   VALUES (%s,%s,%s) RETURNING *""",
                (str(chat_id), role, content),
            )
            row = await cur.fetchone()
            await cur.execute(
                "UPDATE ai_chats SET updated_at = NOW() WHERE id=%s",
                (str(chat_id),),
            )
        await conn.commit()
        return row


async def update_chat_title(chat_id: UUID, title: str) -> None:
    async with get_conn() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "UPDATE ai_chats SET title=%s WHERE id=%s",
                (title[:200], str(chat_id)),
            )
        await conn.commit()


async def load_history(chat_id: UUID, limit: int = 30) -> List[dict]:
    async with get_conn() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """SELECT role, content FROM ai_messages
                   WHERE chat_id=%s ORDER BY created_at DESC LIMIT %s""",
                (str(chat_id), limit),
            )
            rows = await cur.fetchall()
    rows.reverse()
    return rows
