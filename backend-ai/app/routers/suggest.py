"""/suggest · AI-powered scheduling helpers."""
import json
import re
from fastapi import APIRouter
from loguru import logger

from app.core.ollama_client import ollama
from app.schemas.chat import SuggestExamRequest, SuggestExamResponse

router = APIRouter()


def _heuristic_score(day: dict) -> float:
    # Lower load = higher score
    load = (day.get("homework", 0) * 0.5
            + day.get("exams", 0) * 1.5
            + day.get("interrogations", 0) * 1.0)
    return max(0.0, 5.0 - load)


@router.post("/exam-day", response_model=SuggestExamResponse)
async def suggest_exam_day(req: SuggestExamRequest):
    workload = [d.model_dump() for d in req.workload]
    ranking = sorted(
        ({"day": str(d["day"]), "score": _heuristic_score(d), **d} for d in workload),
        key=lambda x: x["score"], reverse=True,
    )
    best = ranking[0] if ranking else {"day": "", "score": 0.0}

    # Optional LLM short rationale
    reasoning = "Day with the lowest expected workload (fewer exams, interrogations and homework due)."
    try:
        prompt = (
            "Given this weekly school workload (one entry per day), choose the best "
            "day to schedule a new exam to minimise student stress, and explain briefly. "
            "Reply with one short paragraph (max 60 words). Workload:\n"
            f"{json.dumps(workload, default=str)}"
        )
        out = await ollama.chat(
            [{"role": "user", "content": prompt}],
            options={"temperature": 0.2},
        )
        # take first paragraph if the model rambles
        reasoning = re.split(r"\n\n", out.strip(), maxsplit=1)[0][:400] or reasoning
    except Exception as exc:
        logger.warning(f"LLM rationale unavailable: {exc}")

    return SuggestExamResponse(
        best_day=best["day"],
        score=float(best["score"]),
        reasoning=reasoning,
        ranking=ranking,
    )
