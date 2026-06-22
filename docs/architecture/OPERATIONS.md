# Shri AI Operations and Reliability

## Operational Controls

1. **Local AI boundaries**: Ollama and faster-whisper URLs are
   validated as loopback addresses. Browser code calls only authenticated Shri
   AI routes and never receives model-service URLs or tokens.
2. **Voice consent**: `/api/voice/transcribe` loads the authenticated database
   user and rejects missing stored microphone-processing consent before rate
   limiting or parsing uploads.
3. **Bounded audio**: Next.js and the faster-whisper service enforce a 10 MB
   upload limit. The service uses FFprobe to reject recordings over 90 decoded
   seconds before inference.
4. **Timeouts and retries**: STT has a 100-second backend abort bound around the
   service's 90-second inference limit. Timeouts and client validation failures
   are never retried; transient connection/service failures get one retry.
5. **Rate limits**: STT is limited to 20 requests per user and 60 per normalized
   IP per minute. The user limiter remains authoritative if IP headers are
   missing or spoofed. Typed input remains available during every voice failure.
6. **Speech output**: Browser SpeechSynthesis is the only speech-output path and
   receives only the server-approved answer after server-side voice eligibility.
7. **Observability**: Voice traces store status, latency, byte count, duration,
   language, and lengths. Raw audio and full transcripts are not added to
   observability payloads.

## Service Checks

```bash
curl http://127.0.0.1:8001/health
docker compose ps voice
npm run typecheck
```

The first faster-whisper transcription may download the configured model.
Subsequent inference is local from the `voice-models` Docker volume.

## Incident Procedure

1. Keep typed input enabled and disable voice output in the chat UI if needed.
2. Check `docker compose ps voice` and the `/health` endpoint.
3. Inspect `ObservabilityEvent` records by `traceId`; do not copy raw user audio
   or full transcripts into incident notes.
4. Restart only the affected local service. Do not add a hosted provider as an
   emergency fallback.
5. Record the incident and invalidate any Voice QA run affected by the outage.
