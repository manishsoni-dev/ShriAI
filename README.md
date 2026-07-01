# Shri AI

Initial foundation for a production-grade AI assistant web app built with Next.js, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

## Overview

Shri AI is a full-stack AI assistant foundation with authentication, workspace-aware conversations, provider-isolated model access, usage logging, and a knowledge-base ingestion flow for document search.

## Product Truthfulness Status

The repository contains real implementation work, but local release evidence is
not the same as production readiness.

| Status             | Current state                                                                                                                                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Implemented        | Auth-protected routes, workspace conversations, local Ollama chat gateway, usage logging, document upload/extraction/chunking/embeddings/search, scripture retrieval/citation validation, voice routing, reviewer tooling, and the centered cosmic system with nine celestial bodies. |
| Verified           | Local `format:check`, `lint`, `typecheck`, `test`, `build`, and whitespace checks are evidence only when they are recorded for the current branch in `docs/research/SHRI_AI_DECISION_LOG.md`. They are not end-to-end release proof.                                                  |
| Staged             | Auth is hybrid: legacy Auth.js remains active while Supabase cutover is staged. Pinecone, Resend, Inngest, PostHog, and Sentry are prepared provider boundaries, not active product integrations. Voice-safe scripture review gates and manual staging release checks remain staged.  |
| Unverified         | End-to-end release proof for sign-in → chat → scripture retrieval → citation validation → saved conversation → local-AI unavailable state → failed document ingestion → voice permission denial/fallback has not been recorded in this branch.                                        |
| Local-only         | Ollama, faster-whisper STT, local Postgres/pgvector, release evaluation, and manual Voice QA evidence.                                                                                                                                                                                |
| Provider boundary  | Pinecone, Resend, Inngest, PostHog, and Sentry configuration and documentation boundaries exist, but they are not active product integrations unless activated in runtime code and verified by a scoped phase.                                                                        |
| Active integration | The active runtime paths in this branch are the local-first application paths described above, including Auth.js fallback, local Ollama, local storage, Postgres/pgvector, and same-origin app routes.                                                                                |
| Production-ready   | No production rollout is claimed by this README. Hosted CI/build success and local release verification must both be current before production language is used.                                                                                                                      |

## Features

- Email/password authentication with protected routes
- Workspace-backed users and conversations
- Native local Ollama provider gateway with configurable models
- Usage metadata capture for assistant responses
- Document upload, text extraction, chunking, embeddings, and semantic search
- Voice-first chat with browser mic recording, local transcription, browser speech, and typed fallback
- User-controlled looping OM ambience with persisted volume
- Prisma/PostgreSQL persistence with migration-based setup

## Stack

- Next.js App Router
- TypeScript strict mode
- Tailwind CSS
- ESLint and Prettier
- Prisma ORM
- PostgreSQL

## Runtime Requirements

- Node.js `22.13.0` or newer.
- npm `10.0.0` or newer.
- Use `npm ci` for reproducible dependency installation from `package-lock.json`.
- `.npmrc` enables `engine-strict=true`, so unsupported Node/npm versions fail early.

## Local Setup

1. Install dependencies:

```bash
npm ci
```

2. Create an environment file:

```bash
cp .env.example .env
```

3. Generate an Auth.js secret and set `AUTH_SECRET` in `.env`:

```bash
openssl rand -base64 32
```

Real `.env` files are local-only and ignored by Git. If a local environment
file or repository archive was ever shared, follow
[`docs/security/LOCAL_SECRET_ROTATION.md`](docs/security/LOCAL_SECRET_ROTATION.md)
and run `npm run secrets:check` before sharing the repository.

Release verification that depends on local Ollama, local STT, reviewed corpus
state, and real Voice QA evidence must be run on a trusted local machine with
`npm run release:verify:local`; see
[`docs/release/LOCAL_RELEASE_VERIFICATION.md`](docs/release/LOCAL_RELEASE_VERIFICATION.md).

Safe source archives must be created only from clean committed trees with
`npm run source:archive`; the archive verifier rejects environment files,
runtime outputs, databases, logs, uploads, `.git`, `node_modules`, and `.next`.

