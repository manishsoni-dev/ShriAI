# Current Task: P0.3B.1 - Auth Cutover Certification Fixes

## Objective

Remove the global test environment-validation bypass, use safe test-only
placeholders, repair mocks and tests affected by the Auth.js to
`getAuthenticatedUser()` cutover, and certify the Supabase/Auth.js arbitration
without starting P0.3C or activating dormant managed services.

## Verified Current Flow

- Branch is `codex/p0-3b-1-auth-certification`.
- Out-of-scope archive/Caddy commit `2b88e69` was reverted with `cf8c082`,
  returning this branch to P0.3B.1 auth-certification scope.
- `tests/setup.ts` now loads `.env.test` through `dotenv`; it does not set a
  global environment-validation bypass.
- `.env.test` contains only safe placeholders required by `src/env.ts`:
  `AUTH_SECRET` and `DATABASE_URL`.
- `getAuthenticatedUser()` arbitrates between Supabase and Auth.js:
  - missing Supabase session can fall back to Auth.js;
  - invalid Supabase session is denied and clears sessions;
  - unlinked Supabase session is denied;
  - conflicting Supabase/Auth.js identities are denied and clear sessions;
  - linked Supabase identity wins when it matches the legacy session.
- Protected product surfaces now import `getAuthenticatedUser as auth` instead
  of importing Auth.js directly.
- Actual route inventory confirms there are no `saved` or `settings` routes in
  this branch; certification docs record those requested surfaces as not
  present rather than inventing coverage.
- `npm run build` without any environment still fails strict validation because
  production builds do not load `.env.test`; exporting the same safe
  placeholders from `.env.test` makes the build pass.
- `npx prisma migrate status` cannot complete against the safe placeholder
  database URL because no local Postgres test database is running.

## Scope

- Test environment setup.
- Auth resolver/session arbitration and tests.
- Supabase callback and unified logout hardening tests.
- Broken Vitest mocks caused by protected surfaces switching from Auth.js to
  `getAuthenticatedUser()`.
- Static/runtime-boundary tests proving no Supabase secret or dormant provider
  runtime reaches active browser/auth paths.
- P0.3B certification and staging checklist documentation.

## Out-Of-Scope Work

- No P0.3C.
- No Resend API notifications.
- No Inngest, Pinecone, PostHog, Sentry, or hosted LLM activation.
- No Supabase rollout flag enablement.
- No creation, linking, backfill, modification, or deletion of real Supabase
  users.
- No real `.env` or `.env.local` copying, printing, inspecting, or committing.

## Decisions

- `.env.test` is intentionally tracked and contains safe placeholders only.
- `scripts/check-secret-containment.mjs` treats `.env.test` like
  `.env.example`: allowed when placeholder-only, still scanned for secret
  patterns.
- Invalid Supabase sessions are distinct from missing Supabase sessions.
  Missing sessions preserve legacy Auth.js compatibility; invalid sessions deny
  access and trigger unified logout.
- Unified logout continues to Auth.js sign-out even if Supabase sign-out fails.

## Acceptance Criteria

- No executable global environment-validation bypass remains.
- Full Vitest suite passes without the bypass.
- Safe `.env.test` placeholders satisfy test-time schema validation.
- Broken mocks from `auth()` replacement are repaired.
- Tests prove invalid/unlinked Supabase denial, conflicting-session denial,
  legacy Auth.js fallback, Supabase secret browser isolation, and dormant
  managed-service non-activation.
- Required validation commands pass or blockers are documented truthfully.
- Commit only the P0.3B.1 certification repair on this branch.

## Files Expected To Change

- `.env.test`
- `.gitignore`
- `docs/development/CURRENT_TASK.md`
- `docs/development/P0_3B_CERTIFICATION.md`
- `docs/security/SUPABASE_AUTH_STAGING_CUTOVER.md`
- `scripts/check-secret-containment.mjs`
- `src/app/actions/logout.ts`
- `src/app/actions/logout.test.ts`
- `src/app/api/auth/supabase/callback/route.test.ts`
- `src/lib/auth/current-actor.ts`
- `src/lib/auth/current-actor.test.ts`
- `src/lib/auth/get-authenticated-user.ts`
- `src/lib/supabase/health.ts`
- `tests/lib/auth/get-authenticated-user.test.ts`
- `tests/setup.ts`
- `tests/supabase-security.test.ts`
- Existing P0.3B cutover files and mocks already dirty in this branch.

