"""Voice services · speech-to-text + text-to-speech."""
import io
import tempfile
from pathlib import Path

import speech_recognition as sr
from gtts import gTTS
from loguru import logger


def transcribe_audio(file_bytes: bytes, lang: str = "it-IT") -> str:
    """Convert raw audio bytes (wav/flac/aiff) to text using Google STT (offline-friendly fallback)."""
    recognizer = sr.Recognizer()

    # write to a temp file because speech_recognition expects a file path
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        with sr.AudioFile(tmp_path) as source:
            audio = recognizer.record(source)
        try:
            return recognizer.recognize_google(audio, language=lang)
        except sr.UnknownValueError:
            return ""
        except sr.RequestError as exc:
            logger.warning(f"Google STT unavailable, falling back to sphinx: {exc}")
            try:
                return recognizer.recognize_sphinx(audio, language=lang)  # type: ignore[arg-type]
            except Exception:
                return ""
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def synthesize_speech(text: str, lang: str = "it") -> bytes:
    """Generate MP3 audio for `text` using gTTS. Returns raw bytes."""
    if not text or not text.strip():
        raise ValueError("Empty text for TTS")
    tts = gTTS(text=text[:5000], lang=lang)
    buf = io.BytesIO()
    tts.write_to_fp(buf)
    return buf.getvalue()
