# Supabase Auth Migration & Identity Architecture

This document describes the identity architecture, migration strategy, and security rules for migrating from Auth.js to Supabase Auth.

## Current vs. Target Identity Architecture

**Current (Auth.js)**:
The application relies on Auth.js for session management and OAuth providers. Identities are tied to `User` accounts in Prisma.

**Target (Supabase Auth)**:
Supabase Auth will become the source of truth for authentication.

1. The Supabase JWT is validated server-side.
2. The `sub` claim (Supabase UUID) is resolved to the corresponding `User` via the `User.supabaseAuthUserId` mapping.
3. Legacy Auth.js logic is removed once the migration reaches `CUTOVER_READY`.

## User.supabaseAuthUserId Mapping

The Prisma `User` model now contains a nullable, unique `supabaseAuthUserId` mapped to the Supabase UUID:

```prisma
supabaseAuthUserId String? @unique @db.Uuid
```

This is the only secure link between a Supabase user and the application data. **Never** trust a user-provided or client-side-injected ID for this mapping.

## Staged Account Migration

The migration is handled through internal state flags:

- **UNLINKED**: The app user has no `supabaseAuthUserId`.
- **PROVISIONED**: A Supabase account has been created, but the user hasn't logged in with it yet.
- **VERIFIED**: The user has successfully logged into the new Supabase account and established a session, verifying the link.
- **CUTOVER_READY**: 100% of active users are VERIFIED.
- **DISABLED**: Legacy authentication disabled.

> **Important**: Password migration and live auth cutover are **OUT OF SCOPE** for P0.3A. We are currently just establishing the safe client foundation.

## Rollback Procedure

If the Supabase Auth cutover fails or introduces regressions:

1. Revert to Auth.js by toggling the feature flag/auth resolver back to legacy mode.
2. Session invalidation on the Supabase side is not strictly necessary for app safety since Auth.js ignores it, but can be done via the Supabase Dashboard.
3. No data loss occurs because the Prisma `User` records remain intact; only the authentication method changes.

## Local, Staging, and Production Environment Separation

Each environment (Local, Staging, Production) must have completely isolated Supabase projects.

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` must point to environment-specific projects.
- `SUPABASE_SECRET_KEY` must be securely injected per environment and **never** exposed to the browser.
- A missing key safely returns `SUPABASE_NOT_CONFIGURED` to prevent crashing during local development without a connected project.

## Supabase Dashboard Setup

1. Create a new Supabase Project per environment.
2. Disable the default email signup auto-confirmation for migration (if provisioning accounts programmatically).
3. Set the Site URL and valid Redirect URIs in **Authentication > URL Configuration**.
4. Retrieve the URL, anon key (publishable), and service_role key (secret) from **Project Settings > API**.

## Redirect URL Rules

- Auth redirects must explicitly use the configured `Site URL`.
- Local development requires `http://localhost:3000` to be whitelisted.
- Vercel preview environments must have wildcard redirect rules configured securely (e.g. `https://*--shriai.vercel.app/**`).

## RLS Requirements

Before browser-facing Supabase data access is permitted (e.g., querying data directly via the JS client):

- Row Level Security (RLS) MUST be enabled on all tables.
- However, since we currently proxy all data access through our backend API and Prisma, RLS is disabled or strictly managed by our service role / Prisma client connection. Browser bundles **only** perform Auth flows.

## Secret-Key Handling

- The `SUPABASE_SECRET_KEY` must **never** be imported into any browser bundle or Client Component.
- It is strictly restricted to `src/lib/supabase/admin.ts` which uses the `server-only` directive.
