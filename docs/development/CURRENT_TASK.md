# Current Task: P0.3B.2 - Integration Recovery and Staging Certification

## Objective

Integrate the controlled Supabase Auth staging work from P0.3B/P0.3B.1 onto
current `origin/main`, add deterministic CI/test environment controls and test
database safety, maintain the research decision log, and document staging
certification without starting P0.3C.

## Verified Current Flow

- Worktree: `/Users/manishh/Desktop/Shri AI P0.3B.2`.
- Branch: `codex/p0-3b-2-integration-staging-certification`.
- Current `origin/main`: `68c521a Merge pull request #6 from
manishsoni-dev/codex/source-archive-safety-correction`.
- Branch head before the latest main merge:
  `ea723cd docs: record p0.3b.2 stale main state`.
- Previous branch head before this continuation:
  `fbf987f docs: refresh p0.3b.2 certification topology`.
- Merge base with current `origin/main` before this continuation: `cbade94`.
- Worktree state before this continuation: `git status --short` clean.
- `git diff --stat` and `git diff` before this continuation had no output.
- PR #4 is the active P0.3B.2 PR. Its prior checks were green, but stale after
  PR #5 and PR #6 moved `origin/main`.
- `git diff --name-status origin/main...HEAD` before the latest main merge was
  limited to P0.3B.2 auth, Supabase, route, test, CI/test-environment, and
  documentation files.
- The latest merge from `origin/main` conflicted only in this task ledger. The
  conflict was caused by current-main source-archive task bookkeeping, not by
  runtime code.

## Scope

- Integrate reviewed P0.3A/P0.3B.1 Supabase Auth staging changes.
- Add deterministic `test:ci` and `build:ci` scripts using tracked safe
  `.env.test` placeholders.
- Add `TEST_DATABASE_URL` safety rules that reject production-like database
  targets and DATABASE_URL drift.
- Maintain `docs/research/SHRI_AI_DECISION_LOG.md`.
- Maintain `docs/security/SUPABASE_AUTH_STAGING_CUTOVER.md` without marking
  manual staging items complete without evidence.
- Update P0.3B.2 docs and PR #4 after merging current `origin/main`.

## Out-Of-Scope Work

- No P0.3C.
- No landing-page visual work.
- No Resend API email sending, Inngest jobs, Pinecone ingestion/queries,
  PostHog capture, Sentry capture, hosted LLMs, or product features.
- No real `.env`, `.env.local`, `.env.production`, or `.env.development` files.
- No mutation or deletion of sibling worktrees.
- No history rewriting or force-push.
- Do not use Replit unless a concrete Replit app import, deploy, or update task
  is provided.

## Decisions

- Keep PR #4 as the active P0.3B.2 integration vehicle and refresh it with a
  normal merge from current `origin/main`.
- Preserve current-main P0.2 and source-archive safety work as inherited main
  history, not as new P0.3B.2 scope.
- Keep production runtime env validation strict; use explicit `.env.test`
  placeholder loading only for `test:ci` and `build:ci`.
- Require explicit disposable `TEST_DATABASE_URL` for database integration
  checks.

## Acceptance Criteria

- Branch contains current `origin/main` without rebase or force-push.
- Net branch diff remains limited to P0.3B.2 auth, Supabase, CI/test env,
  database-safety, research, staging-certification, and task documentation.
- No runtime, package script, or test setup uses `SKIP_ENV_VALIDATION`.
- `.env.test` contains only safe placeholders required by `src/env.ts`.
- `npm run test:ci` and `npm run build:ci` load `.env.test` without overriding
  real CI-provided environment variables.
- `TEST_DATABASE_URL` checks fail safely when absent or production-like.
- PR #4 hosted CI passes after current-main refresh.
- Human Supabase staging checklist remains pending unless actual evidence is
  supplied.

## Files Expected To Change

- `.env.test`
- `.github/workflows/ci.yml`
- `.gitignore`
- `docs/development/CURRENT_TASK.md`
- `docs/development/P0_3B_2_INTEGRATION.md`
- `docs/development/P0_3B_CERTIFICATION.md`
- `docs/research/SHRI_AI_DECISION_LOG.md`
- `docs/security/SUPABASE_AUTH_MIGRATION.md`
- `docs/security/SUPABASE_AUTH_STAGING_CUTOVER.md`
- `package.json`
- `scripts/run-with-test-env.mjs`
- `scripts/check-test-database-url.mjs`
- P0.3B/P0.3B.1 auth, Supabase, route, and tests.

## Files That Must Remain Unchanged

- Real `.env`, `.env.local`, `.env.production`, and `.env.development` files.
- P0.1/P0.2/P0.3A/P0.3B.1/source-archive sibling worktrees.
- Runtime artifacts, generated archives, logs, uploads, databases,
  `node_modules`, and `.next`.

## Tests Required

- Auth arbitration and route certification tests.
- Client/server Supabase boundary tests.
- CI env placeholder loading tests.
- Test database safety preflight tests.
- Research/staging docs review for pending human evidence.
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
npm run test:db:preflight
git diff --check
git status --short
```

Database integration checks must run only with an explicit disposable
`TEST_DATABASE_URL`; the no-`TEST_DATABASE_URL` preflight must fail safely.

## Implementation Log

### What Was Implemented

- Verified PR #4 was open and previously green but stale after P0.2 and
  source-archive safety merged into `origin/main`.
- Started a normal merge of current `origin/main` into the existing P0.3B.2
  branch.
- Resolved the only merge conflict in this task ledger by restoring the active
  P0.3B.2 task state while inheriting current-main P0.2/source-archive changes.
- Made the inherited scripture eval fail-fast regression test deterministic
  under the full P0.3B.2 suite by adding an explicit child-process timeout and
  Vitest timeout while preserving the `LOCAL_AI_UNAVAILABLE` and no-artifact
  assertions.

### Files Changed

- `docs/development/CURRENT_TASK.md`
- `docs/development/P0_3B_2_INTEGRATION.md`
- `scripts/evaluate-scripture-retrieval.test.ts`
- Current-main inherited files from PR #5 and PR #6 are part of the merge
  history, not new P0.3B.2 scope.

### Decisions Made

- Continue PR #4 instead of opening a duplicate P0.3B.2 PR.
- Keep the manual Supabase staging checklist pending until human evidence is
  provided.

### Tests Run

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

### Checks Passed

- Pre-merge worktree inspection passed.
- Current-main merge completed with only the task-ledger conflict.
- Required local validation passed.
- Database preflight fails safely when no `TEST_DATABASE_URL` is provided and
  accepts an explicit disposable matching test URL.

### Checks Failed

- `npm run test` and `npm run test:ci` initially failed because
  `scripts/evaluate-scripture-retrieval.test.ts` exceeded Vitest's default 5s
  timeout after the current-main merge. The test now has explicit timeouts and
  passes while preserving the same failure assertions.

### Remaining Blockers

- PR #4 needs validation, push, hosted CI, and merge.
- Human Supabase staging checklist evidence is still not supplied.
- P0.3C remains blocked.

### Recommended Next Task

- Complete the merge, rerun validation, push PR #4, wait for hosted CI, and
  merge P0.3B.2 only if the refreshed checks pass.
