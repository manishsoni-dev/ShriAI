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

## Release Claim Boundaries

Use these labels consistently in README updates, release notes, demos, and
portfolio copy:

| Label              | Meaning                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Implemented        | Code path exists in the repository and is covered by local tests or build checks.                                                           |
| Verified           | A dated command, manual checklist, CI run, or other concrete evidence is recorded for the target branch or release environment.             |
| Staged             | Code path is present but depends on rollout flags, managed-service configuration, or human staging evidence before release.                 |
| Unverified         | Code path may exist, but this branch does not contain current end-to-end evidence proving it works in the target release environment.       |
| Local-only         | Verification requires local trusted services such as Ollama, faster-whisper STT, Postgres/pgvector, and manual Voice QA evidence.           |
| Provider boundary  | Provider setup, configuration, or adapter boundaries exist, but runtime product integration is not active until a scoped phase verifies it. |
| Active integration | Runtime code actively uses the path in the current branch and the behavior is backed by current verification evidence.                      |
| Production-ready   | Do not use this label unless hosted CI, local release verification, staging checks, security review, and rollback notes are all current.    |

Required end-to-end proof for a truthful release claim:

1. Sign in with a real configured local or staging user.
2. Open chat and complete a typed guidance turn.
3. Exercise retrieval against reviewed local corpus evidence.
4. Verify citations are limited to retrieved/validated sources.
5. Verify a conversation is saved and can be reloaded for the signed-in user.
6. Verify the local-AI unavailable state is truthful when Ollama is missing or
   unhealthy.
7. Verify a failed document ingestion path reports a truthful failure state.
8. Verify voice fallback: no microphone prompt before consent, safe
   typed fallback on denial or STT failure, and same-origin STT routing when
   allowed.

If any step is not run, mark the release evidence as `Unverified`, not
`Production-ready`.

Provider and auth boundaries for this release baseline:

- Legacy Auth.js remains the active fallback while Supabase cutover is staged.
- Pinecone, Resend, Inngest, PostHog, and Sentry are provider boundaries unless
  a later phase activates and verifies them.
- Missing local Ollama, local STT, reviewed corpus evidence, or manual Voice QA
  means release status is `Unverified`, even when tests and builds pass.

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

## Archive Reproducibility Notes

An ad hoc ZIP or development snapshot is not release evidence. The official
safe archive path is:

```bash
npm run source:archive
```

That command must run from a clean committed tree and then verify the ZIP
excludes environment files, `.git`, dependencies, build outputs, runtime logs,
local databases, uploads, and eval output. If an externally audited archive was
not produced by this command, record it as an archive reproducibility defect
rather than proof that hosted CI or the application is broken.
