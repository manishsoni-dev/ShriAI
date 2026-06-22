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

- In progress.

### Files Changed

- In progress.

### Decisions Made

- In progress.

### Tests Run

- In progress.

### Checks Passed

- In progress.

### Checks Failed

- In progress.

### Remaining Blockers

- Ollama installation/model availability and Docker daemon availability must be
  established during infrastructure reconciliation.

### Recommended Next Task

- Complete this reconciliation before selecting another task.
