# Supabase Auth Migration & Identity Architecture

This document describes the identity architecture, migration strategy, security
policies, and operational runbooks for the phased migration from Auth.js to
Supabase Auth.

> **Scope of P0.3A**: This document covers design and infrastructure only.
> Password migration and live auth cutover are **OUT OF SCOPE** for P0.3A.
> No Supabase Auth users are created, linked, modified, or deleted during
> this phase.

---

## 1. Current vs. Target Identity Architecture

### Current (Auth.js — Production Path)

```
Browser → Auth.js Credentials / OAuth → NextAuth Session → User.id (Prisma)
```

- Auth.js issues and validates session JWTs.
- The application identifies the user by `User.id` from Prisma.
- All authorization decisions use `User.id` from the server-side Auth.js session.
- No browser-submitted identity is trusted.

### Target (Supabase Auth — Future Path, not yet active)

```
Browser → Supabase Auth → Supabase JWT (sub = UUID) → User.supabaseAuthUserId → User.id (Prisma)
```

1. Supabase issues a signed JWT with a `sub` claim (UUID).
2. The server validates the JWT via `client.auth.getUser()` (never `getSession()`).
3. The UUID subject is resolved to the linked `User` via the unique
   `User.supabaseAuthUserId` field.
4. All authorization decisions use the resolved `User.id`.
5. **At no point does the server trust a user-submitted UUID or identity claim.**

---

## 2. Identity Link Model: `User.supabaseAuthUserId`

The Prisma `User` model contains a nullable, unique, UUID-typed field:

```prisma
supabaseAuthUserId String? @unique @db.Uuid
```

**Rules:**

- This field is the **only** secure link between a Supabase user and application data.
- It must be `null` until a verified link is established (never pre-populated).
- It is set by the backend only, never from browser-submitted input.
- The `@unique` constraint prevents one Supabase user from being mapped to
  multiple application users.
- The `@db.Uuid` constraint enforces UUID format at the database level.

---

## 3. Staged Migration Plan

The migration proceeds through internal state flags defined in
`src/lib/auth/migration-state.ts`. These states are **internal-only** and are
never surfaced in API responses to ordinary users.

| State           | Meaning                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| `UNLINKED`      | The app user has no `supabaseAuthUserId`.                               |
| `PROVISIONED`   | A Supabase account has been created but the user has not yet signed in. |
| `VERIFIED`      | The user has signed in via Supabase and the link is confirmed.          |
| `CUTOVER_READY` | All active users have reached `VERIFIED` state.                         |
| `DISABLED`      | Legacy Auth.js authentication has been disabled.                        |

**Phase gating:**

- P0.3A (current): Foundation only. No accounts created.
- P0.3B: Controlled Supabase Auth account creation and sign-in cutover for a
  subset of users.
- P0.3C: Full cutover after `CUTOVER_READY` is confirmed for all active users.

---

## 4. Rollback Procedure

If the Supabase Auth cutover introduces regressions at any phase:

1. **Feature-flag rollback**: Toggle the auth resolver back to the Auth.js path.
   No code deployment is required if this is a runtime flag.
2. **Auth.js sessions remain valid**: Auth.js tokens are unaffected by Supabase
   operations. Users remain signed in.
3. **No data loss**: Prisma `User` records are never deleted by the migration.
   The `supabaseAuthUserId` field may be cleared if needed without affecting
   other user data.
4. **Session isolation**: Auth.js and Supabase Auth operate independently; a
   rollback does not require Supabase session invalidation.

---

## 5. Recovery and Session Invalidation

### Auth.js Session Invalidation (Current)

- Rotate `AUTH_SECRET` to invalidate all existing Auth.js sessions simultaneously.
- Individual sessions can be invalidated by deleting the `Session` record from
  the database.

### Supabase Session Invalidation (Future — after cutover)

- To invalidate a single user's Supabase sessions: use the Admin API
  (`supabase.auth.admin.signOut(userId)`) from a server-only context.
- To invalidate all sessions: rotate the `JWT secret` in the Supabase project
  settings (Supabase Dashboard → Project Settings → API → JWT Secret).
- The admin client in `src/lib/supabase/admin.ts` is the only authorized
  location for admin-level session operations.

---

## 6. Environment Separation (Local / Staging / Production)

Each environment must have a **completely isolated** Supabase project.