## Files That Must Remain Unchanged

- Real `.env*` files other than the safe tracked `.env.test`.
- Production database schema.
- Product UI and non-auth product behavior.
- Dormant managed-service runtime implementations.

## Tests Required

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
- `git status --short`

## Verification Commands

```bash
git status --short
git branch --show-current
git log --oneline -10
git diff --stat
git diff
git diff --check
git ls-files -- .env .env.local .env.production .env.development
git log --all -- .env .env.local .env.production .env.development
npm run secrets:check
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm audit --audit-level=high
npm run prisma:generate
npx prisma validate
npx prisma migrate status
git diff --check
git status --short
```

## Implementation Log

### What Was Implemented

- Removed the executable global test env-validation bypass and replaced it with
  `.env.test` loading in `tests/setup.ts`.
- Added safe tracked `.env.test` placeholders for `AUTH_SECRET` and
  `DATABASE_URL`.
- Updated secret containment to allow and scan placeholder-only `.env.test`.
- Repaired protected-route tests to mock `getAuthenticatedUser()`.
- Added `SUPABASE_AUTH_SESSION_INVALID` so invalid Supabase sessions deny
  access while missing Supabase sessions can still use legacy Auth.js.
- Added callback tests for missing code, fixed redirects, failed exchanges,
  unconfirmed email, legacy-email collision, idempotent linked subjects, and
  new confirmed subject provisioning.
- Added unified logout tests, including Supabase-not-configured and Supabase
  sign-out failure behavior.
- Added security tests proving dormant Resend, Inngest, Pinecone, PostHog, and
  Sentry provider runtimes are not activated by active auth cutover files.
- Added product-events route tests covering anonymous landing-page events,
  denial for protected events without a resolved user, and ignoring
  browser-supplied user identifiers.
- Added static route-cutover certification tests proving migrated protected
  surfaces import `getAuthenticatedUser`, direct Auth.js imports are limited to
  owned auth boundary files, and absent saved/settings routes are documented.
- Updated `docs/development/P0_3B_CERTIFICATION.md` with a route coverage
  matrix and remaining staging checks.

### Files Changed

- Pending final staged list.

### Decisions Made

- Keep `.env.test` safe and tracked instead of copying real local env files.
- Keep strict env validation active in tests, build, and production.
- Use safe placeholder env exports for local `next build` verification because
  Next production builds do not load `.env.test` automatically.

### Tests Run

- `npm run test -- src/lib/auth/current-actor.test.ts tests/lib/auth/get-authenticated-user.test.ts src/app/actions/logout.test.ts src/app/api/auth/supabase/callback/route.test.ts tests/supabase-security.test.ts src/lib/providers/providers.test.ts`:
  passed, 6 files / 53 tests.
- `npm run test -- src/app/api/events/route.test.ts src/app/api/auth/supabase/callback/route.test.ts tests/supabase-security.test.ts tests/lib/auth/get-authenticated-user.test.ts src/lib/auth/current-actor.test.ts`:
  passed, 5 files / 53 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test`: passed, 52 files / 270 tests.
- `npm audit --audit-level=high`: passed; low/moderate advisories remain.
- `npm run secrets:check`: passed.
- `npm run prisma:generate`: passed.
- `npx prisma validate`: passed.
- `git diff --check`: passed.
- `set -a; source .env.test; set +a; npm run build`: passed.

### Checks Passed

- No executable environment-validation bypass remains.
- Full suite passes without the bypass.
- Safe placeholder env supports tests and build verification.
- Secret containment still passes with tracked `.env.test` allowed and scanned.

### Checks Failed

- `npm run build` without any environment failed because strict env validation
  requires `AUTH_SECRET` and `DATABASE_URL`; `.env.test` is not loaded by Next
  production builds.
- `set -a; source .env.test; set +a; npx prisma migrate status` failed with
  `Error: Schema engine error:` because no local Postgres test database is
  serving at `localhost:5432`.

### Remaining Blockers

- Final staging/commit still pending.
- If strict local `npm run build` with no shell env is required, the environment
  must provide safe build-time values or real deployment values without using a
  validation bypass.

### Recommended Next Task

- Stage explicit P0.3B.1 files only, rerun final diff/status checks, commit on
  `codex/p0-3b-1-auth-certification`, then open or push according to release
  workflow.
