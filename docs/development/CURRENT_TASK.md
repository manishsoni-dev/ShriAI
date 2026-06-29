# Current Task: P0.3B.2 - Integration Recovery and Staging Certification

## Objective

Create a fresh isolated P0.3B.2 branch from `origin/main`, integrate only the
controlled Supabase Auth staging work from P0.3B/P0.3B.1, add deterministic
CI/test environment commands and test database safety, and document staging
certification without starting P0.3C.

## Verified Current Flow

- Fresh worktree: `/Users/manishh/Desktop/Shri AI P0.3B.2`.
- Branch: `codex/p0-3b-2-integration-staging-certification`.
- Branch base: `origin/main` at `4786bbd`.
- Initial worktree state: `git status --short` clean.
- Initial branch log starts at `4786bbd Merge branch 'codex/p0-baseline-verify' into main`.
- Initial diff: `git diff --stat` and `git diff` have no output.
- Preflight from the original P0.3B.1 worktree verified:
  - `git fetch origin --prune`: passed.
  - `git worktree list`: existing worktrees are Shri AI P0.3B.1, P0.1 Clean,
    P0.2 Clean, P0.3A, and baseline main.
  - `git branch -a --contains 23dd098`: only local/remote
    `codex/p0-3b-1-auth-certification`.
  - `git cat-file -e 23dd098^{commit}`: passed.
  - `git merge-base origin/main 23dd098`: `4786bbd`.
  - `git log --oneline origin/main..23dd098`: P0.3A, P0.3B.1, plus an
    out-of-scope source-archive commit and its revert.
  - `git diff --name-status origin/main...23dd098`: P0.3 auth/staging files
    only in net diff; no source-archive files remain in the net diff.
  - `git show --stat 23dd098`: five-file certification test/doc delta.
  - Original P0.3B.1 worktree `git status --short`: clean.
- Interrupted P0.1 worktree preservation status:
  `/Users/manishh/Desktop/Shri AI P0.1 Clean` has staged
  `docs/development/CURRENT_TASK.md` after a rebase continuation. It is
  unrelated to P0.3B.2 and will not be modified by this task.

## Scope

- Integrate controlled Supabase Auth staging foundation and certification
  changes required for P0.3B/P0.3B.1.
- Deterministic safe CI/test commands using tracked `.env.test` placeholders
  only for explicit non-production validation commands.
- Test database safety preflight and documentation.
- P0.3B.2 integration report, research decision log, and staging checklist.
- GitHub Actions updates for deterministic CI commands.

## Out-Of-Scope Work

- No P0.3C.
- No Resend API email sending, Inngest jobs, Pinecone queries, PostHog capture,
  Sentry capture, hosted LLMs, or product features.
- No unrelated P0.1 rebase, source archive, Caddy, UI, cosmic, or script WIP
  unless already present in `origin/main`.
- No mutation or deletion of the original or interrupted worktrees.
- No history rewriting or force-push.
- No copying, reading, printing, or committing real `.env` or `.env.local`.

## Decisions

- Use the fresh worktree as the only implementation location.
- Treat current Git state and GitHub state as authoritative.
- Inspect net P0.3B.1 diff and ancestry before applying any code.
- Keep `npm run build` as the production build command requiring real
  configuration; add explicit CI/test commands for placeholder-based validation.
- Do not silently create local PostgreSQL roles or databases.

## Acceptance Criteria

- Branch is created from current `origin/main`.
- Integrated diff excludes the out-of-scope source archive/Caddy rebase work.
- `SKIP_ENV_VALIDATION` is absent.
- `.env.test` contains only safe placeholders required by `src/env.ts`.
- `npm run test:ci` and `npm run build:ci` load `.env.test` placeholders without
  overriding existing CI-provided environment variables.
- Database integration tests require explicit `TEST_DATABASE_URL` and reject
  production-like targets.
- Staging checklist requires evidence and does not claim manual checks passed.
- Required validation commands pass or safe prerequisites are reported.

## Files Expected To Change

