# Current Task: Local-First Shri AI Reconciliation

## Objective

Reconcile the preserved local-first implementation with the approved phased
plan, retaining valid work while enforcing local AI, citation-first RAG,
strict local voice, and cosmic UI performance requirements.

## Verified Current Flow

- The repository is on `feat/local-first-shri-ai` with a clean committed
  baseline after the original worktree was frozen in
  `pre-freeze-local-first-wip-2026-06-22`.
- Environment files are ignored, untracked, and absent from Git history.
- The frozen implementation contains local Ollama, faster-whisper, RAG,
  consent, and cosmic UI work that must be reconciled after baseline capture.
- Before the freeze, lint passed with seven warnings, typecheck and database
  checks passed, and tests passed 196 of 197 after Prisma generation. The sole
  failure was embedding integrity because the database had no embeddings.
- Ollama was not installed or serving. Docker CLI was installed, but its daemon
  was unavailable.

## Scope

- Baseline hygiene and reproducible local infrastructure.
- Local Ollama chat and embedding providers with no cloud runtime fallback.
- Canonical citation-first grounded answer contract and evidence-v2 gates.
- Private faster-whisper STT with consent, validation, and rate limits.
- Browser SpeechSynthesis as the only MVP speech output.
- Existing cosmic UI accessibility and low-power performance behavior.
- Tests, documentation, release gates, and phased commits.

## Out-Of-Scope Work

- Redesigning the cosmic visual system or chat layout.
- Adding new personas, cloud AI providers, or cloud voice providers.
- Rotating secrets that originated outside Git; the repository owner remains
  responsible for that operational task.
- Broad dependency upgrades or unrelated refactors.

## Decisions

- Keep the original safety stash until the user accepts the branch.
- Restore and reconcile existing implementation rather than rebuilding it.
- Preserve legacy grounded-answer fields for one compatibility window.
- Use browser SpeechSynthesis only for output; remove Piper and server TTS.
- Use a 90-second, 10 MB STT limit and a backend-only service token.
- Keep exactly nine celestial bodies, with Pluto intentionally symbolic.

## Acceptance Criteria

- The final branch is clean and the original safety stash remains available.
- Local chat and 1024-dimensional embeddings use configured Ollama models only.
- Public citations are assembled server-side from validated retrieved chunks.
- Voice recording requires stored consent and STT is private, bounded, and
  rate-limited; browser code contains no STT service URL or token.
- Cloud AI/voice runtime paths and credentials are absent.
- Required automated checks pass or environmental blockers are documented.
- Browser/manual voice and cosmic QA evidence is recorded before completion.

## Files Expected To Change

- `.gitignore`
- `docs/development/CURRENT_TASK.md`
- `docs/development/LOCAL_FIRST_BASELINE_2026-06-22.md`
- Local AI, RAG, voice, cosmic UI, test, script, and documentation files from
  the frozen implementation as identified during reconciliation.

## Files That Must Remain Unchanged

- Unrelated user work preserved by the safety stash.
- Environment files and external owner-managed secrets.
- The cosmic visual design, layout, and visual language.

## Tests Required

- Local provider streaming, cancellation, timeout, malformed response, missing
  model, service outage, embedding dimensions, and usage metadata.
- Grounding, citation validation, abstention, injection, and crisis behavior.
- Voice authentication, ownership/consent, user/IP limits, upload validation,
  duration, timeout, outage, microphone denial, stale turns, and interruption.
- Cosmic desktop/mobile rendering, reduced motion, hidden-tab pause, interaction,
  load timing, and low-power behavior.

## Verification Commands

```bash
npm ci
npm run prisma:generate
npx prisma validate
npm run prisma:migrate:deploy
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run db:ready
npm run scripture:validate
npm run scripture:eval
npm run release:check
python3 -m pytest services/voice/tests
git diff --check
git status --short
```

## Implementation Log

### What Was Implemented

- Captured a baseline on `feat/local-first-shri-ai`, preserved the original
  worktree in `pre-freeze-local-first-wip-2026-06-22`, and kept residual
  unrelated WIP in `residual-local-first-wip-2026-06-22`.
- Added local-first hygiene ignores and baseline documentation.
- Installed and configured local Ollama support while preserving the AIProvider
  surface behind narrower local chat and embedding providers.
- Removed OpenAI/cloud runtime provider paths in favor of loopback Ollama
  configuration and local embedding regeneration.
- Ingested 318 scripture records and regenerated all scripture embeddings with
  `ollama` / `qwen3-embedding:0.6b` / 1024 dimensions /
  `local-ollama-v1`.
- Made `GroundedAnswer` the canonical RAG payload, rebuilt public citations
  server-side from validated chunks, added `evidence-v2.json`, and tightened
  release gates for fabricated citations, abstention, injection, crisis routing,
  hashes, and freshness.
- Added the local faster-whisper FastAPI service under `services/voice`, Docker
  support, MIME/size/duration validation, token authentication, and Python tests.
- Kept browser-to-Next.js-to-FastAPI STT architecture; browser code has no STT
  service URL or token.
- Enforced stored microphone consent, 90-second audio limit, 10 MB upload limit,
  user/IP transcription rate limits, structured voice errors, and local
  SpeechSynthesis-only MVP playback.
- Removed server TTS/Piper/local neural playback paths and cloud voice provider
  runtime paths.
- Preserved the cosmic visual system while consolidating celestial metadata,
  documenting Pluto as the symbolic ninth body, adding local asset provenance,
  deferred preload, and low-power rendering behavior.
- Replaced fake automated Voice QA success behavior with manual pass/fail
  capture and server-side validation.
