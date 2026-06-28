# Current Task: P0.3A — Supabase Auth Foundation and Safe Migration Scaffold

## Objective

Implement the Supabase Auth client boundaries, server-only current-actor
resolver, internal migration states, safe health states, migration
documentation, and comprehensive security tests — without cutting over live
authentication, creating Supabase users, migrating passwords, or activating any
managed external service.

## Verified Current Flow

- Auth.js is the production auth path (unchanged).
- `User.supabaseAuthUserId String? @unique @db.Uuid` exists in the Prisma schema
  (applied in P0.2.1).
- P0.1, P0.2, P0.2.1, and the baseline verification were merged into `main`.
- This branch (`codex/p0-3a-supabase-auth-foundation`) was created from merged
  `main` and contains only P0.3A scope additions.

## Scope

- `src/lib/supabase/browser.ts`: Browser-safe client (public keys only).
- `src/lib/supabase/server.ts`: Server-side client with cookie management.
- `src/lib/supabase/proxy.ts`: Middleware proxy client.
- `src/lib/supabase/admin.ts`: Server-only admin client (secret key only).
- `src/lib/supabase/health.ts`: Health state constants.
- `src/lib/auth/current-actor.ts`: Server-only actor resolver.
- `src/lib/auth/migration-state.ts`: Internal migration state types.
- `src/lib/supabase/client-boundaries.test.ts`: Config and admin isolation tests.
- `src/lib/auth/current-actor.test.ts`: Actor resolver unit tests.
- `tests/supabase-security.test.ts`: Comprehensive security boundary tests.
- `docs/security/SUPABASE_AUTH_MIGRATION.md`: Full migration documentation.
- `docs/development/CURRENT_TASK.md`: This file.

## Out-Of-Scope Work

- No live authentication cutover.
- No Auth.js removal or modification.
- No password migration.
- No creation, linking, modification, backfill, or deletion of Supabase Auth users.
- No activation of Resend, Pinecone, Inngest, PostHog, or Sentry.
- No wiring of `getCurrentActor` into active product routes.
- No sign-in UI changes.

## Decisions

- `admin.ts` uses `import "server-only"` to block webpack/Turbopack from
  including it in browser bundles. This causes a build-time error if imported
  in a Client Component.
- `current-actor.ts` uses `client.auth.getUser()` (server-side JWT validation),
  never `getSession()`, to prevent spoofed claims.
- `migration-state.ts` uses `import "server-only"` to enforce internal-only
  access.
- All clients use lazy initialization (config check before client creation).
- Missing configuration returns `SUPABASE_NOT_CONFIGURED` safely without
  throwing.
- `@ts-expect-error` is used in tests where vitest mock types conflict with the
  strict TypeScript configuration, documented inline.

## Acceptance Criteria

- [x] `src/lib/supabase/browser.ts` — browser client, public keys only.
- [x] `src/lib/supabase/server.ts` — server client, server-only.
- [x] `src/lib/supabase/proxy.ts` — middleware proxy client.
- [x] `src/lib/supabase/admin.ts` — server-only, secret key only.
- [x] `src/lib/supabase/health.ts` — 4 health state constants.
- [x] `src/lib/auth/current-actor.ts` — resolves linked user by supabaseAuthUserId.
- [x] `src/lib/auth/migration-state.ts` — 5 internal states, server-only.
- [x] `docs/security/SUPABASE_AUTH_MIGRATION.md` — all 11 required sections.
- [x] Tests: 243 total tests pass across 48 test files (26 new security tests).
- [x] All pipeline checks pass (secrets, format, lint, typecheck, test, build,
      audit, prisma:generate, prisma validate, prisma migrate status).
- [x] `git diff --check` passes.
- [x] `git status --short` is empty (clean worktree after commit).
- [x] No live auth cutover. No Supabase users created or modified.

## Files Expected To Change

- `src/lib/supabase/browser.ts` ✅ (new)
- `src/lib/supabase/server.ts` ✅ (new)
- `src/lib/supabase/proxy.ts` ✅ (new)
- `src/lib/supabase/admin.ts` ✅ (new)
- `src/lib/supabase/health.ts` ✅ (new)
- `src/lib/auth/current-actor.ts` ✅ (new)
- `src/lib/auth/migration-state.ts` ✅ (new, server-only)
- `src/lib/supabase/client-boundaries.test.ts` ✅ (new)
- `src/lib/auth/current-actor.test.ts` ✅ (new)
- `tests/supabase-security.test.ts` ✅ (new, 26 security tests)
- `docs/security/SUPABASE_AUTH_MIGRATION.md` ✅ (new, comprehensive)
- `docs/development/CURRENT_TASK.md` ✅ (this file)

## Tests Required

- [x] Missing Supabase configuration returns SUPABASE_NOT_CONFIGURED safely.
- [x] Admin client blocked from browser bundles (server-only directive).
- [x] Secret key absent from browser bundle (static analysis of client components).
- [x] Admin client blocked from client component imports.
- [x] Invalid, expired, malformed, spoofed claims rejected (getUser validation).
- [x] Linked subject resolves only its own application user (findUnique by UUID).
- [x] Unlinked subject returns SUPABASE_AUTH_LINK_MISSING, no fallback.
- [x] Cross-user isolation: findUnique (not findFirst) + @unique schema constraint.
- [x] Auth.js sign-in route unchanged (does not reference Supabase).
- [x] Auth.js tests still pass (9 tests in actions.test.ts).
- [x] Health output excludes sensitive data (route test + security test).
- [x] Reviewer authorization tests pass.
- [x] Upload, RAG, voice tests pass (all 47 pre-existing test files pass).
- [x] Migration state is internal-only (not in API handlers).

