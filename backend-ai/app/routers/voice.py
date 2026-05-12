"""/voice · speech-to-text + text-to-speech."""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
import io

from app.schemas.chat import TTSRequest
from app.services import voice_service

router = APIRouter()


@router.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    lang: str = Form("it-IT"),
):
    if not file.content_type or not file.content_type.startswith("audio"):
        raise HTTPException(400, "Audio file required (audio/wav, audio/x-wav, audio/flac…)")
    data = await file.read()
    try:
        text = voice_service.transcribe_audio(data, lang=lang)
    except Exception as exc:
        raise HTTPException(500, f"Transcription failed: {exc}")
    return {"text": text, "lang": lang}


@router.post("/tts")
async def tts(req: TTSRequest):
    try:
        audio = voice_service.synthesize_speech(req.text, lang=req.lang)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    except Exception as exc:
        raise HTTPException(500, f"TTS failed: {exc}")
    return StreamingResponse(
        io.BytesIO(audio),
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline; filename=tts.mp3"},
    )
