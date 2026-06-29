# Current Task: Build Gate Safe Environment

## Objective

Close the remaining clean-integration repo-local gate by making raw
`npm run build` reproducible without real `.env` files while keeping runtime
environment validation strict.

## Verified Current Flow

- Worktree: `/Users/manishh/Desktop/ShriAI-p0-baseline`.
- Branch: `codex/build-gate-safe-env`.
- Branch was created from merged `main` after P0.3B.2 and P1.0 backlog capture.
- Required inventory from `main` before this branch:
  - `git status --short`: clean.
  - `git diff --name-only`: no output.
  - `git diff --stat`: no output.
  - `git diff --check`: passed.
  - `git ls-files -- .env .env.local .env.production .env.development`: no
    tracked real env files.
  - `git log --all -- .env .env.local .env.production .env.development`: no
    output.
- `npm ci`: passed and restored missing P0.3B.2 dependencies from lockfile.
- `npm run prisma:generate`: passed after dependency refresh.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed after Prisma generation.
- `npm audit --audit-level=high`: passed with 1 low and 3 moderate advisories.
- `npm run test`: passed, 54 files / 278 tests.
- `npm run build`: failed during Next page-data collection because
  `AUTH_SECRET` and `DATABASE_URL` are intentionally absent and no real env file
  is used.
- Next documentation in `node_modules/next/dist/docs` confirms the production
  build phase string is `phase-production-build`.

## Scope

- Add build-phase-only safe placeholders for `AUTH_SECRET` and `DATABASE_URL`.
- Prove missing runtime env still fails outside `phase-production-build`.
- Preserve strict production runtime validation.
- Update task ledger.

## Out-Of-Scope Work

- Do not change deployed runtime requirements.
- Do not add real env files or secrets.
- Do not start P0.3A or P0.3C.
- Do not add Resend API emails, Inngest jobs, Pinecone ingestion/queries,
  PostHog capture, Sentry capture, hosted LLMs, notification outbox work, or
  product features.
- Do not use Replit unless a concrete Replit app action is provided.

## Decisions

- Use `process.env.NEXT_PHASE === "phase-production-build"` as the only
  condition for local build placeholders.
- Keep placeholders local, obvious, and non-production.
- Add dynamic import tests so this does not become a broad validation bypass.

## Acceptance Criteria

- Raw `npm run build` passes without real `.env` files.
- Missing `AUTH_SECRET` and `DATABASE_URL` still fail outside Next production
  build phase.
- `npm run test` remains passing.
- No real env files are tracked or read.
- Required clean-integration checks pass.

## Files Expected To Change

- `docs/development/CURRENT_TASK.md`
- `src/env.ts`
- `tests/env-build-placeholders.test.ts`

## Files That Must Remain Unchanged

- Real `.env`, `.env.local`, `.env.production`, and `.env.development` files.
- Auth/session behavior files unless directly required by validation.
- Runtime provider integrations.

## Tests Required

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm audit --audit-level=high`
- `npm run prisma:generate`
- `npx prisma validate`
- `git diff --check`
- `git status --short`

## Verification Commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm audit --audit-level=high
npm run prisma:generate
npx prisma validate
git diff --check
git status --short
```

## Implementation Log

### What Was Implemented

- Added build-phase-only safe placeholders for `AUTH_SECRET` and
  `DATABASE_URL` in `src/env.ts`.
- Added child-process tests proving `phase-production-build` can import
  `src/env.ts` without real secrets, empty build-time values use the same safe
  placeholders, and ordinary runtime imports still reject missing `AUTH_SECRET`
  and `DATABASE_URL`.

### Files Changed

- `docs/development/CURRENT_TASK.md`
- `src/env.ts`
- `tests/env-build-placeholders.test.ts`

### Decisions Made

- Keep raw `npm run build` reproducible without real `.env` files by limiting
  placeholders to `process.env.NEXT_PHASE === "phase-production-build"`.
- Do not change runtime env requirements, test setup, provider integrations, or
  CI placeholder loading.
- In the child-process regression test, support both the ESM named export and
  the CommonJS-style default getter because hosted Node 22 surfaced the
  `src/env.ts` export through the default object.

### Tests Run

- `npm run test -- tests/env-build-placeholders.test.ts`: passed, 1 file / 3
  tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed after tightening the child-process test helper
  type.
- `npm run test`: passed, 55 files / 281 tests.
- `npm run build`: passed with no real env files.
- `npm run secrets:check`: passed.
- `npm audit --audit-level=high`: passed with 1 low and 3 moderate advisories.
- `npm run prisma:generate`: passed.
- `npx prisma validate`: passed.
- `npm run test:ci`: passed, 55 files / 281 tests.
- `npm run build:ci`: passed.
- Hosted PR #8 `build-and-test`: first run failed in
  `tests/env-build-placeholders.test.ts` because Node 22 exposed `src/env.ts`
  through the default getter instead of the named namespace property; test
  helper updated and local affected checks rerun.
- `npm run test:db:preflight`: failed safely because `TEST_DATABASE_URL` was
  absent.
- `TEST_DATABASE_URL=postgresql://test:test@localhost:5432/shri_ai_test?schema=public DATABASE_URL=postgresql://test:test@localhost:5432/shri_ai_test?schema=public npm run test:db:preflight`:
  passed.
- `npx prisma migrate status`: failed safely because no `DATABASE_URL` was set.
- `DATABASE_URL=postgres://test:test@localhost:5432/shri_ai_test npx prisma migrate status`:
  connected to the safe local test database and reported unapplied migrations.
- `git diff --check`: passed.
- `git status --short`: showed only intended task files.

### Checks Passed

- Raw `npm run build` now passes without real env files.
- Runtime missing-env validation remains enforced outside Next production build
  phase.
- Full unit suite and deterministic CI scripts pass.
- Secret containment check passes.
- No real `.env`, `.env.local`, `.env.production`, or `.env.development` files
  are tracked.

### Checks Failed

- Raw `npm run build` failed before the fix because strict env validation
  required absent `AUTH_SECRET` and `DATABASE_URL` during Next production build.
- `npm run test:db:preflight` without `TEST_DATABASE_URL` failed safely by
  design.
- `npx prisma migrate status` without `DATABASE_URL` failed safely by design.
- `DATABASE_URL=postgres://test:test@localhost:5432/shri_ai_test npx prisma migrate status`
  reported unapplied migrations in the local safe test database.

### Remaining Blockers

- Manual external secret rotation and old shared ZIP removal remain
  maintainer-owned.
- The local safe test database needs migrations applied before
  `prisma migrate status` can be green against that database.

### Recommended Next Task

- Apply migrations to the disposable local test database if local migration
  status is required, then collect human Supabase staging evidence. Do not start
  P0.3C until the staging exit gate is satisfied.
