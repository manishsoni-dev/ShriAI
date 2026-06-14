# Current Task: Clean-Clone Reproducibility

## Task Objective

Make Shri AI install, generate, test, and build from a clean checkout without hidden machine state, copied dependencies, remote build-time font downloads, or undocumented CI assumptions.

## Current Verified System Flow

- The app uses Next.js App Router with `src/app/layout.tsx` and global CSS in `src/app/globals.css`.
- The Next.js Google-font module has been removed from the root layout.
- Font families are deterministic CSS fallbacks: system sans, system mono, system serif, and locally available Devanagari-capable fonts.
- Prisma uses committed migrations against PostgreSQL with `pgvector`.
- Local readiness scripts verify database connectivity, generated Prisma Client, pgvector, and required tables.
- GitHub Actions CI exists at `.github/workflows/ci.yml` and uses a disposable `pgvector/pgvector:pg16` Postgres service.

## Current Repository State

- Branch: `main`, tracking `origin/main`.
- Worktree is heavily dirty with broad pre-existing modified and untracked work.
- This task preserves existing work and changes only reproducibility metadata, docs, and CI configuration.

## Relevant Files

- `AGENTS.md`
- `README.md`
- `package.json`
- `package-lock.json`
- `.node-version`
- `.npmrc`
- `.github/workflows/ci.yml`
- `next.config.ts`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `prisma/schema.prisma`
- `prisma/migrations/*`
- `src/env.ts`
- `src/auth.ts`
- `src/lib/db.ts`

## Accepted Assumptions

- GitHub Actions is the CI provider for this task.
- System font fallbacks are acceptable instead of self-hosting the original Google font files.
- CI may use placeholder non-secret values for required build-time env validation.
- Provider keys are optional for build/test and must not be required in CI.

## Unresolved Questions

- Whether generated scripture eval run artifacts should be committed, ignored, or normalized remains outside this task unless it blocks `format:check`.
- Whether release readiness should be green is outside this task; current known release blockers are human review and Voice QA gates.

## Exact Scope

In scope:

- Use `npm ci` in clean-clone setup documentation.
- Align Node/npm requirements with dependency engine requirements.
- Keep remote Google Font usage absent.
- Ensure CI runs clean install, Prisma generation/validation, migrations, formatting check, lint, typecheck, tests, build, and DB readiness.
- Run the required verification matrix and record outcomes.

Out of scope:

- Product behavior changes.
- Prisma schema or migration changes.
- Auth/authorization changes.
- Chat/RAG/voice implementation changes.
- Dependency upgrades.
- Visual redesign.
- Git staging, commits, pushes, or PRs.

## Acceptance Criteria

- No Next.js Google-font module usage remains.
- Clean-clone setup uses `npm ci`.
- CI pipeline exists and mirrors the clean-clone command sequence.
- Required verification commands pass, or remaining failures are documented as blockers.
- Existing uncommitted work is preserved.
- No secrets are exposed.

## Edge Cases

- `engine-strict=true` should fail early on unsupported Node/npm versions.
- CI must set only safe placeholder env values required for build-time validation.
- `db:ready` requires a migrated pgvector database.
- `format:check` may fail on pre-existing formatting drift; do not run `format` unless explicitly requested.

## Security Requirements

- Do not print, commit, or copy `.env` or `.env.local` secret values.
- Do not depend on copied `node_modules`, `.next`, caches, or generated Prisma artifacts.
- Do not configure live AI, STT, or TTS provider keys in CI.
- Preserve server-side auth and data access behavior unchanged.

## Exact Files Expected To Change

- `README.md`
- `docs/development/CURRENT_TASK.md`
- `.github/workflows/ci.yml`
- `.node-version`
- `package.json`

## Files That Should Remain Unchanged

- `prisma/schema.prisma`
- `prisma/migrations/*`
- `src/auth.ts`
- `src/proxy.ts`
- `src/lib/conversations.ts`
- `src/app/api/chat/stream/route.ts`
- `src/lib/rag/*`
- `src/app/api/voice/*`
- Generated dependencies and caches
- Local env files

## Tests Required

- `npm ci`
- `npm run prisma:generate`
- `npx prisma validate`
- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run db:ready`
- `git diff --check`
- `git status --short`

## Commands Required For Verification

```bash
npm ci
npm run prisma:generate
npx prisma validate
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run db:ready
git diff --check
git status --short
rg "<remote-font-import>|<non-lockfile-install-command>" src README.md package.json .github docs
```

## Implementation Completed

- Updated clean-clone setup docs to use `npm ci`.
- Added runtime requirements documenting Node `20.19.0` or newer, npm `10.0.0` or newer, and `engine-strict=true`.
- Documented clean-clone verification and CI command order in `README.md`.
- Added a CI-only placeholder `AUTH_SECRET` so build-time env validation can run in GitHub Actions without real secrets.
- Pinned `.node-version` to `20.19.0`.
- Tightened `package.json` Node engine to `>=20.19.0`.
- Confirmed no remote Google-font import usage remains in `src`.

## Files Changed

- `README.md`
- `docs/development/CURRENT_TASK.md`
- `.github/workflows/ci.yml`
- `.node-version`
- `package.json`

## Migrations Added

None.

## Decisions Made

- Pin `.node-version` to `20.19.0` so the Node pin is compatible with Vite's `^20.19.0 || >=22.12.0` engine range.
- Keep npm requirement at `>=10.0.0`.
- Use `npm ci` for reproducible clean-clone dependency installation.
- Use a CI-only placeholder `AUTH_SECRET` because `src/env.ts` requires it at build time.

## Checks Passed

- `npm ci`: passed. Reported 5 moderate npm audit findings; no force fix or dependency upgrade was run because dependency upgrades are out of scope.
- `npm run prisma:generate`: passed.
- `npx prisma validate`: passed.
- `npm run format:check`: passed.
- Remote-font/non-lockfile install search: passed with no matches in `src`,
  `README.md`, `package.json`, `.github`, or `docs`.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test`: passed, 11 test files and 54 tests.
- `npm run build`: passed with Next.js 16.2.6 and Turbopack.
- `npm run db:ready`: passed against local PostgreSQL with pgvector.
- `npm run db:check`: passed against local PostgreSQL with pgvector.
- `git diff --check`: passed.
- `git status --short`: ran and still shows the broad pre-existing dirty worktree plus this task's scoped files.

## Checks Failed

None for the required clean-clone reproducibility matrix.

## Remaining Blockers

- No blocker for this scoped task.
- Out-of-scope known release blockers remain: human voice-approved scripture coverage, completed staging Voice QA, and reviewer/admin allowlist env.
- Out-of-scope npm audit note: `npm ci` reports 5 moderate dependency vulnerabilities.

## Recommended Next Action

Update the Notion Prompt 2 page with this validation summary, then move to the next ordered roadmap task.