- `.env.test`
- `.github/workflows/ci.yml`
- `.gitignore`
- `docs/development/CURRENT_TASK.md`
- `docs/development/P0_3B_2_INTEGRATION.md`
- `docs/research/SHRI_AI_DECISION_LOG.md`
- `docs/security/SUPABASE_AUTH_STAGING_CUTOVER.md`
- `package.json`
- P0.3B/P0.3B.1 auth, Supabase, route, test, and documentation files after
  reviewed integration.

## Files That Must Remain Unchanged

- Real `.env`, `.env.local`, `.env.production`, and `.env.development` files.
- Interrupted P0.1/P0.2/P0.3A worktrees outside this fresh P0.3B.2 worktree.
- Source archive, Caddy, UI/cosmic, generated runtime, upload, log, database, or
  build artifacts unless already in `origin/main`.

## Tests Required

- Auth arbitration and route certification tests.
- Client/server Supabase boundary tests.
- CI env placeholder loading tests.
- Test database safety preflight tests.
- Staging checklist/docs static tests where applicable.
- Full required validation command set.

## Verification Commands

```bash
npm run secrets:check
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:ci
npm run build:ci
npm audit --audit-level=high
npm run prisma:generate
npx prisma validate
git diff --check
git status --short
```

Database integration checks must run only with an explicit disposable
`TEST_DATABASE_URL`.

## Implementation Log

### What Was Implemented

- Created the fresh isolated P0.3B.2 worktree and branch from `origin/main`.
- Recorded mandatory preflight evidence and task scope.
- Integrated the net P0.3A/P0.3B.1 controlled Supabase Auth staging diff while
  excluding the old task-document churn and the reverted source-archive history.
- Added deterministic `test:ci` and `build:ci` commands using `.env.test`
  placeholders without overriding CI-provided environment variables.
- Added explicit test database URL preflight checks and tests.
- Added the P0.3B.2 integration report, research decision log, and final manual
  staging evidence checklist.

### Files Changed

- `docs/development/CURRENT_TASK.md`
- Auth/Supabase staging files listed in
  `docs/development/P0_3B_2_INTEGRATION.md`.
- `.github/workflows/ci.yml`
- `package.json`
- `scripts/run-with-test-env.mjs`
- `scripts/check-test-database-url.mjs`
- `tests/ci-env-contract.test.ts`
- `tests/test-database-url.test.mjs`
- `docs/development/P0_3B_2_INTEGRATION.md`
- `docs/research/SHRI_AI_DECISION_LOG.md`
- `docs/security/SUPABASE_AUTH_STAGING_CUTOVER.md`

### Decisions Made

- Leave the interrupted P0.1 clean worktree untouched and document it as
  unrelated preserved worktree state.
- Keep `npm run build` as the production build command; use `build:ci` only for
  placeholder-backed validation.
- Require `TEST_DATABASE_URL` for database integration checks and reject
  production-like or ambiguous database targets.

### Tests Run

- `npm run secrets:check`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test`: passed, 54 files / 278 tests.
- `npm run test:ci`: passed, 54 files / 278 tests.
- `npm run build:ci`: passed.
- `npm audit --audit-level=high`: passed with low/moderate advisories only.
- `npm run prisma:generate`: passed.
- `npx prisma validate`: passed.
- `git diff --check`: passed.
- `npm run test:db:preflight`: failed safely without `TEST_DATABASE_URL`.
- Explicit disposable `TEST_DATABASE_URL` preflight: passed.

### Checks Passed

- Fresh worktree creation and initial Git inspection passed.
- Required local validation passed, except for the intentionally missing
  `TEST_DATABASE_URL` prerequisite check.

### Checks Failed

- `npm run test:db:preflight` without `TEST_DATABASE_URL` failed by design to
  prevent accidental database integration tests against production or ambiguous
  databases.

### Remaining Blockers

- Manual staging evidence is not supplied; staging checklist can be prepared but
  cannot be marked passed.
- P0.3C remains blocked until P0.3B.2 integration and staging certification are
  complete and verified.
- Database integration checks require an explicit disposable `TEST_DATABASE_URL`.

### Recommended Next Task

- Inspect and integrate the P0.3B/P0.3B.1 net auth diff onto this branch,
  excluding unrelated history.
