# Project Inventory

## Core Domains

- **Authentication**: `src/lib/auth/`, NextAuth implementation, session management.
- **Database & Schema**: `prisma/schema.prisma`, `src/lib/db.ts`, Prisma Client.
- **RAG & Scripture Retrieval**: `src/lib/rag/`, `scripts/`, vector embeddings, text chunking, and PostgreSQL pgvector integration.
- **Voice**: `src/app/api/voice/transcribe/`, `src/lib/voice/`, and client-safe browser hints in `src/lib/voiceProfiles.ts`.
- **AI Chat Generation**: `src/app/api/chat/`, `src/lib/ai/`, local Ollama streaming.
- **User Interface**: `src/app/`, Next.js App Router UI, components, and personas logic.
- **Admin & Review Workflow**: `src/app/admin/`, `src/lib/scripture-review/`.
