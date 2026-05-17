"""Helper per la pianificazione con AI."""
import json
import re
from datetime import date, datetime
from fastapi import APIRouter
from loguru import logger

from app.core.ollama_client import ollama
from app.schemas.chat import SuggestExamRequest, SuggestExamResponse

router = APIRouter()

_IT_WEEKDAYS = [
    "lunedì", "martedì", "mercoledì", "giovedì",
    "venerdì", "sabato", "domenica",
]
_IT_MONTHS = [
    "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
    "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
]


def _format_italian_date(value) -> str:
    """Converte un valore simile a una data in italiano, esempio lunedi 11 maggio 2026.
    Restituisce la stringa originale in caso di errore."""
    if isinstance(value, datetime):
        d = value.date()
    elif isinstance(value, date):
        d = value
    elif isinstance(value, str):
        try:
            # Handles "2026-05-11", "2026-05-11T22:00:00.000Z", etc.
            d = datetime.fromisoformat(value.replace("Z", "+00:00")).date()
        except ValueError:
            return value
    else:
        return str(value)
    return f"{_IT_WEEKDAYS[d.weekday()]} {d.day} {_IT_MONTHS[d.month - 1]} {d.year}"


def _heuristic_score(day: dict, all_days: list) -> float:
    """Euristica che valuta un giorno relativamente agli altri della settimana.
    - Punteggio base normalizzato sul carico min/max della settimana (1.0-5.0).
    - Bonus per giorno della settimana: mercoledì (+0.2), martedì/giovedì (+0.1).
    """
    own_load = (day.get("homework", 0) * 0.5
                + day.get("exams", 0) * 1.5
                + day.get("interrogations", 0) * 1.0)

    # Normalizzazione sul carico della settimana
    loads = [
        d.get("homework", 0) * 0.5 + d.get("exams", 0) * 1.5 + d.get("interrogations", 0) * 1.0
        for d in all_days
    ]
    max_load = max(loads) if loads else 0
    min_load = min(loads) if loads else 0
    range_load = max_load - min_load

    if range_load > 0:
        # 1.0 = giorno peggiore, 5.0 = giorno migliore della settimana
        base_score = 1.0 + 4.0 * (max_load - own_load) / range_load
    else:
        # Tutti uguali: punteggio assoluto (ma senza mai essere perfetto)
        base_score = max(0.0, 5.0 - own_load)

    # Bonus per giorno della settimana (mercoledì ideale per verifiche)
    try:
        d = datetime.fromisoformat(str(day.get("day", ""))).date()
        dow = d.weekday()  # 0=lun, 2=mer, 4=ven
        dow_bonus = {0: 0, 1: 0.1, 2: 0.2, 3: 0.1, 4: 0}.get(dow, 0)
        base_score += dow_bonus
    except (ValueError, TypeError):
        pass

    return round(max(0.0, base_score), 1)


def _is_valid_school_day(day_str: str) -> bool:
    try:
        d = datetime.fromisoformat(day_str).date()
    except ValueError:
        return False
    # Esclude date già passate
    if d < date.today():
        return False
    # Esclude sabati e domeniche (settimana corta)
    if d.weekday() >= 5:
        return False
    return True


@router.post("/exam-day", response_model=SuggestExamResponse)
async def suggest_exam_day(req: SuggestExamRequest):
    workload = [d.model_dump() for d in req.workload]
    # Difesa in profondità: scarta giorni non validi
    workload = [d for d in workload if _is_valid_school_day(str(d.get("day", "")))]
    ranking = sorted(
        ({"day": str(d["day"]), "score": _heuristic_score(d, workload), **d} for d in workload),
        key=lambda x: x["score"], reverse=True,
    )
    best = ranking[0] if ranking else {"day": "", "score": 0.0}

    # Motivazione breve opzionale con LLM
    reasoning = "Giorno con il minor carico previsto (meno verifiche, interrogazioni e compiti da consegnare)."
    best_label = _format_italian_date(best["day"])
    # Build a workload summary with Italian human-readable dates for the LLM
    workload_for_llm = [
        {
            "giorno": _format_italian_date(d.get("day")),
            "compiti": d.get("homework", 0),
            "verifiche": d.get("exams", 0),
            "interrogazioni": d.get("interrogations", 0),
        }
        for d in workload
    ]
    try:
        prompt = (
            "Il giorno migliore in cui programmare una nuova verifica è già stato "
            f"scelto in modo deterministico: **{best_label}**.\n"
            "Il tuo compito è SOLO spiegare brevemente PERCHÉ proprio quel giorno "
            "è la scelta migliore, basandoti sui dati di carico scolastico qui sotto.\n\n"
            "Regole assolute:\n"
            "- NON proporre un giorno diverso da quello scelto.\n"
            "- NON usare timestamp ISO o numeri: riferisciti al giorno SOLO come "
            f"'{best_label}'.\n"
            "- Rispondi in ITALIANO con UN SOLO paragrafo breve (max 50 parole).\n\n"
            f"Giorno scelto: {best_label}\n"
            f"Carico scolastico dei prossimi giorni (in italiano):\n"
            f"{json.dumps(workload_for_llm, ensure_ascii=False)}"
        )
        out = await ollama.chat(
            [{"role": "user", "content": prompt}],
            options={"temperature": 0.1},
        )
        candidate = re.split(r"\n\n", out.strip(), maxsplit=1)[0][:400].strip()

        # Valida che il modello menzioni il giorno scelto e NON menzioni
        # altri giorni dal carico. Altrimenti usa la risposta deterministica.
        other_days = [
            _format_italian_date(d.get("day")).lower()
            for d in workload
            if _format_italian_date(d.get("day")) != best_label
        ]
        low = candidate.lower()
        mentions_chosen = best_label.lower() in low
        mentions_other = any(od in low for od in other_days if od)
        # Rifiuta anche se il modello ha rivelato un timestamp in stile ISO
        has_iso_leak = bool(re.search(r"\d{4}-\d{2}-\d{2}", candidate))

        if candidate and mentions_chosen and not mentions_other and not has_iso_leak:
            reasoning = candidate
        else:
            logger.info(
                "LLM rationale rejected (chosen={}, other={}, iso={}). Using fallback.",
                mentions_chosen, mentions_other, has_iso_leak,
            )
            reasoning = (
                f"{best_label.capitalize()} è il giorno con il minor carico "
                f"({best.get('homework', 0)} compiti, {best.get('exams', 0)} verifiche, "
                f"{best.get('interrogations', 0)} interrogazioni), quindi è la scelta "
                "migliore per programmare una nuova verifica senza sovraccaricare gli studenti."
            )
    except Exception as exc:
        logger.warning(f"LLM rationale unavailable: {exc}")

    return SuggestExamResponse(
        best_day=best["day"],
        score=float(best["score"]),
        reasoning=reasoning,
        ranking=ranking,
    )
