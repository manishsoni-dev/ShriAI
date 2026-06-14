# Shri AI Repo Audit - 2026-06-13

## Summary

The repository is functionally healthier than the size of the dirty worktree suggests: tests, typecheck, lint, Prisma generation, database readiness, scripture validation, and scripture retrieval evaluation all pass. Release readiness is not yet green because human review and voice QA gates are not satisfied, and formatting is currently failing across many new files.

This audit changed only documentation files under `docs/development/`.

## Next 16 Guidance Read

Read from `node_modules/next/dist/docs/` before making framework-specific audit claims:

- `01-app/01-getting-started/15-route-handlers.md`
- `01-app/01-getting-started/16-proxy.md`
- `01-app/01-getting-started/07-mutating-data.md`
- `01-app/02-guides/authentication.md`
- `01-app/02-guides/data-security.md`
- `01-app/01-getting-started/08-caching.md`

Key implications for this repo:

- Route Handlers in `app` are the right API surface for `/api/chat/stream`, `/api/voice/transcribe`, and `/api/voice/tts`.
- Server Actions are reachable by direct POST and must verify authentication and authorization internally.
- `proxy.ts` is useful for optimistic route gating but must not be treated as the durable authorization layer.
- A centralized server-only data access layer with minimal DTOs is the preferred security posture.

## Dirty Worktree Inventory

Tracked modifications:

- Project setup/docs: `.env.example`, `README.md`, `docker-compose.yml`, `package.json`, `package-lock.json`
- Prisma: `prisma.config.ts`, `prisma/schema.prisma`
- Chat/app shell: `src/app/api/chat/stream/route.ts`, `src/app/chat/actions.ts`, `src/app/chat/chat-shell.tsx`, `src/app/chat/page.tsx`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/favicon.ico`
- Runtime config and backend: `src/env.ts`, `src/lib/db.ts`, `src/lib/ai/index.ts`, `src/lib/ai/openai-provider.ts`, `src/proxy.ts`

Untracked additions:

- Scripture corpus/eval data under `data/`
- RAG, review, observability, voice QA, and repair migrations under `prisma/migrations/202606*`
- Public assets including OM audio and Shri mark
- Operational scripts for DB checks, scripture ingestion/eval/review prep, release readiness, and voice QA
- New App Router pages for admin scripture reviews, voice API routes, static marketing/info pages, personas, wisdom, waitlist, and shared components
- New modules/tests for answer generation, reviewer authorization, browser capabilities, RAG, privacy redaction, rate limiting, safety, scripture review, TTS, personas, and voice profiles

## Security And Correctness Findings

1. Release is intentionally blocked by review/QA policy.
   `npm run release:check` fails because voice-approved scripture coverage is 0/300, no completed staging Voice QA run exists, and reviewer/admin allowlist env is not configured. These are valid release gates, not incidental failures.

2. Formatting gate is red.
   `npm run format:check` reports 42 files needing Prettier. This includes eval JSON, corpus data, scripts, UI files, RAG/review modules, and styles. Decide whether generated data should be formatted, excluded, or regenerated deterministically before PR.

3. Document upload can report success after ingestion failure.
   `src/lib/ingestion/ingest-document.ts` catches most ingestion errors, marks the document `failed`, and returns `null`. `src/app/knowledge/actions.ts` awaits it but still redirects to `/knowledge?uploaded=1`. This can produce a false success UX and should be fixed before relying on uploads.

4. Grounded answer generation bypasses the configured AI gateway.
   `src/lib/ai/answer-generator.ts` creates its own OpenAI client from `process.env.OPENAI_API_KEY` and hard-codes `gpt-4o-mini`, while the rest of the project has `env` validation, configured model names, retries, error normalization, and usage logging via `aiProvider`. This is an architectural consistency and observability gap.

5. Chat intentionally suppresses some RAG and citation failures.
   `src/app/api/chat/stream/route.ts` treats scripture retrieval, workspace search, and citation persistence as best effort. That keeps chat resilient, but failures can look like lack of context unless observability is checked. Consider explicit skipped/error trace status where practical.

6. Rate limiting is process-local.
   `src/lib/rate-limit.ts` uses an in-memory `Map`, which is fine for local/staging smoke but not durable across serverless instances, restarts, or multiple Node processes.

7. Reviewer mutation flow is comparatively strong.
   Review mutations enforce authenticated reviewer/admin authorization server-side, validate action inputs, use a transaction, perform optimistic concurrency using `updatedAt`, and write audit rows.

8. Workspace data access is mostly centralized and access-controlled.
   Conversation, document, and knowledge-search helpers verify workspace membership server-side before reading or mutating workspace-owned records.

9. Knowledge ingestion is not atomic across storage, DB chunks, and embeddings.
   Ingestion status is updated to `processing`/`ready`/`failed`, but chunk deletion, chunk creation, embedding calls, vector updates, and storage side effects are not one atomic unit. This is acceptable for a first ingestion flow if failed documents can be retried or reprocessed, but should be documented operationally.

10. No CI config is visible.
    No `.github/` directory was found. Before PR/deploy, add or confirm CI elsewhere for tests, typecheck, lint, formatting, Prisma generation, and release checks where appropriate.

## Verification Results

Commands run:

- `git status --short --branch`: dirty `main` worktree.
- `git diff --stat`: 20 tracked modified files, 2430 insertions, 270 deletions.
- `git diff --name-status`: tracked modifications listed; untracked files listed separately with `git ls-files --others --exclude-standard`.
- `npm test`: PASS, 11 test files and 54 tests passed.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run format:check`: FAIL, 42 files need formatting.
- `npm run prisma:generate`: PASS, Prisma Client v7.8.0 generated.
- `npm run db:check`: PASS, local DB reachable, pgvector installed.
- `npm run db:ready`: PASS, required tables present.
- `npm run scripture:validate`: PASS, 300 records.
- `npm run scripture:eval`: PASS, 50/50 cases, all retrieval gates passed.
- `npm run release:check`: FAIL, 3 gates failed.

