# Current Architecture

## Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (with `pgvector` extension)
- **ORM**: Prisma
- **Authentication**: NextAuth.js (Auth.js) v5
- **AI Gateway**: OpenAI API (for Chat and Embeddings)
- **Voice**: ElevenLabs, Deepgram (or configurable fallback)

## High-Level Flow

1. User logs in via NextAuth.
2. User selects a persona (e.g., Shri Krishna) in the UI.
3. User interacts via text or microphone.
4. If voice, audio is transcribed via STT API.
5. The query is embedded via OpenAI `text-embedding-3-small`.
6. Relevant scripture chunks are retrieved via hybrid vector + keyword search from PostgreSQL.
7. The scripture context, persona prompt, and user query are sent to the AI Chat model.
8. The response is streamed back to the UI.
9. If in voice mode, the text stream is piped into TTS for audio playback.

## Security Boundaries

- All user input is validated and sanitized.
- Server-side access checks using `auth()` ensure data boundaries.
- Scripture review workflow restricts voice synthesis to explicitly approved content.
