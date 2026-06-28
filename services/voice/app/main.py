from __future__ import annotations

import asyncio
import hmac
import os
import subprocess
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional, Protocol

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel


ALLOWED_MIME_TYPES = {
    "audio/flac": ".flac",
    "audio/m4a": ".m4a",
    "audio/mp4": ".mp4",
    "audio/mpeg": ".mp3",
    "audio/mpga": ".mp3",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/webm": ".webm",
    "audio/x-m4a": ".m4a",
    "audio/x-wav": ".wav",
}


@dataclass(frozen=True)
class Settings:
    token: str
    model: str = "small"
    device: str = "cpu"
    compute_type: str = "int8"
    max_audio_bytes: int = 10 * 1024 * 1024
    max_audio_seconds: float = 90.0
    inference_timeout_seconds: float = 90.0

    @classmethod
    def from_env(cls) -> "Settings":
        token = os.environ.get("STT_SERVICE_TOKEN", "")
        if len(token) < 32:
            raise RuntimeError(
                "STT_SERVICE_TOKEN must contain at least 32 characters."
            )
        return cls(
            token=token,
            model=os.environ.get("STT_MODEL", "small"),
            device=os.environ.get("WHISPER_DEVICE", "cpu"),
            compute_type=os.environ.get("WHISPER_COMPUTE_TYPE", "int8"),
            max_audio_bytes=int(
                os.environ.get("VOICE_MAX_AUDIO_BYTES", str(10 * 1024 * 1024))
            ),
            max_audio_seconds=float(
                os.environ.get("VOICE_MAX_AUDIO_SECONDS", "90")
            ),
            inference_timeout_seconds=float(
                os.environ.get("VOICE_INFERENCE_TIMEOUT_SECONDS", "90")
            ),
        )


class Segment(BaseModel):
    start: float
    end: float
    text: str


class Transcript(BaseModel):
    text: str
    language: str
    duration_seconds: float
    inference_ms: int
    segments: list[Segment]


class TranscriptionResult(BaseModel):
    text: str
    language: str
    segments: list[Segment]


class Transcriber(Protocol):
    def transcribe(self, path: str, language: str | None) -> TranscriptionResult: ...


class FasterWhisperTranscriber:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._model = None

    def _get_model(self):
        if self._model is None:
            from faster_whisper import WhisperModel

            self._model = WhisperModel(
                self.settings.model,
                device=self.settings.device,
                compute_type=self.settings.compute_type,
            )
        return self._model

    def transcribe(self, path: str, language: str | None) -> TranscriptionResult:
        segments, info = self._get_model().transcribe(
            path,
            language=language,
            beam_size=5,
            vad_filter=True,
        )
        structured_segments = [
            Segment(start=item.start, end=item.end, text=item.text.strip())
            for item in segments
            if item.text.strip()
        ]
        return TranscriptionResult(
            text=" ".join(item.text for item in structured_segments).strip(),
            language=info.language,
            segments=structured_segments,
        )


def probe_duration(path: str) -> float:
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                path,
            ],
            check=True,
            capture_output=True,
            text=True,
            timeout=10,
        )
        duration = float(result.stdout.strip())
    except (FileNotFoundError, ValueError, subprocess.SubprocessError) as error:
        raise ValueError("Audio could not be decoded.") from error
    if duration <= 0:
        raise ValueError("Audio duration must be positive.")
    return duration


def api_error(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status, detail={"code": code, "message": message})


def create_app(
    *,
    settings: Settings | None = None,
    transcriber: Transcriber | None = None,
    duration_probe: Callable[[str], float] = probe_duration,
) -> FastAPI:
    resolved_settings = settings or Settings.from_env()
    resolved_transcriber = transcriber or FasterWhisperTranscriber(resolved_settings)
    app = FastAPI(title="Shri AI Local Voice", version="1.0.0")

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "model": resolved_settings.model}

    @app.post("/v1/transcriptions", response_model=Transcript)
    async def transcriptions(
        file: UploadFile = File(...),
        language: str = "auto",
        authorization: Optional[str] = Header(default=None),
    ) -> Transcript:
        expected = f"Bearer {resolved_settings.token}"
        if not authorization or not hmac.compare_digest(authorization, expected):
            raise api_error(401, "UNAUTHORIZED", "A valid service token is required.")

        mime_type = (file.content_type or "").split(";", 1)[0].strip().lower()
        suffix = ALLOWED_MIME_TYPES.get(mime_type)
        if not suffix:
            raise api_error(
                415,
                "UNSUPPORTED_MEDIA",
                "Supported audio types are webm, ogg, mp4, mpeg, wav, m4a, and flac.",
            )

        temp_path: str | None = None
        total_bytes = 0
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                temp_path = temp_file.name
                while chunk := await file.read(64 * 1024):
                    total_bytes += len(chunk)
                    if total_bytes > resolved_settings.max_audio_bytes:
                        raise api_error(
                            413,
                            "AUDIO_TOO_LARGE",
                            f"Audio must be at most {resolved_settings.max_audio_bytes} bytes.",
                        )
                    temp_file.write(chunk)

            if total_bytes == 0:
                raise api_error(400, "EMPTY_AUDIO", "The audio upload is empty.")

            try:
                duration = await run_in_threadpool(duration_probe, temp_path)
            except ValueError as error:
                raise api_error(415, "INVALID_AUDIO", str(error)) from error
            if duration > resolved_settings.max_audio_seconds:
                raise api_error(
                    413,
                    "AUDIO_TOO_LONG",
                    f"Audio must be at most {resolved_settings.max_audio_seconds:g} seconds.",
                )

            requested_language = language if language in {"en", "hi"} else None
            started_at = time.perf_counter()
            try:
                result = await asyncio.wait_for(
                    run_in_threadpool(
                        resolved_transcriber.transcribe,
                        temp_path,
                        requested_language,
                    ),
                    timeout=resolved_settings.inference_timeout_seconds,
                )
            except asyncio.TimeoutError as error:
                raise api_error(
                    504,
                    "TRANSCRIPTION_TIMEOUT",
                    "Local transcription exceeded its time limit.",
                ) from error
            except HTTPException:
                raise
            except Exception as error:
                raise api_error(
                    503,
                    "TRANSCRIPTION_UNAVAILABLE",
                    "The local transcription model is unavailable.",
                ) from error

            return Transcript(
                text=result.text,
                language=result.language,
                duration_seconds=duration,
                inference_ms=round((time.perf_counter() - started_at) * 1000),
                segments=result.segments,
            )
        finally:
            await file.close()
            if temp_path:
                Path(temp_path).unlink(missing_ok=True)

    return app


app = create_app()
