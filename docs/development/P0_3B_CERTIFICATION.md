# P0.3B.1 Auth Cutover Certification

## Investigation Findings

1. Previous full-suite failures were caused by missing test-safe
   `AUTH_SECRET` and `DATABASE_URL`, stale mocks that still targeted Auth.js
   directly after protected surfaces moved to `getAuthenticatedUser()`, and a
   database-dependent integrity test that tried to query a real database during
   isolated Vitest runs.
2. Test validation now runs through `src/env.ts`; no global validation bypass is
   set in `tests/setup.ts`.
3. `.env.test` contains only safe placeholders:
   - `AUTH_SECRET=test-secret-that-must-be-at-least-thirty-two-chars`
   - `DATABASE_URL=postgres://test:test@localhost:5432/shri_ai_test`
4. Unit tests must not require a real Supabase project, PostgreSQL database,
   Resend key, Pinecone key, Ollama service, browser microphone, PostHog,
   Sentry, or Inngest.
5. The full suite passed with these placeholders loaded by Vitest.

## Route Audit

Routes and actions now using `getAuthenticatedUser()`:

- `src/app/api/chat/stream/route.ts`
- `src/app/api/events/route.ts`
- `src/app/api/voice/transcribe/route.ts`
- `src/app/chat/actions.ts`
- `src/app/chat/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/knowledge/actions.ts`
- `src/app/knowledge/page.tsx`
- `src/app/knowledge/search/page.tsx`
- `src/app/sign-in/page.tsx`
- `src/lib/auth/session.ts`
- `src/lib/scripture-review/reviews.ts`

Auth.js is still used directly only for owned auth boundaries:

- `src/auth.ts`
- `src/proxy.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/sign-in/actions.ts` for legacy credential sign-in
- `src/app/actions/logout.ts` for Auth.js sign-out
- `src/lib/auth/get-authenticated-user.ts` as the legacy fallback resolver

## Authorization Certification

Automated coverage now verifies:

- missing Supabase session can fall back to legacy Auth.js;
- invalid Supabase session denies access and calls unified logout;
- unlinked Supabase session denies access without falling back;
- conflicting Supabase/Auth.js identities deny access and call unified logout;
- matching Supabase/Auth.js identities resolve to the linked Supabase actor;
- legacy Auth.js session still works when no Supabase actor is present;
- Supabase callback ignores arbitrary redirect targets;
- callback rejects missing, expired, failed, or unconfirmed flows safely;
- callback does not auto-link a legacy email collision;
- repeated callback for an already linked Supabase subject is idempotent;
- logout attempts to clear both Supabase and Auth.js sessions and still clears
  Auth.js if Supabase sign-out fails.

## Client/Server Boundary Proof

Automated static checks verify:

- `SUPABASE_SECRET_KEY` is absent from Client Components;
- `src/lib/supabase/admin.ts` is guarded by `server-only`;
- `src/lib/supabase/browser.ts` uses only public Supabase environment values;
- `current-actor.ts` uses server-side `getUser()` and never request/query
  identity fields;
- active auth cutover files do not import or invoke Resend, Inngest, Pinecone,
  PostHog, or Sentry provider runtimes.

## Validation Evidence

- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test`: passed, 51 files / 263 tests.
- `set -a; source .env.test; set +a; npm run build`: passed.
- `npm audit --audit-level=high`: passed; low/moderate advisories remain.
- `npm run secrets:check`: passed.
- `npm run prisma:generate`: passed.
- `npx prisma validate`: passed.
- `git diff --check`: passed.

Notes:

- Plain `npm run build` without any environment failed because strict
  production env validation requires `AUTH_SECRET` and `DATABASE_URL`, and Next
  does not load `.env.test` for production builds.
- `npx prisma migrate status` with `.env.test` failed because the placeholder
  Postgres database is not running locally.

## Explicit Confirmations

- No global environment-validation bypass remains in executable code.
- No real env file was copied, used, printed, inspected, or committed.
- `.env.test` is safe placeholder-only.
- No Supabase rollout flags were enabled by this branch.
- No real Supabase users were created, linked, backfilled, modified, or deleted.
- No Resend API, Inngest, Pinecone, PostHog, or Sentry runtime behavior was
  added or activated.