## Verification Commands

```bash
npm run secrets:check   # ✅ PASS
npm run format:check    # ✅ PASS
npm run lint            # ✅ PASS
npm run typecheck       # ✅ PASS
npm run test            # ✅ PASS (243 tests, 48 files)
npm run build           # ✅ PASS
npm audit --audit-level=high  # ✅ PASS (0 high/critical)
npm run prisma:generate # ✅ PASS
npx prisma validate     # ✅ PASS
npx prisma migrate status  # ✅ PASS (25 migrations, up to date)
git diff --check        # ✅ PASS
git status --short      # ✅ EMPTY (clean)
```

## Implementation Log

### What Was Implemented

**Supabase client boundaries** (`src/lib/supabase/`):

- `browser.ts`: Lazy-initialized browser client using only public env vars.
  Returns `SUPABASE_NOT_CONFIGURED` if env vars are absent.
- `server.ts`: Server-only client with `import "server-only"`, cookie
  management via `next/headers`, lazy initialization.
- `proxy.ts`: Middleware proxy client reading/writing cookies from
  `NextRequest`/`NextResponse`.
- `admin.ts`: Server-only admin client with `import "server-only"`, uses only
  `SUPABASE_SECRET_KEY`, auto-refresh and session persistence disabled.
- `health.ts`: Exports `SUPABASE_NOT_CONFIGURED`, `SUPABASE_UNAVAILABLE`,
  `SUPABASE_AUTH_UNAVAILABLE`, `SUPABASE_AUTH_LINK_MISSING` constants.

**Auth actor resolver** (`src/lib/auth/`):

- `current-actor.ts`: Server-only resolver that validates claims via
  `client.auth.getUser()`, resolves to the linked `User` by
  `supabaseAuthUserId`, returns a minimal safe actor, never falls back on
  unlinked identities.
- `migration-state.ts`: Internal-only `AuthMigrationState` type with 5 states
  (UNLINKED, PROVISIONED, VERIFIED, CUTOVER_READY, DISABLED), guarded by
  `import "server-only"`.

**Tests** (3 test files, 31 total tests):

- `src/lib/supabase/client-boundaries.test.ts`: 2 tests for missing config
  and admin-key isolation.
- `src/lib/auth/current-actor.test.ts`: 3 tests for invalid claims, unlinked
  identities, and valid linked identity resolution.
- `tests/supabase-security.test.ts`: 26 tests (static analysis + design
  verification) covering all P0.3A security requirements.

**Documentation**:

- `docs/security/SUPABASE_AUTH_MIGRATION.md`: 11 sections covering current vs
  target architecture, identity-link model, staged migration plan, rollback,
  recovery/session invalidation, environment separation, Supabase Dashboard
  checklist, redirect URL rules, RLS requirements, secret-key handling, and
  explicit OUT OF SCOPE confirmation.

### Files Changed

- `src/lib/supabase/browser.ts` (new)
- `src/lib/supabase/server.ts` (new)
- `src/lib/supabase/proxy.ts` (new)
- `src/lib/supabase/admin.ts` (new)
- `src/lib/supabase/health.ts` (new)
- `src/lib/supabase/client-boundaries.test.ts` (new)
- `src/lib/auth/current-actor.ts` (new)
- `src/lib/auth/current-actor.test.ts` (new)
- `src/lib/auth/migration-state.ts` (new, updated with server-only)
- `tests/supabase-security.test.ts` (new)
- `docs/security/SUPABASE_AUTH_MIGRATION.md` (new, comprehensive)
- `docs/development/CURRENT_TASK.md` (updated)

### Decisions Made

- Used `import "server-only"` on admin.ts, server.ts, current-actor.ts, and
  migration-state.ts to get build-time enforcement of server/client boundaries.
- Used `client.auth.getUser()` over `getSession()` to prevent spoofed claims.
- Used `findUnique` (not `findFirst`) to leverage the DB uniqueness constraint
  for cross-user isolation.
- Used `@ts-expect-error` (with description) in test mocks where vitest mock
  types conflict with strict TypeScript configuration.
- Made all clients lazily initialized — config check before client creation.

### Tests Run

- `npm run secrets:check`: ✅ PASS
- `npm run format:check`: ✅ PASS (after formatting)
- `npm run lint`: ✅ PASS (0 warnings, 0 errors)
- `npm run typecheck`: ✅ PASS (0 type errors)
- `npm run test`: ✅ PASS (243 tests, 48 files, including 26 new security tests)
- `npm run build`: ✅ PASS (optimized production build)
- `npm audit --audit-level=high`: ✅ PASS (0 high/critical vulnerabilities)
- `npm run prisma:generate`: ✅ PASS
- `npx prisma validate`: ✅ PASS
- `npx prisma migrate status`: ✅ PASS (25 migrations, up to date)
- `git diff --check`: ✅ PASS
- `git status --short`: ✅ EMPTY

### Checks Passed

All required checks passed.

### Checks Failed

None.

### Remaining Blockers

None for P0.3A.

Manual actions (outside agent scope):

- Rotate `AUTH_SECRET` and database credentials as documented in the security
  runbook before any public release.
- Complete Supabase Dashboard setup checklist (Section 7 of
  `SUPABASE_AUTH_MIGRATION.md`) before starting P0.3B.

### Recommended Next Task

**P0.3B: Controlled Supabase Auth Account Creation and Sign-In Cutover**

Prerequisites before starting P0.3B:

1. This P0.3A PR must be reviewed and merged into `main`.
2. Supabase Dashboard setup checklist (Section 7) must be completed for the
   target environment.
3. The P0.3B branch must be created from merged `main`.
4. All P0.3A pipeline checks must pass from a clean worktree on the new branch.
