# P0.3B.2 Integration Recovery and Staging Certification

## Branch and Worktree Topology

Preflight commands were run before integration:

- `git fetch origin --prune`: passed.
- `git worktree list`: recorded these worktrees:
  - `/Users/manishh/Desktop/Shri AI` on
    `codex/p0-3b-1-auth-certification` at `23dd098`.
  - `/Users/manishh/Desktop/Shri AI P0.1 Clean` on
    `codex/p0-1-release-integrity` at `f73d0f3`.
  - `/Users/manishh/Desktop/Shri AI P0.2 Clean` on
    `codex/p0-2-managed-services-foundation-clean` at `40436d4`.
  - `/Users/manishh/Desktop/Shri AI P0.3B.2` on
    `codex/p0-3b-2-integration-staging-certification` at `4786bbd`
    before integration.
  - `/Users/manishh/Desktop/ShriAI-p0-3a` on
    `codex/p0-3a-supabase-auth-foundation` at `7446ce0`.
  - `/Users/manishh/Desktop/ShriAI-p0-baseline` on `main` at `4786bbd`.
- `git branch -a --contains 23dd098`: only local/remote
  `codex/p0-3b-1-auth-certification`.
- `git cat-file -e 23dd098^{commit}`: passed.
- `git merge-base origin/main 23dd098`: `4786bbd`.
- `git log --oneline origin/main..23dd098`: P0.3A foundation, P0.3B.1
  certification, and one source-archive commit with its revert.
- `git diff --name-status origin/main...23dd098`: net diff is P0.3 auth,
  Supabase, route, test, and documentation work. The reverted source-archive
  files are absent from the net diff.
- `git show --stat 23dd098`: five-file P0.3B.1 certification delta.
- `git status --short` in the original P0.3B.1 worktree: clean.

## Commit Relationships

- `origin/main` is `4786bbd`, a merge of the baseline/P0.2.1 branch.
- P0.1 release/security baseline work is already represented on `origin/main`
  through `e418485` and related merged history.
- P0.2 managed-service boundary work is already represented on `origin/main`
  through `477f237`.
- P0.2.1 schema/script reconciliation is already represented on `origin/main`
  through `d97778b`.
- P0.3A exists on `codex/p0-3a-supabase-auth-foundation` ending at `7446ce0`.
- P0.3B.1 exists on `codex/p0-3b-1-auth-certification` ending at `23dd098`.
- P0.3B.2 was created fresh from `origin/main` and integrates the net
  P0.3A/P0.3B.1 auth-staging diff without the reverted source-archive history.

## Pull Request Status

- PR #2, `[codex] Harden release integrity verification`, is open as a draft
  from `codex/p0-1-release-integrity` to `main`. GitHub reports it as
  merge-dirty. A separate local P0.1 clean worktree has an interrupted staged
  task-document change and was not modified by P0.3B.2.
- PR #3, `[codex] Certify P0.3B.1 auth cutover`, is open as a draft from
  `codex/p0-3b-1-auth-certification` to `main`. GitHub reports it clean with
  passing CI and ArchGuard. P0.3B.2 supersedes PR #3 for final staging
  integration because it rebuilds the net P0.3B.1 diff on a fresh branch and
  adds deterministic CI/test environment controls.

## Preserved Dirty Worktrees

- `/Users/manishh/Desktop/Shri AI P0.1 Clean`: `M docs/development/CURRENT_TASK.md`
  is staged from the interrupted P0.1 rebase continuation. It is unrelated and
  preserved untouched.
- `/Users/manishh/Desktop/Shri AI`: clean P0.3B.1 worktree, untouched after
  preflight.
- `/Users/manishh/Desktop/Shri AI P0.2 Clean`: clean and untouched.
- `/Users/manishh/Desktop/ShriAI-p0-3a`: clean and untouched.
- `/Users/manishh/Desktop/ShriAI-p0-baseline`: clean and untouched.

## Changed Files and Purpose

- P0.3B/P0.3B.1 auth files: Supabase SSR clients, server-only admin client,
  callback route, logout action, auth arbitration, current actor resolution,
  rollout flags, route migration to `getAuthenticatedUser()`, and tests.
- CI/test environment files: explicit `.env.test`, `test:ci`, `build:ci`,
  `.env.test` runner, and GitHub Actions updates.
- Test database safety files: `check-test-database-url.mjs`,
  `test:db:preflight`, and unit tests for rejecting unsafe test DB targets.
- Documentation: P0.3B.1 certification, P0.3B.2 integration report, Supabase
  migration/staging docs, and research decision log.

## No Unrelated Work Entered

The branch was built from `origin/main` and applied the net diff from
`origin/main...23dd098` excluding old `CURRENT_TASK.md` churn. The reverted
source-archive/Caddy commit pair remains out of this branch history, and source
archive files are not introduced by P0.3B.2. Existing Caddy/source-archive files
visible in the tree are inherited from `origin/main`, not newly integrated.

## CI and Test Environment Strategy

- `npm run build` remains the normal production build command and requires real
  production configuration.
- `npm run test:ci` and `npm run build:ci` use
  `scripts/run-with-test-env.mjs` to load tracked `.env.test` placeholders.
- `dotenv` is loaded with `override: false`, so CI-provided variables take
  precedence over placeholders.
- `.env.test` contains only safe placeholders for `AUTH_SECRET` and
  `DATABASE_URL`; it is not a production runtime file.
- No `SKIP_ENV_VALIDATION` bypass is used.
- Package scripts do not use shell `source` commands.

## Test Database Safety Design

- Unit tests use mocks and must not require database connectivity.
- Database integration checks require explicit `TEST_DATABASE_URL`.
- GitHub Actions owns the disposable CI Postgres lifecycle and sets
  `DATABASE_URL` and `TEST_DATABASE_URL` to the same `shri_ai_ci` database.
- `scripts/check-test-database-url.mjs` rejects missing required
  `TEST_DATABASE_URL`, production-like hostnames, ambiguous database names, and
  drift where `DATABASE_URL` differs from `TEST_DATABASE_URL`.
- Local `npx prisma migrate status` may fail safely when no disposable local
  test database exists.
- Production `DATABASE_URL` must never be used by tests.

## P0.3C Block

P0.3C remains blocked because manual staging evidence has not been supplied for
the controlled Supabase Auth rollout checklist. No Resend API sending, Inngest
jobs, Pinecone queries, PostHog capture, Sentry capture, hosted LLMs, or
notification outbox work is included in P0.3B.2.

## Validation Evidence

- `npm run secrets:check`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed after `npm run prisma:generate`.
- `npm run test`: passed, 54 files / 278 tests.
- `npm run test:ci`: passed, 54 files / 278 tests.
- `npm run build:ci`: passed.
- `npm audit --audit-level=high`: passed with 1 low and 3 moderate advisories
  remaining.
- `npm run prisma:generate`: passed.
- `npx prisma validate`: passed.
- `git diff --check`: passed.
- `npm run test:db:preflight` without `TEST_DATABASE_URL`: failed safely with
  the expected prerequisite message.
- `TEST_DATABASE_URL=postgresql://test:test@localhost:5432/shri_ai_test DATABASE_URL=postgresql://test:test@localhost:5432/shri_ai_test npm run test:db:preflight`:
  passed.
- Final `git status --short`: pending commit at time of documentation update.
