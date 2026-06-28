# Shri AI Local Voice Service

This private FastAPI service runs `faster-whisper` locally. Only the Shri AI
backend should call it. The host port is bound to loopback and every
transcription requires `STT_SERVICE_TOKEN`.

## Docker

From the repository root:

```bash
export STT_SERVICE_TOKEN="$(openssl rand -hex 32)"
docker compose up --build voice
curl http://127.0.0.1:8001/health
```

The first transcription downloads the configured Whisper model into the
`voice-models` Docker volume. After that, inference is local. Use
`STT_MODEL=small`, `WHISPER_DEVICE=cpu`, and
`WHISPER_COMPUTE_TYPE=int8` for the default CPU setup.

## Native Development

FFmpeg and Python 3.11 are required:

```bash
brew install ffmpeg
python3 -m venv services/voice/.venv
services/voice/.venv/bin/pip install -r services/voice/requirements-dev.txt
PYTHONPATH=services/voice services/voice/.venv/bin/pytest services/voice/tests
PYTHONPATH=services/voice STT_SERVICE_TOKEN="$(openssl rand -hex 32)" services/voice/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Audio is capped at 10 MB and 90 decoded seconds. Temporary uploads are deleted
after each request. Supported MIME types are WebM, Ogg, MP4/M4A, MPEG, WAV,
and FLAC.
