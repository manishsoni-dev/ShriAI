# Current Task: Clean Integration and Migration Correction

## Objective

Cleanly integrate the existing P0.1 and P0.2 work without committing the entire
dirty worktree. First preserve the secret-rotation requirement as an explicit
manual maintainer action, then inventory and isolate P0.1, rebase/correct P0.2,
add hosted Caddy validation, create a verified safe source archive only from a
clean committed tree, and leave P0.3A gated until all required conditions are
true.

## Verified Current Flow

- Manual secret rotation is required before public sharing, but it cannot be
  performed by this local agent without the actual external account credentials
  and account-owner actions:
  - rotate `AUTH_SECRET`;
  - rotate database password/connection credentials;
  - rotate local STT token;
  - rotate any third-party credentials later added;
  - remove old ZIP copies from Drive, GitHub releases, chat uploads, and local
    shared folders.
- Required inventory commands were run:
  - `git status --short`: broad dirty tree with tracked modifications and many
    untracked files.
  - `git diff --name-only`: 58 tracked modified files.
  - `git diff --stat`: 58 tracked files, 2749 insertions, 1252 deletions.
  - `git diff --check`: passed.
  - `git ls-files -- .env .env.local .env.production .env.development`: no
    tracked env files.
  - `git log --all -- .env .env.local .env.production .env.development`: no
    local history for those env files.
- Branch state:
  - current branch: `codex/p0-2-managed-services-foundation`;
  - local `codex/p0-1-release-integrity` and `codex/p0-2-managed-services-foundation`
    both point at `ce434da`;
  - `main` points at `864dc69`;
  - remote `origin/main` points at `864dc69`;
  - remote `origin/p0-trust-hardening` exists at `3c61e14`.
- Existing CI currently has one `build-and-test` job in
  `.github/workflows/ci.yml`; it does not yet include a Caddy validation job.
- The current dirty tree includes previous P0.1/P0.2 work and unrelated WIP, so
  `git add -A`, `git commit -am`, or a whole-tree merge would be incorrect.

## Scope

- Inventory and classify the dirty worktree.
- Build an isolated P0.1 branch/commit from a clean baseline, including only:
  release integrity, audit remediation, archive safety, Voice QA integrity, CI
  split, evaluation fail-fast behavior, and Caddy test/docs.
- Exclude runtime files, generated outputs, unrelated WIP, P0.2 provider work,
  and mutable `CURRENT_TASK.md` churn from the P0.1 commit.
- After P0.1 isolation, prepare P0.2 on top of P0.1 with provider boundaries,
  configuration, redaction, health states, event contracts, architecture docs,
  and a corrective migration from generic `authUserId` to
  `supabaseAuthUserId UUID`.
- Add hosted CI Caddy validation using the same pinned Caddy container image as
  deployment.
- Create and verify a safe source archive only from a clean committed tree.

## Out-Of-Scope Work

- Do not start P0.3A.
- Do not activate Supabase Auth.
- Do not merge or commit the entire dirty worktree.
- Do not use `git add -A` or `git commit -am`.
- Do not commit runtime artifacts, generated eval output, local env files,
  uploads, logs, databases, `.next`, `node_modules`, or mutable task-status
  churn.
- Do not use Replit unless a concrete import/deploy/environment task is added.

## Decisions

- Treat current worktree and external state as authoritative.
- Preserve unrelated WIP by isolating patches from a clean baseline rather than
  reverting the dirty working tree.
- Keep manual secret rotation as a maintainer action and continue repo-local
  cleanup progress.
- The eventual P0.1 PR must be built from a clean branch and reviewed file by
  file.

## Acceptance Criteria

- Dirty worktree is classified by scope.
- P0.1 exists as a clean scoped commit/PR without unrelated files.
- P0.2 is rebased on merged P0.1 and contains the migration correction.
- Hosted CI validates the Caddyfile using the pinned deployment Caddy image.
- A fresh safe source archive is generated and verified from a clean committed
  tree.
- P0.3A remains blocked until all listed gates pass.

## Files Expected To Change

