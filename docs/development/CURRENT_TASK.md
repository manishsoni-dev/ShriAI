# Current Task: P0.3B.2 - Integration Recovery and Staging Certification

## Objective

Use the isolated P0.3B.2 branch/worktree to integrate only the controlled
Supabase Auth staging work from P0.3B/P0.3B.1, add deterministic CI/test
environment commands and test database safety, and document staging
certification without starting P0.3C.

## Verified Current Flow

- Isolated worktree: `/Users/manishh/Desktop/Shri AI P0.3B.2`.
- Branch: `codex/p0-3b-2-integration-staging-certification`.
- Current `origin/main`: `68c521a Merge pull request #6 from
manishsoni-dev/codex/source-archive-safety-correction`.
- Current branch head before this continuation:
  `fbf987f docs: refresh p0.3b.2 certification topology`.
- Current merge base with `origin/main` before this continuation: `cbade94`.
- Current worktree state before this documentation update: `git status --short`
  clean.
- Current P0.3B.2 commits ahead of the old merge base:
  `fbf987f docs: refresh p0.3b.2 certification topology`,
  `e60c23b Merge origin/main into P0.3B.2 certification`, and
  `b713baf feat: certify p0.3b integration recovery`.
- Current `origin/main...HEAD` diff is limited to P0.3B.2 auth, Supabase,
  route, test, CI/test-environment, and documentation files, but the branch is
  behind current `origin/main` by merged P0.2 and source-archive safety work.
- Preflight from the original P0.3B.1 worktree verified:
  - `git fetch origin --prune`: passed.
  - `git worktree list`: recorded P0.3B.1, P0.1 Clean, P0.2 Clean, P0.3A,
    P0.3B.2, and baseline worktrees.
  - `git branch -a --contains 23dd098`: only local/remote
    `codex/p0-3b-1-auth-certification`.
  - `git cat-file -e 23dd098^{commit}`: passed.
  - `git log --oneline origin/main..23dd098`: P0.3A, P0.3B.1, plus an
    out-of-scope source-archive commit and its revert.
  - `git diff --name-status origin/main...23dd098`: P0.3 auth/staging files
    only in net diff; no source-archive files remain in the net diff.
  - `git show --stat 23dd098`: five-file certification test/doc delta.
  - Original P0.3B.1 worktree `git status --short`: clean.
- Sibling worktrees checked after current-main merge:
  P0.1 Clean, P0.2 Clean, P0.3A, and baseline worktrees are clean and were not
  modified by this task.
- PR state from GitHub:
  PR #4 is the active P0.3B.2 draft PR and is open. Its prior checks were green
  (`caddy-validate`, `build-and-test`, and ArchGuard), but they are stale
  because `origin/main` has advanced through PR #5 and PR #6. Checks must rerun
  after current `origin/main` is merged into the branch and pushed.
  PR #3 is superseded by P0.3B.2. PR #1 is unrelated and merge-dirty.

## Scope

- Integrate controlled Supabase Auth staging foundation and certification
  changes required for P0.3B/P0.3B.1.
- Deterministic safe CI/test commands using tracked `.env.test` placeholders
  only for explicit non-production validation commands.
- Test database safety preflight and documentation.
- P0.3B.2 integration report, research decision log, and staging checklist.
- GitHub Actions updates for deterministic CI commands.
- Refresh P0.3B.2 docs after merging the latest current `origin/main` into the
  branch.

## Out-Of-Scope Work

- No P0.3C.
- No Resend API email sending, Inngest jobs, Pinecone queries, PostHog capture,
  Sentry capture, hosted LLMs, or product features.
- No unrelated P0.1 rebase, source archive, Caddy, UI, cosmic, or script WIP
  unless already present in `origin/main`.
- No mutation or deletion of sibling worktrees.
- No history rewriting or force-push.
- No copying, reading, printing, or committing real `.env` or `.env.local`.

## Decisions

- Use the isolated P0.3B.2 worktree as the only implementation location.
- Treat current Git state and GitHub state as authoritative.
- Bring current `origin/main` into the existing P0.3B.2 branch with a normal
  merge commit because the branch/PR already existed; do not rebase or
  force-push.
- Keep `npm run build` as the production build command requiring real
  configuration; add explicit CI/test commands for placeholder-based validation.
- Do not silently create local PostgreSQL roles or databases.

## Acceptance Criteria

- Branch contains current `origin/main` without history rewriting or force-push.
- Integrated diff excludes the out-of-scope source archive/Caddy rebase work.
- No runtime, package script, or test setup uses `SKIP_ENV_VALIDATION`; remaining
  textual references are documentation and assertions proving the bypass stays
  out.
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
- P0.1/P0.2/P0.3A/baseline worktrees outside this isolated P0.3B.2 worktree.
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

- Used the isolated P0.3B.2 worktree and branch; it already existed before this
  turn and was verified before further work.
- Merged current `origin/main` (`cbade94`) into P0.3B.2 with a normal merge
  commit, avoiding rebase/force-push/history rewriting.
- Verified on continuation that `origin/main` has advanced to `68c521a` and PR
  #4 must be refreshed again before it can be treated as integrated.
- Recorded mandatory preflight evidence and refreshed the task scope.
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

- Leave sibling P0.1/P0.2/P0.3A/baseline worktrees untouched and document their
  clean state.
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
- `npm audit --audit-level=high`: passed with 1 low and 3 moderate advisories.
- `npm run prisma:generate`: passed.
- `npx prisma validate`: passed.
- `npm run test:db:preflight` without `TEST_DATABASE_URL`: failed safely with
  the expected prerequisite message.
- `TEST_DATABASE_URL=postgresql://test:test@localhost:5432/shri_ai_test?schema=public DATABASE_URL=postgresql://test:test@localhost:5432/shri_ai_test?schema=public npm run test:db:preflight`:
  passed.
- `git ls-files -- .env .env.local .env.production .env.development`: no
  tracked real env files.
- `rg -n "SKIP_ENV_VALIDATION" .`: only documentation and assertion references;
  no runtime, package script, or setup bypass.
- `git diff --check`: passed.

### Checks Passed

- Current-main merge completed cleanly.
- Required validation commands passed.
- Database preflight fails safely when `TEST_DATABASE_URL` is absent and accepts
  a clearly disposable matching test URL.

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

- Complete validation, push PR #4, and wait for CI/ArchGuard before any P0.3C
  work.
