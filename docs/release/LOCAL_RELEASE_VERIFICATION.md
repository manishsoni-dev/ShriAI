# Local Release Verification

Hosted CI runs only checks that are reproducible on a GitHub-hosted runner:
secret containment, dependency audit, Prisma generation and validation,
migrations, formatting, strict lint, typecheck, tests, build, DB readiness, and
scripture corpus validation.

Full release validation is local-only because it requires trusted local
services and human evidence:

```bash
npm run release:verify:local
```

## Prerequisites

- PostgreSQL with pgvector and all committed migrations applied.
- Local Ollama running at `OLLAMA_BASE_URL`.
- `SHRI_AI_CHAT_MODEL` and `SHRI_AI_EMBEDDING_MODEL` pulled into Ollama.
- Local faster-whisper STT running at `STT_BASE_URL` with matching
  `STT_SERVICE_TOKEN`.
- Scripture corpus ingested, reviewed, and voice-approved through the human
  review workflow.
- A current canonical retrieval evaluation that completes locally.
- A real manual Voice QA record for the target release environment.

## Voice QA Evidence

Code can preserve an honest QA record, but it cannot prove physical microphone
quality by itself. Release-countable Voice QA must be:

- `evidenceSource = manual`
- `status = passed`
- `completedAt` set
- `invalidatedAt = null`
- device and browser documented
- label or notes tied to the release environment

Helper-created fixture records are marked `automated_fixture` or `pending` and
must not satisfy release readiness.

## Microphone Browser Verification

Run this through the active Caddy proxy, not only `next dev`:

1. Open the app while unauthenticated and confirm `POST /api/voice/transcribe`
   returns `401`.
2. Sign in and load `/chat`.
3. Confirm no browser microphone prompt appears before deliberate user action.
4. Choose voice input only after stored microphone-processing consent is shown.
5. Confirm the browser prompt appears only after that deliberate voice action.
6. Deny permission and verify the UI shows a safe typed-input fallback state.
7. Allow permission and record a short utterance.
8. Confirm the browser calls only the same-origin Next.js STT route and the
   backend forwards only to the configured local STT service.
9. Confirm the Caddy response header is:

```text
Permissions-Policy: geolocation=(), camera=(), microphone=(self), payment=()
```

## Source Archives

Create source archives only from a clean commit:

```bash
npm run source:archive
```

The archive tool uses `git archive HEAD`, then verifies that the ZIP excludes
environment files, `.git`, dependencies, build output, virtual environments,
logs, local databases, uploads, reports, and eval output.

Verify an existing archive with:

```bash
npm run source:archive:verify -- path/to/archive.zip
```

## Dependency Audit Notes

High-severity audit findings must be removed when a safe non-breaking update is
available. If npm reports only a breaking downgrade or otherwise unsafe fix,
record the package path, exploit relevance, available fix, and reason for
remaining blocked in the release notes.
