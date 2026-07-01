# Current Task: P1.0B Truthful Release Baseline

## Objective

Make release-facing copy, local telemetry, and evidence records match verified
repository reality before any Loop Engineering, voice persona, provider
integration, or visual-expansion work.

## Verified Current Flow

- Worktree: `/Users/manishh/Desktop/ShriAI-truthful-baseline`.
- Branch: `codex/p1-0b-truthful-release-baseline`.
- Required inspection was run before the merge reconciliation:
  - `git fetch origin --prune`: passed.
  - `git status --short`: clean in the requested worktree.
  - `git branch --show-current`: `codex/p1-0b-truthful-release-baseline`.
  - `git log --oneline -10`: branch contained the P1.0B commits through
    `0b2a9d8` plus the audited baseline history.
  - `git diff --stat`: no output.
  - `git diff`: no output.
- The requested branch name already existed, so it was not recreated with
  `git worktree add -b`. The existing requested worktree was used.
- The previous draft PR branch was based on the audited P1.0A baseline. To match
  the latest origin/main baseline requirement without force-pushing or deleting
  history, `origin/main` was merged into the requested branch.
- The merge conflict was limited to `docs/development/CURRENT_TASK.md`; this file
  is required by repository instructions and is resolved as this P1.0B task
  record.
- `src/app/_components/SharedCosmicBackground.tsx` has no route-specific mutable
  `let` bindings. The centered sun, nine celestial bodies, and orbit behavior
  are preserved by keeping the existing `CosmicOrbitEngine` inputs and registry
  tests intact.
- `src/app/knowledge/page.tsx` states that upload, extraction, chunking,
  embeddings, and semantic search are implemented while end-to-end grounding
  still depends on configured local services and reviewed scripture evidence.
- `src/lib/telemetry/queries.ts` uses the actual Prisma `UsageEventStatus`
  values `success` and `error`.
- `src/app/admin/telemetry/page.tsx` reports p50/p95 latency, local request
  count, logged token metadata, and error rate; it displays
  `Cost estimate unavailable for local-first runtime.` instead of GPT-4o-style
  dollar estimates.
- `README.md` and `docs/release/LOCAL_RELEASE_VERIFICATION.md` distinguish
  Implemented, Verified, Staged, Unverified, Local-only, Provider boundary, and
  Active integration claims.
- `docs/research/SHRI_AI_DECISION_LOG.md` records branch evidence, verified /
  inferred / unverified findings, exact validation commands, remaining blockers,
  and rollback triggers.

## Scope

- Only P1.0B truthfulness and evidence surfaces:
  `SharedCosmicBackground`, Knowledge page copy, telemetry aggregation/UI,
  README, local release verification docs, the research decision log, and this
  required task record.

## Out-Of-Scope Work

- Do not implement P1.0C proof flows.
- Do not start Loop Engineering, voice personas, provider integrations,
  notifications, auth changes, Prisma schema/migrations, RAG changes, voice
  service changes, or visual expansion.
- Do not alter environment files, rollout flags, deployment scripts, provider
  activation code, or database state.

## Decisions

- Preserve the pushed requested branch and merge `origin/main` into it rather
  than force-pushing a different branch history.
- Treat local Ollama telemetry as local-first runtime evidence, not hosted model
  spend.
- Keep release truthfulness separate from release proof. Tests/build can verify
  code health, but P1.0C remains required for the canonical end-to-end release
  path.
- Keep provider boundaries explicit: Pinecone, Resend, Inngest, PostHog, and
  Sentry are not active integrations unless activated in runtime code and
  verified in a scoped phase.

## Acceptance Criteria

- `SharedCosmicBackground.tsx` has no `prefer-const` lint failure and preserves
  the centered sun, nine celestial bodies, and orbit behavior.
- Knowledge page copy accurately states implemented ingestion/search capability
  and the remaining grounding dependency on configured local services and
  reviewed scripture evidence.
- Local telemetry contains no GPT-4o dollar estimate and reports request count,
  latency, and errors where available.
- Telemetry aggregation uses Prisma enum values that exist in
  `prisma/schema.prisma`.
- README, release docs, and decision log accurately separate implemented,
  staged, verified, unverified, local-only, provider-boundary, and active
  integration claims.
- Required release gate passes, including clean final Git status.

## Files Expected To Change

- `src/app/_components/SharedCosmicBackground.tsx`
- `src/app/knowledge/page.tsx`
- `src/lib/telemetry/queries.ts`
- `src/app/admin/telemetry/page.tsx`
- `README.md`
- `docs/release/LOCAL_RELEASE_VERIFICATION.md`
- `docs/research/SHRI_AI_DECISION_LOG.md`
- `docs/development/CURRENT_TASK.md`

## Files That Must Remain Unchanged

- `.env*`
- `prisma/schema.prisma`
- `prisma/migrations/**`
- `src/app/api/auth/**`
- `src/lib/auth/**`
- `src/lib/rag/**`
- `src/lib/voice/**`
- Provider runtime activation code for Pinecone, Resend, Inngest, PostHog, and
  Sentry.
- Cosmic registry, celestial asset, and orbit-engine behavior files beyond the
  existing shared-background lint fix.

## Tests Required

- Formatting, strict lint, typecheck, full Vitest suite, production build,
  whitespace diff check, and final Git status.
- No auth, authorization, database, provider, RAG, voice, or ownership behavior
  is intentionally changed by this task.

## Verification Commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
git status --short
```

## Implementation Log

### What Was Implemented

- Reconciled the existing requested P1.0B branch with `origin/main` by merging
  `origin/main` into `codex/p1-0b-truthful-release-baseline`.
- Resolved the single merge conflict in this task record.
- Preserved the prior P1.0B source/doc changes for cosmic lint, Knowledge copy,
  local-first telemetry, release documentation, and decision-log evidence.

### Files Changed

- `README.md`
- `docs/development/CURRENT_TASK.md`
- `docs/release/LOCAL_RELEASE_VERIFICATION.md`
- `docs/research/SHRI_AI_DECISION_LOG.md`
- `src/app/_components/SharedCosmicBackground.tsx`
- `src/app/admin/telemetry/page.tsx`
- `src/app/knowledge/page.tsx`
- `src/lib/telemetry/queries.ts`

### Decisions Made

- Use a merge commit rather than force-pushing a rewritten P1.0B branch.
- Keep P1.0C as the next task for canonical end-to-end release proof.

### Tests Run

- Pending final gate after merge resolution.

### Checks Passed

- Pending final gate after merge resolution.

### Checks Failed

- None so far. The merge conflict was limited to this file and has been
  resolved.

### Remaining Blockers

- Canonical end-to-end release proof remains P1.0C: sign-in, chat, scripture
  retrieval, citation validation, saved conversation, local-AI unavailable
  state, failed document ingestion, and voice permission denial/fallback.

### Recommended Next Task

- P1.0C Canonical End-to-End Release Proof after P1.0B is merged.
