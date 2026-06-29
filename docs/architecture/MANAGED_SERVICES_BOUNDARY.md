# Managed Services Boundary and Security Foundation

Status: accepted for P0.2 foundation work.

## Decision

Shri AI may use managed infrastructure services in future phases, but P0.2 does
not activate live product behavior through Supabase Auth, Pinecone, PostHog,
Sentry, Resend, or Inngest.

Hosted LLM providers remain prohibited. Ollama remains the only chat and
embedding provider, and the product must never fabricate a model response when
Ollama is unavailable.

## Data Ownership Model

- Supabase Postgres is the eventual source of truth.
- Prisma remains the application ORM during this staged migration.
- Existing `User.id` CUID values remain the primary internal user IDs.
- User-owned records must retain both `workspaceId` and the owning user ID.
- Document records remain authoritative in Postgres.
- Pinecone is a derived vector index only.
- Pinecone namespaces must be generated from `workspaceId` only on the server.
- Future Pinecone queries must use the server-derived workspace namespace and
  must reject any externally supplied namespace.
- Failed, deleted, or inaccessible documents must never be searchable.
- Local Ollama embedding dimensions must match the configured Pinecone index
  dimension.
- Shri AI must not create, resize, or assume a Pinecone index dimension
  automatically. The operator must configure the Pinecone index dimension to
  match `SHRI_AI_EMBEDDING_DIMENSIONS`.

## Supabase Auth Migration Plan

P0.2 introduces only a nullable unique `User.supabaseAuthUserId` UUID mapping.
It does not activate Supabase Auth and does not create dual-auth production
behavior. If an earlier local draft introduced a generic `authUserId` text
column, the corrective migration removes it and preserves only valid UUID-shaped
values in `supabaseAuthUserId`.

Migration stages:

1. Add nullable unique `User.supabaseAuthUserId`.
2. Keep Auth.js credentials as the only active sign-in path.
3. Export a reviewed mapping plan from current users to Supabase Auth users.
4. Backfill `supabaseAuthUserId` in a controlled script after Supabase users exist.
5. Verify every active user has exactly one Supabase Auth mapping.
6. Update session/auth reads to resolve the Supabase Auth user to the existing
   CUID `User.id` before touching owned data.
7. Run a production shadow verification period where Auth.js credentials remain
   active and Supabase Auth is not yet serving live users.
8. Switch one environment to Supabase Auth only after rollback is documented.
9. Remove Auth.js credentials and `passwordHash` only after successful
   migration, backup, verification, and maintainer approval.

The migration must preserve current foreign keys and must not rewrite user IDs,
conversation ownership, document ownership, review history, or audit records.

## Observability and Privacy

PostHog and Sentry integrations must use the shared redaction policy before any
event, breadcrumb, exception context, or metadata leaves the process.

Disallowed telemetry:

- raw prompts;
- raw answers;
- document excerpts;
- transcript text;
- email addresses;
- authorization headers;
- cookies;
- keys;
- tokens;
- request bodies containing user-generated content.

Allowed telemetry:

- route;
- action name;
- latency;
- status;
- error code or class;
- event type;
- content length;
- workspace-safe IDs;
- provider availability codes.

PostHog session recording and automatic event capture are disabled in P0.2.
Sentry request body capture is disabled in P0.2.

## Email and Job Contracts

P0.2 defines typed event contracts only. It does not send email and does not
execute Inngest jobs.

Future email rules:

- `account.created` may send one welcome email.
- `auth.login.succeeded` may emit a login notification only after a completed
  interactive login.
- Notification delivery must use an idempotency key.
- Retries must not duplicate email.
- Email failure cannot block authentication.
- Raw prompts, answers, transcript content, and IP addresses must never be
  included.

## Operational Checklist

- Set managed-service values only in deployment secrets, never in source.
- Keep `.env.example` placeholder-only.
- Verify `PINECONE_INDEX_DIMENSIONS` matches `SHRI_AI_EMBEDDING_DIMENSIONS`.
- Keep Supabase Auth inactive until the staged migration plan is approved.
- Keep current Postgres documents and status fields authoritative.
- Run the P0.2 validation commands before merging.
