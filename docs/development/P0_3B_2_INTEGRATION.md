# P0.3B.2 Integration Recovery and Staging Certification

## Branch and Worktree Topology

Verified topology after refreshing PR #4 against current main:

- Worktree: `/Users/manishh/Desktop/Shri AI P0.3B.2`.
- Branch: `codex/p0-3b-2-integration-staging-certification`.
- Current branch head after merge: `2493ef0 Merge origin/main into P0.3B.2
after P0.2 gates`.
- Current `origin/main`: `68c521a Merge pull request #6 from
manishsoni-dev/codex/source-archive-safety-correction`.
- Current merge base with `origin/main`: `68c521a`.
- Current P0.3B.2 commits ahead of `origin/main`:
  - `2493ef0 Merge origin/main into P0.3B.2 after P0.2 gates`.
  - `ea723cd docs: record p0.3b.2 stale main state`.
  - `fbf987f docs: refresh p0.3b.2 certification topology`.
  - `e60c23b Merge origin/main into P0.3B.2 certification`.
  - `b713baf feat: certify p0.3b integration recovery`.
- `git diff --name-status origin/main...HEAD` is limited to P0.3B.2 auth,
  Supabase, route, test, CI/test-environment, research, staging, and task
  documentation files.
- The latest current-main merge conflicted only in
  `docs/development/CURRENT_TASK.md`; the conflict was resolved by preserving
  the active P0.3B.2 ledger while inheriting current-main P0.2 and
  source-archive safety changes.

## P0 Status

- P0.1 is merged into `origin/main` through PR #2.
- P0.2 is merged into `origin/main` through PR #5.
- Source archive safety correction is merged into `origin/main` through PR #6.
- P0.3A remains represented by historical branch
  `codex/p0-3a-supabase-auth-foundation`.
- P0.3B.1 remains represented by historical branch
  `codex/p0-3b-1-auth-certification` at `23dd098`.
- P0.3B.2 is the active integration PR that supersedes PR #3 for staging
  integration.

## Pull Request Status

- PR #4, `[codex] Recover P0.3B staging integration`, is the active P0.3B.2 PR.
  Its previous checks were green but stale before the latest current-main
  refresh. Checks must rerun after this branch is pushed.
- PR #3 is superseded by PR #4.
- PR #1 is unrelated and out of scope.

## Preserved Worktrees

- `/Users/manishh/Desktop/Shri AI`: P0.3B.1 worktree, not modified by this
  continuation.
- `/Users/manishh/Desktop/Shri AI P0.1 Clean`: P0.1 worktree, not modified.
- `/Users/manishh/Desktop/Shri AI P0.2 Clean`: P0.2 worktree, not modified.
- `/Users/manishh/Desktop/ShriAI-p0-3a`: P0.3A worktree, not modified.
- `/Users/manishh/Desktop/ShriAI-p0-baseline`: main/source-archive worktree,
  not modified by this P0.3B.2 continuation.

## Changed Files and Purpose

- P0.3B/P0.3B.1 auth files: Supabase SSR clients, server-only admin client,
  callback route, logout action, auth arbitration, current actor resolution,
  rollout flags, route migration to `getAuthenticatedUser()`, and tests.
- CI/test environment files: explicit `.env.test`, `test:ci`, `build:ci`,
  `.env.test` runner, and GitHub Actions updates.
- Test database safety files: `check-test-database-url.mjs`,
  `test:db:preflight`, and unit tests for rejecting unsafe test DB targets.
- Documentation: P0.3B.1 certification, P0.3B.2 integration report, Supabase
  migration/staging docs, research decision log, and task ledger.

## No Unrelated Work Entered

The branch contains current `origin/main` plus the P0.3B.2 integration commits.
P0.2 and source-archive safety changes are inherited only through
`origin/main`. The net PR diff remains limited to P0.3B.2 auth, Supabase,
route, test, CI/test-environment, research, staging, and task documentation.
No landing-page visual changes, Resend API sending, Inngest jobs, Pinecone
ingestion/queries, PostHog capture, Sentry capture, hosted LLMs, notification
outbox, product features, generated source archives, or real env files are
introduced by P0.3B.2.

## CI and Test Environment Strategy

- `npm run build` remains the normal production build command and requires real
  production configuration.
- `npm run test:ci` and `npm run build:ci` use
  `scripts/run-with-test-env.mjs` to load tracked `.env.test` placeholders.
- `dotenv` is loaded with `override: false`, so CI-provided variables take
  precedence over placeholders.
- `.env.test` contains only safe placeholders for `AUTH_SECRET` and
  `DATABASE_URL`; it is not a production runtime file.
- No runtime, package script, or test setup uses `SKIP_ENV_VALIDATION`.
- Package scripts do not use shell `source` commands.

## Test Database Safety Design

- Unit tests use mocks and must not require database connectivity.
- Database integration checks require explicit `TEST_DATABASE_URL`.
- GitHub Actions owns the disposable CI Postgres lifecycle and sets
  `DATABASE_URL` and `TEST_DATABASE_URL` to the same `shri_ai_ci` database.
- `scripts/check-test-database-url.mjs` rejects missing required
  `TEST_DATABASE_URL`, production-like hostnames, ambiguous database names, and
  drift where `DATABASE_URL` differs from `TEST_DATABASE_URL`.
- Local database checks fail safely when `TEST_DATABASE_URL` is absent.
- Production `DATABASE_URL` must never be used by tests.

## Research Decision Log

`docs/research/SHRI_AI_DECISION_LOG.md` is created and maintained as the
provider/security decision log. It records Supabase SSR/Auth, staging rollout,
and future notification architecture decisions with source organization, title,
URL, date checked, rationale, validation evidence, and rollback trigger.

## Manual Staging Checklist

`docs/security/SUPABASE_AUTH_STAGING_CUTOVER.md` contains the required human
staging checklist. Items remain pending unless actual human evidence is
supplied. This branch does not claim the staging rollout has been manually
completed.

## P0.3C Block

P0.3C remains blocked until P0.3B.2 is merged, CI is reproducible without real
env files, no test can use production `DATABASE_URL`, human Supabase staging
evidence is complete, and no unresolved auth/session conflict findings remain.
No Resend API sending, Inngest jobs, Pinecone ingestion/queries, PostHog
capture, Sentry capture, hosted LLMs, or notification outbox work is included in
P0.3B.2.

## Validation Evidence

- `npm run secrets:check`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run prisma:generate`: passed.
- `npx prisma validate`: passed.
- `npm run test -- scripts/evaluate-scripture-retrieval.test.ts`: passed, 1
  file / 1 test.
- `npm run test`: passed, 54 files / 278 tests.
- `npm run test:ci`: passed, 54 files / 278 tests.
- `npm run build:ci`: passed.
- `npm audit --audit-level=high`: passed with 1 low and 3 moderate advisories.
- `npm run test:db:preflight` without `TEST_DATABASE_URL`: failed safely with
  the expected prerequisite message.
- `TEST_DATABASE_URL=postgresql://test:test@localhost:5432/shri_ai_test?schema=public DATABASE_URL=postgresql://test:test@localhost:5432/shri_ai_test?schema=public npm run test:db:preflight`:
  passed.
- `git ls-files -- .env .env.local .env.production .env.development`: no
  tracked real env files.
- `rg -n "SKIP_ENV_VALIDATION" .`: only documentation and assertion references;
  no runtime, package script, or setup bypass.
- `git diff --check`: passed.
- Final hosted CI evidence is pending until PR #4 is pushed and checks rerun.