| Variable                               | Scope         | Notes                                          |
| -------------------------------------- | ------------- | ---------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Public/Client | Safe to expose; is already public.             |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public/Client | Safe to expose; anon key.                      |
| `SUPABASE_SECRET_KEY`                  | Server-only   | Service role key. **Never expose to browser.** |

- A missing `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  returns `SUPABASE_NOT_CONFIGURED` safely (no crash, no exception).
- A missing `SUPABASE_SECRET_KEY` returns `SUPABASE_NOT_CONFIGURED` from
  the admin client, allowing local development without a live project.

---

## 7. Supabase Dashboard Setup Checklist

Before activating P0.3B, complete these steps per environment:

### Project Setup

- [ ] Create a new Supabase project (Local / Staging / Production are separate).
- [ ] Copy the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`.
- [ ] Copy the **anon/public key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- [ ] Copy the **service_role key** → `SUPABASE_SECRET_KEY` (server env only).

### Authentication Configuration

- [ ] **Authentication → Providers**: Enable only the providers needed.
- [ ] **Authentication → URL Configuration → Site URL**: Set to the environment's
      primary URL (e.g. `https://shriai.app` for production).
- [ ] **Authentication → URL Configuration → Redirect URLs**: Add all valid
      redirect targets:
  - Production: `https://shriai.app/**`
  - Staging: `https://staging.shriai.app/**`
  - Local development: `http://localhost:3000/**`
  - Vercel previews (if applicable): `https://*-shriai.vercel.app/**`
- [ ] **Authentication → Email Templates**: Customize to match Shri AI branding.
- [ ] Disable "Confirm email" for programmatic account creation (P0.3B only).

### Security Hardening

- [ ] **Database → Row Level Security**: Enable RLS on all tables **before** any
      browser-facing Supabase data access is permitted (required for P0.3C).
- [ ] Rotate the JWT secret if the old secret was ever compromised.

---

## 8. Redirect URL Rules

- **Never use open redirects**. All redirect URLs must be on an allowlist.
- The `Site URL` in Supabase Dashboard must match the application's primary
  origin exactly.
- Local development: whitelist `http://localhost:3000` explicitly.
- Vercel preview URLs: use a wildcard pattern scoped to the project subdomain.
- Do not use `*` as a wildcard for the entire domain — always scope by subdomain.

---

## 9. RLS Requirements

Row Level Security (RLS) **must** be enabled on all tables before any browser
code is permitted to query Supabase data directly (i.e., not through the
backend API).

**Current state (P0.3A):**

- All data access goes through the backend API and Prisma.
- Browser code performs Auth flows only (no direct Supabase data access).
- RLS is therefore not yet required, but must be in place before P0.3C.

**RLS prerequisites for P0.3C:**

- All tables must have `ALTER TABLE "TableName" ENABLE ROW LEVEL SECURITY;`
- Policies must be written so users can only access their own records.
- Service-role connections (admin client) bypass RLS; this is intentional for
  backend-initiated operations only.

---

## 10. Secret-Key Handling

| Key                                    | Allowed Locations                | Blocked From                       |
| -------------------------------------- | -------------------------------- | ---------------------------------- |
| `SUPABASE_SECRET_KEY`                  | `src/lib/supabase/admin.ts` only | Browser bundles, Client Components |
| `NEXT_PUBLIC_SUPABASE_URL`             | Browser and server               | (none — public by design)          |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser and server               | (none — public by design)          |

- `admin.ts` uses `import "server-only"` to prevent webpack/Turbopack from
  including it in client bundles. Importing `admin.ts` in a Client Component
  causes a build-time error.
- Secrets must never be logged, returned in API responses, or written to
  version-controlled files.
- Rotate `SUPABASE_SECRET_KEY` immediately if it is ever logged or exposed.

---

## 11. Explicit Out-of-Scope Confirmation (P0.3A)

The following are **explicitly out of scope** for P0.3A and must not be
implemented, triggered, or prepared in this phase:

- ❌ Password migration from Auth.js credentials to Supabase Auth.
- ❌ Live authentication cutover (Supabase Auth is not yet the production path).
- ❌ Creating, provisioning, or backfilling Supabase Auth users.
- ❌ Linking any existing `User` record to a Supabase identity.
- ❌ Removing or disabling Auth.js.
- ❌ Activating Resend, Pinecone, Inngest, PostHog, or Sentry.
- ❌ Modifying the sign-in UI to use Supabase.
- ❌ Exposing `AuthMigrationState` values to end users via any API.