4. Configure Postgres using the [Database Setup](#database-setup) section.

5. Install Ollama and pull the local models:

```bash
ollama pull qwen3:8b
ollama pull qwen3-embedding:0.6b
```

6. Generate the Prisma client and apply migrations:

```bash
npm run prisma:generate
npm run db:check
npm run prisma:migrate
```

7. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database Setup

This project uses Prisma migrations as the source of truth. Do not use
`prisma db push` as the normal setup path because committed migrations already
exist. `npm run prisma:push` is available only as a temporary local development
fallback for throwaway databases.

The current migration history includes `DocumentChunk.embedding` and
`ScriptureChunk.embedding` as `vector(1024)`
column, so the target Postgres database must support the `pgvector` extension.

### Option A: Docker Compose

The included Compose file uses a Postgres 16 image with pgvector installed:

```bash
docker compose up -d postgres
```

This creates a local `shri_ai` database that matches the default
`DATABASE_URL` in `.env.example`.

### Option B: local Postgres installed

Install and start Postgres with your preferred local package manager. On macOS
with Homebrew, one common path is:

```bash
brew install postgresql@16 pgvector
brew services start postgresql@16
createdb shri_ai
```

Enable pgvector if your package manager does not make it available
automatically. The migration will run `CREATE EXTENSION IF NOT EXISTS vector`,
but your database user must have permission and the extension must be installed
on the server.

Set `DATABASE_URL` in `.env.local` or `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shri_ai?schema=public"
```

Adjust the username, password, host, and port for your local Postgres install.

### Option C: remote Postgres URL

Use any remote Postgres provider that supports Prisma and pgvector. Set
`DATABASE_URL` to the provider connection string:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
```

If your provider uses a pooler URL for runtime connections, use a direct
migration-capable URL while running `npm run prisma:migrate`.

### Apply migrations

After `DATABASE_URL` is set, verify the database and apply the committed
migrations:

```bash
npm run prisma:generate
npm run db:check
npm run prisma:migrate
npm run db:ready
npm run db:check
```

The waitlist/contact table is created by:

```text
prisma/migrations/20260611192000_add_waitlist_leads/migration.sql
```

To inspect the database in Prisma Studio:

```bash
npm run prisma:studio
```

Confirm these tables load in Studio for each database target: `WaitlistLead`,
`Conversation`, `Message`, `DocumentChunk`, `ScriptureSource`,
`ScriptureChunk`, `RetrievalLog`, `AnswerCitation`, and
`ObservabilityEvent`.

Exact terminal commands for a healthy local database are:

```bash
cp .env.example .env.local
# edit .env.local and set DATABASE_URL and AUTH_SECRET
ollama pull qwen3:8b
ollama pull qwen3-embedding:0.6b
npm ci
npm run prisma:generate
npm run db:check
npm run prisma:migrate
npm run db:ready
npm run typecheck
```

For managed Postgres, use a direct migration-capable connection string and run:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public" npm run prisma:migrate:deploy
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public" npm run db:ready
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public" npm run prisma:studio
```

## Voice Setup

The `/chat` route is voice-first, but typed text remains available as a fallback.
Voice input and output use authenticated server routes. No AI service URL or
model endpoint is exposed to browser code.

Speech-to-text uses the repository-owned faster-whisper service. Generate one
private token and use the same value for Next.js and Docker:

```bash
export STT_SERVICE_TOKEN="$(openssl rand -hex 32)"
docker compose up --build voice
```

The container binds `127.0.0.1:8001`, stores downloaded model files in the
`voice-models` volume, and accepts only authenticated backend requests. The
backend validates stored microphone consent before forwarding an upload. The
service independently enforces supported media, a 10 MB size limit, and a
90-second decoded-duration limit. See `services/voice/README.md` for native
Python and model configuration commands.

Voice output uses only the browser's installed `SpeechSynthesis` voices with
persona rate/pitch guidance. If browser speech is unavailable or errors, the
generated text remains visible. There are no server TTS, ElevenLabs, Deepgram,
Google STT, OpenAI speech, or other hosted voice-provider runtime paths.

Voice observability is trace based. Speech-to-text returns a `voiceTraceId`,
chat forwards that trace through scripture retrieval, and browser speech keeps
the same turn boundary. Trace events are stored in `ObservabilityEvent` with
event types `stt`, `retrieval`, and `chat`.

## OM Audio Setup

Shri AI generates the ambient OM tone with the browser Web Audio API, so there
is no runtime audio download and no bundled chanting file to manage. Browsers
block audio before user interaction, so the bottom-right control waits for a
click/tap/key gesture, stores enabled and volume preferences in `localStorage`,
and moves between `Paused`, `Ready`, and playing `OM` states. The vertical
slider is capped for gentle ambient volume, and browsers without Web Audio mark
the control unavailable instead of crashing.

## Scripts

- `npm run dev` starts the Next.js development server.
- `npm run build` creates a production build.
- `npm run lint` runs ESLint.
- `npm run typecheck` runs TypeScript without emitting files.
- `npm run db:check` verifies `DATABASE_URL`, generated Prisma Client, and database connectivity.
- `npm run db:ready` verifies pgvector plus required app/RAG/observability tables.
- `npm run prisma:generate` generates Prisma Client from `prisma/schema.prisma`.
- `npm run prisma:migrate` applies Prisma migrations locally.
- `npm run prisma:migrate:deploy` applies committed migrations to managed or production-like databases.
- `npm run prisma:push` pushes the schema without migrations for throwaway development databases only.
- `npm run prisma:studio` opens Prisma Studio.
- `npm run scripture:build-corpus` regenerates the 300-record public-domain Bhagavad Gita v1 corpus from Wikisource.
- `npm run scripture:validate` validates verse-aware corpus shape, the authoritative source manifest, rights eligibility, and duplicate references.
- `npm run scripture:ingest` idempotently upserts Bhagavad Gita records into Postgres.
- `npm run scripture:embed` embeds missing Bhagavad Gita records and skips already embedded chunks.
- `npm run scripture:prepare-reviews` idempotently creates missing pending review rows without resetting completed reviews.
- `npm run scripture:eval` runs the canonical evidence-v2 evaluation with 50 grounded cases plus adversarial abstention, injection, and crisis cases.
- `npm run release:check` verifies DB, migration, provenance, review, retrieval, fresh canonical evaluation, environment, and Voice QA readiness gates.
- `npm run release:verify:local` runs local-only release verification requiring
  Postgres, reviewed scripture data, local Ollama, local STT, canonical
  retrieval eval, and real manual Voice QA evidence.
- `npm run secrets:check` verifies that tracked source does not include real
  environment files or known secret patterns.
- `npm run source:archive` creates a verified tracked-source archive from a
  clean commit only.
- `npm run format` formats files with Prettier.
- `npm run format:check` verifies formatting without changing files.

## Clean Clone Verification

From a fresh checkout, use the lockfile and migration-based setup path:

```bash
npm ci
npm run prisma:generate
npx prisma validate
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run db:ready
```

The build uses deterministic system font fallbacks in `src/app/globals.css`
instead of the Next.js Google-font module, so CI and local production builds do
not depend on remote Google Font downloads. `db:ready` requires a configured
PostgreSQL database with `pgvector` and the committed migrations applied.

## Continuous Integration

GitHub Actions is configured in `.github/workflows/ci.yml` to run the clean
clone checks against a disposable `pgvector/pgvector:pg16` Postgres service:

```text
npm ci -> prisma:generate -> prisma validate -> prisma migrate deploy ->
secrets:check -> format:check -> lint -> typecheck -> test -> build -> db:ready
```

CI uses placeholder non-secret values only where build-time validation requires
environment variables. Unit tests mock localhost services, so CI does not need
Ollama, Whisper, or API keys. Hosted CI intentionally does not run
`scripture:eval` or `release:check`; those are covered by
`npm run release:verify:local` on a trusted machine with local model services
and real manual Voice QA evidence.

## Scripture RAG

The v1 Bhagavad Gita corpus lives at:

```text
data/scriptures/bhagavad-gita/bhagavad-gita-besant-v1.json
```

`data/scriptures/source-manifest.json` is the authority for edition,
translator, language, rights, license, attribution, source URL, and ingestion
date. Corpus JSON cannot make an unmanifested or restricted source eligible.
Every persisted chunk stores explicit chapter and inclusive verse boundaries.

Production text retrieval is hybrid PostgreSQL full-text plus local Ollama
vector search and returns only active, legally eligible chunks with an approved
review. Voice mode additionally requires `approvedForVoice=true`. When no
approved passage meets the configured answer confidence threshold, generation
abstains; limited evidence is labeled uncertain. Generated citations are
validated against the exact retrieved chunk set before answer text is emitted.

It is generated from the 1922 Annie Besant Wikisource edition, using
Wikisource as the public-domain source text reference. SanskritDocuments is not
used because its site restricts copying/reposting for promotion or commercial
use.

Recommended local sequence:

```bash
npm run scripture:build-corpus
npm run scripture:validate
npm run scripture:ingest
npm run scripture:embed
npm run scripture:eval
```

Do not describe scripture retrieval as reliable unless `npm run scripture:eval`
passes against `data/evals/scripture-retrieval/evidence-v2.json`. Release also
requires a passing artifact from that exact dataset and experiment config,
with a matching SHA-256 fingerprint, at least 30 cases, and an age under seven
days.

## Human Scripture Review

Automated retrieval metrics do not replace human theological review. The
Bhagavad Gita corpus includes public-domain translation text plus
project-authored commentary and practical notes; each chunk must be reviewed
before it can be spoken in production guidance.

Reviewer access is controlled server-side with comma-separated allowlists:

```env
REVIEWER_EMAILS="reviewer@example.com"
ADMIN_EMAILS="admin@example.com"
```

Only those users can access `/admin/scripture-reviews`, view full review
details or audit history, and mutate review decisions. Hidden buttons or client
state are not trusted for authorization.

Prepare review rows with:

```bash
npm run scripture:prepare-reviews
```

The command is idempotent: first runs create pending rows, repeated runs do not
duplicate rows, and existing approved/rejected/needs-changes decisions are not
reset. Chunks from inactive sources remain available for audit/review but are
excluded from voice retrieval and release gates.

Review statuses:

- `pending`: not yet reviewed.
- `in_review`: reserved for a reviewer actively examining the chunk.
- `approved`: reviewed for text use; voice use also requires `approvedForVoice=true`.
- `rejected`: not acceptable; a rejection reason is required.
- `needs_changes`: correction is required; actionable reviewer notes are required.

Voice approval requires an accuracy score and reviewer notes. Rejection and
needs-changes decisions always clear `approvedForVoice`. The reviewer console
uses optimistic concurrency with `updatedAt`; if two reviewers edit the same row,
the stale submission is rejected and the reviewer must reload before
resubmitting. Every decision writes a `ScriptureChunkReviewAudit` record with
old state, new state, reviewer identity, notes, and timestamp.

Policy for this staged release: text-mode scripture retrieval preserves current
behavior, but voice-mode retrieval uses only chunks whose review is approved,
`approvedForVoice=true`, source is active, and copyright status is
`public_domain`, `public-domain`, or `licensed`. If there is not enough reviewed
voice context, Shri AI must not fabricate a scriptural answer and returns:

```text
This topic has not yet been fully reviewed for spoken guidance. I can offer a general reflection or you may try another question.
```

Translation and commentary reflect a specific translation or interpretive
tradition. Reviewer notes should record material interpretive concerns, source
concerns, and any scope limits for use in spoken guidance.

Review coverage is computed server-side in the reviewer console and includes
total chunks, statuses, approved-for-text, approved-for-voice, reviewed
percentage, voice-approved percentage, and counts by chapter, source, and
persona.

## Release Readiness

Run:

```bash
npm run release:check
```

The command exits non-zero if any required gate fails. It verifies database
reachability, required migrations and tables, corpus and review rows, the latest
retrieval eval artifact, voice retrieval gating, voice-approved coverage,
completed Voice QA for the target environment, and required environment
configuration without printing secrets.

Configurable staged-release thresholds:

```env
RELEASE_ENVIRONMENT="staging"
RELEASE_MIN_VOICE_APPROVED_CHUNKS="1"
RELEASE_MIN_VOICE_APPROVED_PERCENT="1"
RELEASE_REQUIRE_COMPLETED_VOICE_QA="true"
```

For the first staged release, set the minimum chunk/percentage thresholds to the
reviewed subset size. Do not lower the gates to bypass missing human review.
With zero voice-approved chunks, `release:check` is expected to fail.

Managed staging sequence:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public" npm run prisma:migrate:deploy
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public" npm run db:ready
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public" npm run scripture:prepare-reviews
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public" npm run scripture:eval
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public" npm run release:check
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public" npm run voice:qa:create -- --label="staging voice QA"
```

Do not claim managed staging verification unless these commands were actually
run against the managed database.

- `npm run scripture:ingest` ingests scripture data (e.g., Bhagavad Gita) into the database.
- `npm run scripture:embed` generates embeddings for the ingested scriptures.
- `npm run rag:evaluate` evaluates the performance of the RAG retrieval pipeline against test queries.

## Routes

- `/` landing page.
- `/sign-in` email/password sign-in plus explicit registration.
- `/dashboard` protected user workspace route. Unauthenticated users are redirected to `/sign-in`.

## Authentication

Auth.js is configured in `src/auth.ts`. Supporting user and workspace creation lives under `src/lib/auth` and `src/lib/workspaces.ts` so route components do not own authentication details.

The local credentials flow distinguishes sign-in from registration. Sign-in
verifies an existing user with `bcryptjs`; registration explicitly creates a
new `User` and then signs the user in. Every authenticated user receives an
owner role only on their own default workspace. Reviewer and administrator
access is not granted by registration and remains controlled by
`REVIEWER_EMAILS` and `ADMIN_EMAILS`.

## Conversations

Persistent conversation and message access lives in `src/lib/conversations.ts`.

The exported helpers create, list, read, and delete conversations, plus create
and list messages. Conversations are private to their creator. Workspace
membership is required to create and list conversations in a workspace, but
detail reads, message reads, message creation, and deletion enforce
`Conversation.userId === authenticated user.id`; workspace peers cannot access
each other's conversations.

## AI Gateway

Model access is isolated in `src/lib/ai`. UI components should never call provider SDKs directly.

- `src/lib/ai/types.ts` defines the provider interface.
- `src/lib/ai/ollama-provider.ts` uses native server-side HTTP requests to
  Ollama `/api/chat` and `/api/embed`.
- `src/lib/ai/config.ts` centralizes model names from environment variables.
- `src/lib/ai/errors.ts` exposes typed, readable errors.
- `src/lib/ai/README.md` explains how to add another provider.

The chat server action calls the gateway and persists assistant responses with
provider, model, request, and usage metadata. The default local configuration
is:

```env
OLLAMA_BASE_URL="http://127.0.0.1:11434"
SHRI_AI_CHAT_MODEL="qwen3:8b"
SHRI_AI_EMBEDDING_MODEL="qwen3-embedding:0.6b"
SHRI_AI_EMBEDDING_DIMENSIONS="1024"
```

All model and speech base URLs are server-only and restricted to loopback
hosts. No hosted AI provider or API key is used.

## Managed Services Boundary

P0.2 defines optional configuration boundaries for future Supabase, Pinecone,
PostHog, Sentry, Resend, and Inngest work. These services are not active
product paths yet. Missing optional provider configuration is reported as an
explicit `*_NOT_CONFIGURED` state rather than a crash.

Server-only values such as `SUPABASE_SECRET_KEY`, `PINECONE_API_KEY`,
`RESEND_API_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`,
`SENTRY_AUTH_TOKEN`, and `DATABASE_URL` must never be imported into browser
code. Pinecone, when enabled in a future phase, is a derived index only; the
authoritative document state remains in Postgres. See
[`docs/architecture/MANAGED_SERVICES_BOUNDARY.md`](docs/architecture/MANAGED_SERVICES_BOUNDARY.md).

## Knowledge Base

Document upload lives at `/knowledge`. Metadata is stored in the `Document` table and development files are written under `storage/documents`.

Supported upload types are PDF, TXT, Markdown, and DOCX. Storage is isolated behind `src/lib/storage`, where `StorageAdapter` can be implemented for S3, R2, or another object store later without changing the route UI.

Uploaded documents are ingested synchronously for now:

- Text is extracted from TXT, Markdown, PDF, and DOCX files.
- Text is split into overlapping chunks in `src/lib/ingestion/chunking.ts`.
- Chunks are embedded through the AI gateway and stored in Postgres with pgvector.
- Document status moves through `uploaded`, `processing`, `ready`, or `failed`.

Semantic search is available at `/knowledge/search`. It embeds the query, compares it against workspace-scoped chunks, and returns the top matching chunks with document name and score.

## Status

Professional foundation project prepared for local development and portfolio
demonstration. Production readiness is unverified until the release path in
`docs/release/LOCAL_RELEASE_VERIFICATION.md` has current evidence for local AI,
retrieval quality, citation validation, unavailable-runtime behavior, and
optional voice fallback.
