# Current Task: P0.2 - Managed Services Foundation Clean Integration

## Objective

Advance the clean-integration goal by preparing P0.2 as a narrow branch on top
of merged P0.1. P0.2 must remain limited to managed-service boundaries and the
Supabase Auth identity-mapping migration correction; it must not activate
Supabase Auth or any external managed runtime service.

## Verified Current Flow

- Worktree: `/Users/manishh/Desktop/Shri AI P0.2 Clean`.
- Branch: `codex/p0-2-managed-services-foundation-clean`.
- Current branch head before this task-ledger update:
  `d02981c chore: prepare managed service boundaries`.
- Current base: `origin/main` at `cbade94 Merge P0.1 release integrity
hardening`.
- `git status --short`: clean before this task-ledger update.
- `git diff --name-status origin/main...HEAD` contains only:
  - `M docs/architecture/MANAGED_SERVICES_BOUNDARY.md`
  - `A prisma/migrations/20260628183000_supabase_auth_uuid_mapping/migration.sql`
- `git diff --stat origin/main...HEAD`: 2 files changed, 37 insertions, 4
  deletions.
- `git ls-remote --heads origin codex/p0-2-managed-services-foundation-clean`:
  no remote branch existed before push.
- Original root worktree inventory remained clean when this continuation
  started:
  - `git status --short`: no output.
  - `git diff --name-only`: no output.
  - `git diff --stat`: no output.
  - `git diff --check`: passed.
  - `git ls-files -- .env .env.local .env.production .env.development`: no
    tracked real env files.
  - `git log --all -- .env .env.local .env.production .env.development`: no
    output.
- GitHub state before P0.2 PR work:
  - P0.1 is merged into `origin/main`.
  - P0.3B.2 PR #4 is open and green but is later than the P0.2 gate.
  - P0.3B.1 PR #3 is superseded by P0.3B.2.
  - unrelated PR #1 remains dirty and out of scope.

## Scope

- Keep P0.2 limited to managed-service provider boundaries, security
  architecture documentation, and the corrected future Supabase Auth mapping
  migration.
- Add `User.supabaseAuthUserId` as a nullable UUID mapping for future Supabase
  Auth migration.
- Preserve current `User.id` CUID primary keys and all existing ownership
  relationships.
- If an earlier local draft created generic text `authUserId`, migrate only
  UUID-shaped values into `supabaseAuthUserId` and remove the generic column.
- Update this task ledger as required by repository instructions.
- Push the clean branch and open a draft PR for CI validation.

## Out-Of-Scope Work

- Do not activate Supabase Auth.
- Do not start P0.3A or P0.3C.
- Do not add Resend API email sending, Inngest jobs, Pinecone queries, PostHog
  capture, Sentry capture, hosted LLMs, or product features.
- Do not modify P0.3B.1/P0.3B.2 branches.
- Do not commit runtime files, generated files, source archives, real `.env*`
  files, uploads, logs, databases, `.next`, or `node_modules`.
- Do not use `git add -A`, `git commit -am`, rebase an open remote branch, or
  force-push.
- Do not use Replit unless a concrete import/deploy/environment task is added.

## Decisions

- Treat `origin/main` and current local worktree state as authoritative.
- Preserve P0.2 as a separate gate before any Supabase Auth foundation work.
- Use a normal scoped commit for this task-ledger update and push the branch
  without history rewriting.
- Keep the migration defensive for prior local draft state by checking for
  `authUserId` before migrating/dropping it.

## Acceptance Criteria

- P0.2 branch is based on merged P0.1.
- Net branch diff remains limited to P0.2 managed-service boundary
  documentation, the UUID migration correction, and required task ledger.
- No real environment files are tracked or copied.
- Supabase Auth remains inactive.
- Validation commands pass locally.
- Draft PR is opened and hosted CI validates the branch, including Caddy.

## Files Expected To Change

- `docs/development/CURRENT_TASK.md`
- `docs/architecture/MANAGED_SERVICES_BOUNDARY.md`
- `prisma/migrations/20260628183000_supabase_auth_uuid_mapping/migration.sql`

## Files That Must Remain Unchanged

- Real `.env`, `.env.local`, `.env.production`, and `.env.development` files.
- P0.1, P0.3A, P0.3B.1, and P0.3B.2 worktrees.
- Runtime artifacts, generated archives, logs, uploads, databases,
  `node_modules`, and `.next`.

## Tests Required

- Prisma migration and schema validation.
- Full format, lint, typecheck, test, build, and audit checks.
- Diff whitespace and clean-status checks.
- Hosted CI after PR creation.

## Verification Commands

```bash
npm run secrets:check
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

- Verified the P0.2 clean worktree and net branch diff.
- Confirmed no remote branch existed before push.
- Replaced stale broad-cleanup task ledger with current P0.2 task state.

### Files Changed

- `docs/development/CURRENT_TASK.md`
- `docs/architecture/MANAGED_SERVICES_BOUNDARY.md`
- `prisma/migrations/20260628183000_supabase_auth_uuid_mapping/migration.sql`

### Decisions Made

- Keep P0.2 separate from P0.3B.2 even though P0.3B.2 is already green, because
  the clean-integration goal gates P0.3 work on P0.2 first.

### Tests Run

- `npm run secrets:check`: passed.
- `npm run format:check`: initially failed on this task ledger, then passed
  after formatting.
- `npm run lint`: passed.
- `npm run prisma:generate`: passed.
- `npx prisma validate`: passed.
- `npm run typecheck`: passed.
- `npm run test`: failed without `AUTH_SECRET` and `DATABASE_URL`, proving raw
  local commands still require explicit safe env placeholders when no real env
  files are used.
- `AUTH_SECRET=local-placeholder-auth-secret-at-least-32-chars DATABASE_URL=postgresql://test:test@localhost:5432/shri_ai_test?schema=public npm run test`:
  passed, 45 files / 212 tests.
- `npm audit --audit-level=high`: passed with 1 low and 3 moderate advisories.
- `npm run build`: failed without `AUTH_SECRET` and `DATABASE_URL` during page
  data collection for `/api/auth/[...nextauth]`.
- `AUTH_SECRET=local-placeholder-auth-secret-at-least-32-chars DATABASE_URL=postgresql://test:test@localhost:5432/shri_ai_test?schema=public npm run build`:
  passed.

### Checks Passed

- Initial P0.2 worktree inspection passed.
- P0.2 code and migration validation passed with safe placeholder env where
  strict env validation requires it.

### Checks Failed

- Raw `npm run test` and raw `npm run build` fail without explicit safe
  placeholders because this branch predates the later deterministic `.env.test`
  CI command repair.

### Remaining Blockers

- Manual external secret rotation remains maintainer-owned.
- P0.2 branch still needs push, PR, hosted CI, and merge.
- Safe source archive generation/verification must happen only after clean
  commits and required gates are merged.
- Final gate still requires raw `npm run test` and raw `npm run build` to pass
  from a clean worktree without relying on real env files; this is not solved in
  P0.2 and remains a later integration gate.

### Recommended Next Task

- Run P0.2 validation, commit the task-ledger update, push the branch, and open
  a draft PR.
