# P0.3B.2 Integration Recovery and Staging Certification

## Branch and Worktree Topology

Preflight commands were run before integration and re-run after the current-main
merge:

- `git fetch origin --prune`: passed.
- `git worktree list`: recorded these worktrees:
  - `/Users/manishh/Desktop/Shri AI` on
    `codex/p0-3b-1-auth-certification` at `23dd098`.
  - `/Users/manishh/Desktop/Shri AI P0.1 Clean` on
    `codex/p0-1-release-integrity` at `bb7c31a`.
  - `/Users/manishh/Desktop/Shri AI P0.2 Clean` on
    `codex/p0-2-managed-services-foundation-clean` at `d02981c`.
  - `/Users/manishh/Desktop/Shri AI P0.3B.2` on
    `codex/p0-3b-2-integration-staging-certification` at `e60c23b` before this
    documentation refresh.
  - `/Users/manishh/Desktop/ShriAI-p0-3a` on
    `codex/p0-3a-supabase-auth-foundation` at `7446ce0`.
  - `/Users/manishh/Desktop/ShriAI-p0-baseline` on `main` at `4786bbd`.
- `git branch -a --contains 23dd098`: only local/remote
  `codex/p0-3b-1-auth-certification`.
- `git cat-file -e 23dd098^{commit}`: passed.
- `git log --oneline origin/main..23dd098`: P0.3A foundation, P0.3B.1
  certification, and one source-archive commit with its revert.
- `git diff --name-status origin/main...23dd098`: net diff is P0.3 auth,
  Supabase, route, test, and documentation work. The reverted source-archive
  files are absent from the net diff.
- `git show --stat 23dd098`: five-file P0.3B.1 certification delta.
- `git status --short` in the original P0.3B.1 worktree: clean.
- The existing P0.3B.2 branch was verified clean, then current `origin/main`
  (`cbade94`) was merged with a normal merge commit. No rebase, force-push, or
  history rewrite was used.

## Commit Relationships

- Current `origin/main` is `cbade94`, `Merge P0.1 release integrity hardening`.
- Current P0.3B.2 merge base with `origin/main` is `cbade94`.
- P0.3B.2 is ahead of `origin/main` by:
  - `e60c23b Merge origin/main into P0.3B.2 certification`.
  - `b713baf feat: certify p0.3b integration recovery`.
- P0.1 release integrity work is merged into `origin/main` through PR #2.
- P0.2 managed-service boundary work is represented in historical baseline main
  through `477f237`; the later clean P0.2 worktree remains separate and
  untouched.
- P0.3A exists on `codex/p0-3a-supabase-auth-foundation` ending at `7446ce0`.
- P0.3B.1 exists on `codex/p0-3b-1-auth-certification` ending at `23dd098`.
- P0.3B.2 integrates the net P0.3A/P0.3B.1 auth-staging diff without the
  reverted source-archive history.

## Pull Request Status

- PR #4, `[codex] Recover P0.3B staging integration`, is the active P0.3B.2
  draft PR from `codex/p0-3b-2-integration-staging-certification` to `main`.
  GitHub reported it clean with passing CI and ArchGuard before the current-main
  merge; checks must rerun after this update is pushed.
- PR #3, `[codex] Certify P0.3B.1 auth cutover`, is superseded by PR #4 because
  P0.3B.2 rebuilds the net P0.3B.1 diff and adds deterministic CI/test
  environment controls.
- PR #1, `P0 trust hardening: privacy-safe logs and truthful uploads`, is
  unrelated to P0.3B.2 and merge-dirty.

## Preserved Worktrees

- `/Users/manishh/Desktop/Shri AI`: clean P0.3B.1 worktree, untouched after
  preflight.
- `/Users/manishh/Desktop/Shri AI P0.1 Clean`: clean, untouched.
- `/Users/manishh/Desktop/Shri AI P0.2 Clean`: clean, untouched.
- `/Users/manishh/Desktop/ShriAI-p0-3a`: clean, untouched.
- `/Users/manishh/Desktop/ShriAI-p0-baseline`: clean, untouched.

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

The branch contains current `origin/main` plus the P0.3B.2 integration commit.
The current `origin/main...HEAD` diff is limited to P0.3B.2 auth, Supabase,
route, test, CI/test-environment, and documentation files. The reverted
source-archive/Caddy commit pair from P0.3B.1 is not in this branch's P0.3B.2
history, and source-archive files are not introduced by P0.3B.2. Existing
Caddy/source-archive files visible in the tree are inherited from
`origin/main`, not newly integrated.

## CI and Test Environment Strategy

- `npm run build` remains the normal production build command and requires real
  production configuration.
- `npm run test:ci` and `npm run build:ci` use
  `scripts/run-with-test-env.mjs` to load tracked `.env.test` placeholders.
- `dotenv` is loaded with `override: false`, so CI-provided variables take
  precedence over placeholders.
- `.env.test` contains only safe placeholders for `AUTH_SECRET` and
  `DATABASE_URL`; it is not a production runtime file.
- No runtime, package script, or test setup uses `SKIP_ENV_VALIDATION`; remaining
  textual references are documentation and assertions proving the bypass stays
  out.
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
- `npm run typecheck`: passed.
- `npm run test`: passed, 54 files / 278 tests.
- `npm run test:ci`: passed, 54 files / 278 tests.
- `npm run build:ci`: passed.
- `npm audit --audit-level=high`: passed with 1 low and 3 moderate advisories.
- `npm run prisma:generate`: passed.
- `npx prisma validate`: passed.
- `git diff --check`: passed.
- `git ls-files -- .env .env.local .env.production .env.development`: no
  tracked real env files.
- `rg -n "SKIP_ENV_VALIDATION" .`: only documentation and assertion references;
  no runtime, package script, or setup bypass.
- `npm run test:db:preflight` without `TEST_DATABASE_URL`: failed safely with
  the expected prerequisite message.
- `TEST_DATABASE_URL=postgresql://test:test@localhost:5432/shri_ai_test?schema=public DATABASE_URL=postgresql://test:test@localhost:5432/shri_ai_test?schema=public npm run test:db:preflight`:
  passed.
- Final `git status --short`: pending documentation commit at time of this
  update.