Release check failures:

- Voice-approved coverage: 0/300 chunks, required 1 chunk and 1%.
- Completed Voice QA: 0 passed completed runs for staging.
- Required environment: missing `ADMIN_EMAILS` or `REVIEWER_EMAILS`.

Browser smoke:

- Skipped. The plan allowed Browser smoke only after static checks passed; `format:check` is currently red. The app should be smoke-tested locally after formatting policy is resolved or if the user explicitly wants runtime smoke despite formatting failure.

## Test Coverage Gaps

- Upload action should assert failed ingestion does not redirect as success.
- Chat route should have route-handler tests for unauthenticated access, cross-user conversation access, malformed body, rate limiting, crisis route, retrieval failure fallback, invalid generated citations, and observability behavior.
- Voice routes should have tests for unauthenticated access, rate limits, MIME/size validation, missing provider keys, and provider failures without leaking secrets.
- Release readiness script should have tests around env gates, review coverage, Voice QA lookup, and latest eval artifact selection.
- Data access tests should cover cross-workspace document deletion/search and concurrent default workspace creation.
- Browser/E2E smoke is missing for sign-in, chat, knowledge upload/search, and admin review workflows.

## Recommended Next Implementation Sequence

1. Resolve formatting gate.
   Decide whether generated data/eval artifacts should be formatted or ignored, then run the appropriate formatting fix and re-check `npm run format:check`.

2. Fix false upload success.
   Make ingestion failure visible to `uploadDocumentAction`, redirect with a failure code, and add a focused test.

3. Route grounded answers through the project AI provider.
   Replace the direct OpenAI client/model hard-code in `answer-generator` with configured model selection, normalized errors, retries, and usage logging.

4. Satisfy release gates.
   Configure `ADMIN_EMAILS` or `REVIEWER_EMAILS`, run review preparation if needed, approve an initial voice-safe subset, create a completed passed staging Voice QA run, then rerun `npm run release:check`.

5. Add minimal CI.
   At minimum, run `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run prisma:generate`, and the DB/release checks in environments where prerequisites exist.

6. Run Browser smoke.
   After gate cleanup, start `npm run dev` and smoke-test `/`, `/sign-in`, `/chat`, `/knowledge`, `/knowledge/search`, and `/admin/scripture-reviews` with authenticated and unauthorized paths.

## Acceptance Status

- Audit docs created: complete.
- Existing work preserved: complete.
- Tests/checks recorded: complete.
- Browser smoke: intentionally skipped due red format gate.
- Source behavior changes: none.