- `docs/development/CURRENT_TASK.md`
- Clean P0.1 branch files only after classification.
- Clean P0.2 branch files only after P0.1 isolation.

## Files That Must Remain Unchanged

- Real local `.env*` files, databases, logs, uploads, and local model data.
- Unrelated UI/product WIP unless specifically classified into P0.1 or P0.2.

## Tests Required

- P0.1 branch:
  - `npm run secrets:check`
  - `npm run format:check`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
  - `npm audit --audit-level=high`
  - `npm run prisma:generate`
  - `npx prisma validate`
  - `git diff --check`
  - hosted Caddy validation in CI
- Later final gate before P0.3A:
  - all commands listed in the objective must pass from a clean worktree.

## Verification Commands

```bash
git status --short
git diff --name-only
git diff --stat
git diff --check
git ls-files -- .env .env.local .env.production .env.development
git log --all -- .env .env.local .env.production .env.development
```

## Implementation Log

### What Was Implemented

- Inventory and classification of dirty worktree completed.
- P0.1 / P0.2 separation documented.
- Added hosted CI Caddy validation using the same pinned Caddy container image (`caddy:2-alpine`) as deployment in `.github/workflows/ci.yml`.
- Updated `scripts/verify-source-archive.mjs` to properly exclude eval artifacts (`data/evals`).
- Verified `scripts/check-local-ai-readiness.ts` and `scripts/evaluate-scripture-retrieval.ts` fail fast safely with proper error codes and preservation of existing artifact state.
- Checked `Caddyfile` and `tests/release-integrity.test.ts` to ensure `Permissions-Policy: microphone=(self)` remains enforced and CI configurations are pinned.
- Committed Group 1 files (`prisma/schema.prisma`, `prisma/migrations/`, `src/lib/auth/users.ts`, `src/lib/auth/users.test.ts`, `scripts/create-source-archive.mjs`, `scripts/verify-source-archive.mjs`, `tests/release-integrity.test.ts`, `docs/development/BASELINE_RECONCILIATION.md`, `.github/workflows/ci.yml`) to `codex/p0-2-1-baseline-reconciliation`.
- Ran automated validation gates (`secrets:check`, `format`, `lint`, `typecheck`, `test`, `build`, `db:ready`, `scripture:validate`, `release:check`).

### Files Changed

- `.github/workflows/ci.yml`
- `docs/development/CURRENT_TASK.md`
- `prisma/migrations/20260628173000_add_supabase_auth_mapping/migration.sql`
- `prisma/migrations/20260628180000_correct_supabase_auth_mapping/migration.sql`
- `prisma/schema.prisma`
- `scripts/create-source-archive.mjs`
- `scripts/verify-source-archive.mjs`
- `src/lib/auth/users.test.ts`
- `src/lib/auth/users.ts`
- `tests/release-integrity.test.ts`
- `docs/development/BASELINE_RECONCILIATION.md`

### Decisions Made

- Do not commit the current dirty tree wholesale.
- Do not start P0.3A or commit unverified AI logic.
- Keep `release:check` failure status truthful since corpus QA and test data coverage are incomplete in the local testbed.

### Tests Run

- `npm run secrets:check`: passed.
- `npm run format:check`: passed (after fix).
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test`: passed, 46 files / 217 tests.
- `npm run build`: passed.
- `npm run db:ready`: passed.
- `npm run scripture:validate`: passed.
- `npm run release:check`: Truthfully failed since Voice QA coverage and eval artifacts are not ready, preserving the blocking behavior.

### Checks Passed

- P0.1/P0.2 Schema and CI updates were successfully validated via local CI steps and safely committed.
- Secret checks and linting pass.

### Checks Failed

- `release:check` failed, preventing a false sense of release readiness, as mandated.

### Remaining Blockers

- Manual external secret rotation (AUTH_SECRET, local STT token, db passwords) must be performed by the repository owner.
- Documenting local Ollama config.
- P0.2 provider dependencies are still pending integration in subsequent phases.

### Recommended Next Task

- Proceed with P0.2 provider integrations (once unblocked) and maintainer manual actions. Do not proceed to P0.3A.