- Added the missing beta onboarding migration and changed the default
  `RELEASE_ENVIRONMENT` to `development`, fixing local auth registration/session
  prerequisites without weakening staging allowlist behavior when explicitly set.

### Files Changed

- Baseline and release documentation under `docs/`.
- Local AI provider, config, RAG, citation, scripture, telemetry, and evaluator
  code under `src/lib/`, `scripts/`, `data/evals/`, and tests.
- Voice UI/API/client/server code under `src/app/_components/VoiceRecorder.tsx`,
  `src/app/api/voice/transcribe/`, chat shell code, and voice tests.
- New voice service files under `services/voice/`.
- Cosmic UI registry/assets/docs/tests under `src/lib/celestial-registry.ts`,
  `src/app/_components/CosmicOrbitEngine.tsx`, `public/cosmic/`, and related
  docs/tests.
- Prisma schema and migrations, including local embedding metadata and
  `20260623000000_add_beta_onboarding_tables`.
- Tooling/config files including `.gitignore`, `.prettierignore`,
  `package.json`, `package-lock.json`, `vitest.config.ts`, and `tests/setup.ts`.

### Decisions Made

- Keep the safety stash until explicit user acceptance.
- Treat `qwen3:8b` and `qwen3-embedding:0.6b` as the canonical local models.
- Do not add production fallback from voice retrieval to text-only or unreviewed
  scripture.
- Keep compatibility citation aliases and `spokenAnswer` for one compatibility
  window while preferring canonical fields in UI.
- Use browser SpeechSynthesis as the only MVP speech output; provider TTS is out
  of scope for strict local voice MVP.
- Keep Docker voice service loopback-only with a server-only token.
- Default local `RELEASE_ENVIRONMENT` to `development`; staging gates still apply
  when `RELEASE_ENVIRONMENT=staging` is explicitly configured.

### Tests Run

- `npm ci`: pass; npm reported 9 audit vulnerabilities (1 low, 6 moderate,
  2 high), not auto-fixed.
- `npm run prisma:generate`: pass.
- `npx prisma validate`: pass.
- `npm run prisma:migrate:deploy`: pass, 18 migrations, no pending migrations
  after applying beta onboarding tables.
- `npx prisma migrate status`: pass, schema up to date.
- `npm run format:check`: pass.
- `npm run lint`: pass.
- `npm run typecheck`: pass.
- `npm run test`: pass, 36 files / 180 tests; jsdom canvas warning is emitted.
- `npm run build`: pass.
- `npm run db:ready`: pass against local Homebrew PostgreSQL 17.10 with pgvector
  0.8.2.
- `npm run db:check`: pass.
- `npm run scripture:validate`: pass, 318 records.
- `npx vitest run tests/integrity.test.ts`: pass, embedding integrity green.
- `PYTHONPATH="$PWD/services/voice" python3 -m pytest services/voice/tests`:
  pass, 6 tests.
- `STT_SERVICE_TOKEN=local-dev-token docker compose config --quiet`: pass.
- `STT_SERVICE_TOKEN=local-dev-token docker compose build voice`: pass.
- Browser smoke with Playwright against `http://localhost:3000/chat`: partial
  pass. Authenticated via real credentials callback, reached `/chat`, created a
  conversation, composer hit-test returned the textarea, no console/page errors,
  microphone controls were consent-gated, persona switch left input usable, and
  a user message persisted. Assistant streaming/cancellation was not proven.
- `npm run scripture:eval`: failed on the final commit with
  `AI_TIMEOUT` from local Ollama `qwen3:8b`.
- `npm run release:check`: failed two gates: stale/noncanonical latest retrieval
  eval artifact and zero passed completed staging Voice QA runs.
- `git diff --check`: pass.

### Checks Passed

- Baseline branch and stash discipline preserved.
- Docker voice image builds.
- Local faster-whisper service tests pass.
- Prisma schema, migrations, and generated client are consistent after the beta
  onboarding migration.
- Scripture corpus validates.
- Embedding integrity passes with uniform local Ollama metadata.
- Release readiness passes database, migration, table, corpus, provenance,
  voice-approved coverage, embedding uniformity, review provenance, voice
  retrieval, and required environment gates.
- Cosmic visual implementation was preserved; automated tests/build pass.

### Checks Failed

- `npm run scripture:eval` failed:
  `AIError: The local Ollama request timed out` from
  `src/lib/ai/ollama-provider.ts` while running `evidence-v2.json` on
  `qwen3:8b`.
- `npm run release:check` failed:
  - Latest retrieval eval is stale/noncanonical and still points at
    `data/evals/scripture-retrieval/retrieval_dev.json` with mismatched
    fingerprint/config and only 16 cases.
  - Completed Voice QA has 0 passed completed staging runs.
- Full browser proof of text assistant streaming/cancellation remains incomplete
  because the local chat generation path does not reliably produce a completed
  assistant response on this machine.

### Remaining Blockers

- Local `qwen3:8b` generation must respond within configured timeouts, or the
  project needs an explicitly approved smaller local chat model for 8 GB
  hardware before full pipeline eval and browser streaming smoke can pass.
- A fresh canonical `evidence-v2.json` retrieval/full-pipeline eval artifact
  must be generated and marked passing.
- Manual physical-device Voice QA must be run and saved as a passed completed
  staging run.
- Final production voice completion cannot be claimed until the manual Voice QA
  record exists.
- Browser smoke did not prove assistant streaming/cancellation end to end.

### Recommended Next Task

- Resolve the local chat model runtime blocker, rerun `npm run scripture:eval`,
  save a real manual Voice QA run, then rerun `npm run release:check` and the
  `/chat` browser smoke.
