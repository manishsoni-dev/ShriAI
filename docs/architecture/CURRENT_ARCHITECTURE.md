# Current Architecture

## Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (with `pgvector` extension)
- **ORM**: Prisma
- **Authentication**: NextAuth.js (Auth.js) v5
- **AI Gateway**: Local Ollama for chat and embeddings
- **Voice**: Backend-only local faster-whisper STT; browser SpeechSynthesis only for speech output

## High-Level Flow

1. User logs in via NextAuth.
2. User selects a persona (e.g., Shri Krishna) in the UI.
3. User interacts via text or microphone.
4. If voice, stored consent is verified and audio is proxied by the backend to
   the token-protected local faster-whisper service.
5. The query is embedded by the configured local Ollama embedding model.
6. Relevant scripture chunks are retrieved via hybrid vector + keyword search from PostgreSQL.
7. The scripture context, persona prompt, and user query are sent to local
   Ollama.
8. The response is streamed back to the UI.
9. If in voice mode and server-approved for speech, browser SpeechSynthesis is
   the sole MVP speech-output path; failure leaves the text response visible.

## Security Boundaries

- All user input is validated and sanitized.
- Server-side access checks using `auth()` ensure data boundaries.
- Scripture review workflow restricts voice synthesis to explicitly approved content.
- Local model-service URLs are loopback-only and the faster-whisper service
  requires a server-only bearer token.
