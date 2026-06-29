# Current Task: Clean Integration and Migration Correction

## Objective

Continue the clean-integration goal by verifying the current committed tree,
correcting remaining archive/Caddy integration gaps, and preserving the gate
that P0.3+ work is not complete until release prerequisites are truthful.

## Verified Current Flow

- Current branch: `codex/p0-3b-1-auth-certification`.
- Current worktree was clean before this archive/Caddy follow-up.
- Recent local history includes P0.1/P0.2/P0.2.1 commits on `origin/main`,
  followed by P0.3A and P0.3B.1 local commits.
- GitHub still shows older draft PR #2 (`codex/p0-1-release-integrity`) open
  and unmerged, but `origin/main` contains separate P0.1/P0.2-style commits:
  `e418485`, `477f237`, and `d97778b`.
- Required inventory commands were rerun:
  - `git status --short`: clean before edits.
  - `git diff --name-only`: no output before edits.
  - `git diff --stat`: no output before edits.
  - `git diff --check`: passed.
  - `git ls-files -- .env .env.local .env.production .env.development`: no
    output.
  - `git log --all -- .env .env.local .env.production .env.development`: no
    output.
- `npm run source:archive` failed because `git archive HEAD` included
  `.env.example`, `.env.test`, and tracked `data/evals/**`, all prohibited by
  `scripts/verify-source-archive.mjs`.
- CI and deployment both used `caddy:2-alpine`, which is the same image family
  but not an exact pinned version.

## Scope

- Add archive export rules so safe source archives exclude `.env*` and tracked
  eval outputs.
- Pin the Caddy validation/deployment image to the same exact container tag.
- Add tests for the archive export rules and Caddy pin.
- Rerun the archive command only after committing the fix, because the archive
  script correctly refuses dirty worktrees.

## Out-Of-Scope Work

- Do not start P0.3C.
- Do not activate Resend API, Inngest, Pinecone, PostHog, Sentry, or hosted LLM
  behavior.
- Do not rotate external secrets locally; secret rotation remains a maintainer
  action.
- Do not merge or close GitHub PRs without explicit instruction.
- Do not use `git add -A` or `git commit -am`.

## Decisions

- Keep `.env.test` tracked for P0.3B.1 test certification, but exclude all
  `.env*` files from generated source archives via `.gitattributes`.
- Exclude `data/evals/**` from generated source archives because the verifier
  treats evaluation datasets/runs as unsafe archive contents.
- Use `caddy:2.8.4-alpine` consistently in GitHub Actions and
  `docker-compose.yml`.

## Acceptance Criteria

- Worktree inventory remains documented.
- No real environment files are tracked or in local history.
- Caddy CI validation uses the exact same pinned image as deployment.
- `npm run source:archive` succeeds from a clean committed tree.
- `npm run source:archive:verify <archive>` succeeds for the generated archive.
- Required validation checks pass or remaining blockers are documented.

## Files Expected To Change

- `.gitattributes`
- `.github/workflows/ci.yml`
- `docker-compose.yml`
- `docs/development/CURRENT_TASK.md`
- `src/lib/source-archive.test.mjs`
- `tests/release-integrity.test.ts`

## Files That Must Remain Unchanged

- Real `.env*` files.
- Runtime databases, uploads, logs, `.next`, `node_modules`, and generated
  archive output.
- Product UI and P0.3C feature surfaces.

## Tests Required

- `npm run test -- tests/release-integrity.test.ts src/lib/source-archive.test.mjs`
- `npm run format:check`
- `git diff --check`
- `npm run source:archive`
- `npm run source:archive:verify <generated-archive>`
- Final broader checks as needed before declaring the full clean-integration
  goal complete.

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
npm run test -- tests/release-integrity.test.ts src/lib/source-archive.test.mjs
npm run format:check
npm run source:archive
npm run source:archive:verify <generated-archive>
```

## Implementation Log

### What Was Implemented

- Added `.gitattributes` export rules for `.env*` and `data/evals/**`.
- Updated GitHub Actions Caddy validation from `caddy:2-alpine` to
  `caddy:2.8.4-alpine`.
- Updated `docker-compose.yml` Caddy deployment image to `caddy:2.8.4-alpine`.
- Updated release-integrity tests to require the exact same pinned Caddy image
  in CI and deployment.
- Added source-archive test coverage for the export-ignore rules.
- Committed archive/Caddy fix as `fix: verify clean source archive boundaries`.
- Generated and verified a source archive from a clean committed tree.
- Confirmed the generated archive has 426 entries and no exact prohibited
  `.env*`, `.git/`, `node_modules/`, `.next/`, uploads, test output, log,
  database, or `data/evals/` paths.

### Files Changed

- `.gitattributes`
- `.github/workflows/ci.yml`
- `docker-compose.yml`
- `docs/development/CURRENT_TASK.md`
- `src/lib/source-archive.test.mjs`
- `tests/release-integrity.test.ts`

### Decisions Made

- Keep source archive generation strict; do not weaken the verifier to allow
  `.env.example`, `.env.test`, or eval outputs.
- Use export-ignore rules so tracked development/test files can remain in Git
  while still being excluded from release source archives.

### Tests Run

- `npm run test -- tests/release-integrity.test.ts src/lib/source-archive.test.mjs`:
  passed, 2 files / 10 tests.
- `npm run format:check`: passed.
- `git diff --check`: passed.
- `npm run source:archive`: passed.
- `npm run source:archive:verify -- <generated-archive>`: passed.
- Exact prohibited-path archive grep: no matches.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test`: passed, 51 files / 264 tests.
- `set -a; source .env.test; set +a; npm run build`: passed.
- `npm audit --audit-level=high`: passed; low/moderate advisories remain.
- `npm run secrets:check`: passed.
- `npm run prisma:generate`: passed.
- `npx prisma validate`: passed.

### Checks Passed

- Focused Caddy/archive tests.
- Formatting.
- Whitespace diff check.
- Source archive creation and verification from clean committed tree.
- Broader local validation gate after the archive/Caddy fix.

### Checks Failed

- `npm run source:archive` failed before the fix because archive contents
  included prohibited `.env*` and `data/evals/**` paths.

### Remaining Blockers

- Hosted GitHub Actions Caddy validation must run on the pushed branch/main
  before the hosted CI gate can be considered proven.
- External manual secret rotation and old ZIP removal remain maintainer-owned.

### Recommended Next Task

- Push or otherwise run hosted GitHub Actions so the pinned Caddy validation job
  is proven remotely, then resolve stale draft PR state.
