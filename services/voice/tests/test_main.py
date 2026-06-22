from __future__ import annotations

import os
import time

os.environ.setdefault(
    "STT_SERVICE_TOKEN",
    "test-token-with-at-least-thirty-two-characters",
)

from fastapi.testclient import TestClient

from app.main import Segment, Settings, TranscriptionResult, create_app


TOKEN = "test-token-with-at-least-thirty-two-characters"


class FakeTranscriber:
    def __init__(self) -> None:
        self.calls = 0

    def transcribe(self, path: str, language: str | None) -> TranscriptionResult:
        self.calls += 1
        return TranscriptionResult(
            text="steady action",
            language=language or "en",
            segments=[Segment(start=0, end=1.2, text="steady action")],
        )


def build_client(
    *, max_bytes: int = 1024, max_seconds: float = 90, timeout: float = 1
):
    transcriber = FakeTranscriber()
    app = create_app(
        settings=Settings(
            token=TOKEN,
            max_audio_bytes=max_bytes,
            max_audio_seconds=max_seconds,
            inference_timeout_seconds=timeout,
        ),
        transcriber=transcriber,
        duration_probe=lambda _path: 1.2,
    )
    return TestClient(app), transcriber


def auth_headers():
    return {"Authorization": f"Bearer {TOKEN}"}


def test_health_does_not_require_model_loading():
    client, transcriber = build_client()
    assert client.get("/health").json() == {"status": "ok", "model": "small"}
    assert transcriber.calls == 0


def test_requires_backend_service_token():
    client, transcriber = build_client()
    response = client.post(
        "/v1/transcriptions", files={"file": ("voice.webm", b"audio", "audio/webm")}
    )
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "UNAUTHORIZED"
    assert transcriber.calls == 0


def test_rejects_unsupported_and_empty_audio_before_inference():
    client, transcriber = build_client()
    unsupported = client.post(
        "/v1/transcriptions",
        headers=auth_headers(),
        files={"file": ("voice.txt", b"audio", "text/plain")},
    )
    empty = client.post(
        "/v1/transcriptions",
        headers=auth_headers(),
        files={"file": ("voice.webm", b"", "audio/webm")},
    )
    assert unsupported.status_code == 415
    assert unsupported.json()["detail"]["code"] == "UNSUPPORTED_MEDIA"
    assert empty.status_code == 400
    assert empty.json()["detail"]["code"] == "EMPTY_AUDIO"
    assert transcriber.calls == 0


def test_rejects_size_and_duration_before_inference():
    size_client, size_transcriber = build_client(max_bytes=4)
    oversized = size_client.post(
        "/v1/transcriptions",
        headers=auth_headers(),
        files={"file": ("voice.webm", b"12345", "audio/webm")},
    )
    assert oversized.status_code == 413
    assert oversized.json()["detail"]["code"] == "AUDIO_TOO_LARGE"
    assert size_transcriber.calls == 0

    duration_transcriber = FakeTranscriber()
    duration_app = create_app(
        settings=Settings(token=TOKEN, max_audio_seconds=2),
        transcriber=duration_transcriber,
        duration_probe=lambda _path: 2.1,
    )
    too_long = TestClient(duration_app).post(
        "/v1/transcriptions",
        headers=auth_headers(),
        files={"file": ("voice.webm", b"audio", "audio/webm")},
    )
    assert too_long.status_code == 413
    assert too_long.json()["detail"]["code"] == "AUDIO_TOO_LONG"
    assert duration_transcriber.calls == 0


def test_returns_structured_transcript():
    client, transcriber = build_client()
    response = client.post(
        "/v1/transcriptions?language=hi",
        headers=auth_headers(),
        files={"file": ("voice.webm", b"audio", "audio/webm")},
    )
    assert response.status_code == 200
    assert response.json() == {
        "text": "steady action",
        "language": "hi",
        "duration_seconds": 1.2,
        "inference_ms": response.json()["inference_ms"],
        "segments": [{"start": 0.0, "end": 1.2, "text": "steady action"}],
    }
    assert transcriber.calls == 1


def test_returns_structured_timeout():
    class SlowTranscriber(FakeTranscriber):
        def transcribe(self, path: str, language: str | None) -> TranscriptionResult:
            time.sleep(0.05)
            return super().transcribe(path, language)

    app = create_app(
        settings=Settings(token=TOKEN, inference_timeout_seconds=0.001),
        transcriber=SlowTranscriber(),
        duration_probe=lambda _path: 1,
    )
    response = TestClient(app).post(
        "/v1/transcriptions",
        headers=auth_headers(),
        files={"file": ("voice.webm", b"audio", "audio/webm")},
    )
    assert response.status_code == 504
    assert response.json()["detail"]["code"] == "TRANSCRIPTION_TIMEOUT"
