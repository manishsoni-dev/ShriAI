# Current Task: P1.0 Backlog Capture After P0.3B.2

## Objective

Record the P1.0 Hero Clarity and Cosmic Containment backlog item after P0.3B.2
merged, without implementing visual changes or starting P0.3C.

## Verified Current Flow

- Worktree: `/Users/manishh/Desktop/ShriAI-p0-baseline`.
- Branch: `codex/p1-0-hero-clarity-backlog`.
- Branch was created from merged `main`.
- `main` includes P0.3B.2 merge commit
  `fc058dd Merge pull request #4 from
manishsoni-dev/codex/p0-3b-2-integration-staging-certification`.
- PR #4 is merged and hosted checks passed:
  `build-and-test`, `caddy-validate`, and ArchGuard.
- `docs/research/SHRI_AI_DECISION_LOG.md` exists.
- `docs/security/SUPABASE_AUTH_STAGING_CUTOVER.md` exists and keeps all manual
  staging evidence rows pending.
- No concrete Replit app action was provided, so no Replit connector action is
  part of this task.

## Scope

- Add a documentation-only backlog item for P1.0 Hero Clarity and Cosmic
  Containment.
- Update this task ledger.

## Out-Of-Scope Work

- Do not implement landing-page visuals.
- Do not start P0.3C.
- Do not add Resend API emails, Inngest jobs, Pinecone ingestion/queries,
  PostHog capture, Sentry capture, hosted LLMs, notification outbox work, or
  product features.
- Do not mark Supabase staging checklist rows complete without actual human
  evidence.
- Do not read, copy, print, or commit real `.env` or `.env.local`.

## Decisions

- Treat P1.0 as backlog documentation only.
- Keep P0.3C blocked until the explicit exit gate is satisfied, including human
  Supabase staging evidence.

## Acceptance Criteria

- P1.0 backlog item exists and captures the screenshot-specific issues.
- Backlog item states no visual implementation is included.
- Worktree remains free of runtime/product changes.
- Formatting and diff checks pass.

## Files Expected To Change

- `docs/development/CURRENT_TASK.md`
- `docs/development/P1_0_HERO_CLARITY_COSMIC_CONTAINMENT.md`

## Files That Must Remain Unchanged

- Application source files.
- Auth, notification, provider, and telemetry runtime files.
- Real `.env`, `.env.local`, `.env.production`, and `.env.development` files.
- Generated source archives and runtime artifacts.

## Tests Required

- `npm run format:check`
- `git diff --check`
- `git status --short`

## Verification Commands

```bash
npm run format:check
git diff --check
git status --short
```

## Implementation Log

### What Was Implemented

- Added `docs/development/P1_0_HERO_CLARITY_COSMIC_CONTAINMENT.md` as a
  backlog item only.

### Files Changed

- `docs/development/CURRENT_TASK.md`
- `docs/development/P1_0_HERO_CLARITY_COSMIC_CONTAINMENT.md`

### Decisions Made

- No visual implementation was started.
- P0.3C remains blocked by the stated exit gate.

### Tests Run

- `npm run format:check`: passed.
- `git diff --check`: passed.

### Checks Passed

- P1.0 backlog item exists and is documentation-only.
- No runtime/product source files were changed.

### Checks Failed

- None yet.

### Remaining Blockers

- Human Supabase staging checklist evidence is still pending.
- P0.3C remains blocked until all exit-gate conditions are satisfied.

### Recommended Next Task

- Collect human staging evidence for Supabase Auth, or separately schedule P1.0
  as a design/frontend task after auth gates.
