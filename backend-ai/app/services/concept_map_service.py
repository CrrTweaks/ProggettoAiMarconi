"""Concept-map generation: extract concepts + relations from text via LLM."""
import json
import re
from typing import List, Optional
from uuid import UUID

from loguru import logger

from app.core.db import get_conn
from app.core.ollama_client import ollama


CONCEPT_PROMPT = """Sei un tutor AI. Dato il testo sottostante, costruisci una MAPPA CONCETTUALE.
Estrai fino a {max_concepts} concetti chiave (frasi nominali brevi, 1–4 parole).
Poi elenca relazioni dirette tra loro, ciascuna con un'etichetta breve (frase verbale, 1–4 parole).

Restituisci SOLO un oggetto JSON valido con questa forma esatta:
{{
  "title": "<titolo breve nella stessa lingua del testo>",
  "nodes": [
    {{ "id": "n1", "label": "Concetto A", "type": "root" }},
    {{ "id": "n2", "label": "Concetto B", "type": "concept" }}
  ],
  "edges": [
    {{ "source": "n1", "target": "n2", "label": "include" }}
  ]
}}

Regole:
- Usa id stabili "n1","n2", … in ordine di importanza (n1 = concetto centrale).
- Rispondi nella STESSA LINGUA del testo di input.
- NON avvolgere il JSON in backtick markdown. Restituisci SOLO JSON.

TESTO:
\"\"\"{text}\"\"\"
"""


def _parse_json(raw: str) -> dict:
    # Strip code fences if the model added them anyway
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.M)
    # Try to locate the outermost JSON object
    match = re.search(r"\{.*\}", cleaned, re.S)
    if not match:
        raise ValueError("LLM did not return JSON")
    return json.loads(match.group(0))


async def generate_concept_map(
    text: str,
    max_concepts: int = 12,
    model: Optional[str] = None,
) -> dict:
    if not text or len(text.strip()) < 20:
        raise ValueError("Text too short to build a concept map")

    prompt = CONCEPT_PROMPT.format(max_concepts=max_concepts, text=text[:6000])
    raw = await ollama.chat(
        [{"role": "user", "content": prompt}],
        model=model,
        options={"temperature": 0.3},
    )
    try:
        data = _parse_json(raw)
    except Exception as exc:
        logger.warning(f"Concept map JSON parse failed, retrying once: {exc}")
        raw2 = await ollama.chat(
            [
                {"role": "system", "content": "Rispondi con JSON rigoroso, niente prosa."},
                {"role": "user", "content": prompt},
            ],
            model=model,
            options={"temperature": 0.0},
        )
        data = _parse_json(raw2)

    # sanitise
    nodes = [
        {"id": n.get("id", f"n{i+1}"),
         "label": str(n.get("label", "")).strip(),
         "type": n.get("type", "concept")}
        for i, n in enumerate(data.get("nodes", []))
        if n.get("label")
    ]
    valid_ids = {n["id"] for n in nodes}
    edges = [
        {"source": e["source"], "target": e["target"], "label": str(e.get("label", "")).strip()}
        for e in data.get("edges", [])
        if e.get("source") in valid_ids and e.get("target") in valid_ids
    ]
    return {
        "title": data.get("title") or "Mappa Concettuale",
        "nodes": nodes,
        "edges": edges,
    }


async def save_concept_map(
    user_id: UUID,
    title: str,
    graph: dict,
    source_text: Optional[str] = None,
    source_pdf_id: Optional[UUID] = None,
) -> str:
    async with get_conn() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """INSERT INTO concept_maps
                     (user_id, title, source_text, source_pdf_id, graph)
                   VALUES (%s,%s,%s,%s,%s::jsonb)
                   RETURNING id""",
                (str(user_id), title, source_text, str(source_pdf_id) if source_pdf_id else None, json.dumps(graph)),
            )
            row = await cur.fetchone()
        await conn.commit()
    return str(row["id"])
