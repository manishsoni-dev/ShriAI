# Current Task: Source Archive Safety Correction

## Objective

Fix the safe source archive gate after P0.1 and P0.2 were merged. The archive
creator must generate a ZIP from a clean committed tree that passes the archive
verifier and excludes `.env*`, `.git`, `node_modules`, `.next`, logs,
databases, uploads, test outputs, and eval artifacts.

## Verified Current Flow

- Worktree: `/Users/manishh/Desktop/ShriAI-p0-baseline`.
- Branch before correction: `main` fast-forwarded to `origin/main` at
  `4b70857 Merge pull request #5 from
manishsoni-dev/codex/p0-2-managed-services-foundation-clean`.
- Correction branch: `codex/source-archive-safety-correction`.
- Worktree was clean before branch creation.
- `npm run source:archive` from clean merged `main` failed because the
  generated ZIP contained verifier-prohibited tracked files:
  - `.env.example`
  - `data/evals/**`
- The verifier already denies the relevant unsafe archive paths; the creator
  was not passing matching Git archive exclusions before writing the ZIP.

## Scope

- Update `scripts/create-source-archive.mjs` so `git archive` excludes paths
  prohibited by the source archive verifier.
- Keep the verifier's denylist intact.
- Add regression coverage proving the creator contains explicit exclusions for
  env placeholders, eval artifacts, uploads, build outputs, and test outputs.
- Generate and verify a fresh archive only after this correction is committed.

## Out-Of-Scope Work

- Do not change product runtime behavior.
- Do not activate Supabase Auth, Resend, Inngest, Pinecone, PostHog, Sentry, or
  hosted LLMs.
- Do not commit generated ZIP archives.
- Do not read, copy, print, or commit real `.env` or `.env.local`.
- Do not start P0.3A until all clean-integration gates are verified.
- Do not use Replit unless a concrete import/deploy/environment task is added.

## Decisions

- Use Git pathspec exclusions in the archive creator rather than weakening the
  verifier.
- Keep `.env.example` out of source archives because the gate requires `.env*`
  exclusion.
- Add a CLI guard to `scripts/create-source-archive.mjs` so future imports do
  not create archives as a side effect.

## Acceptance Criteria

- `npm run source:archive` passes from a clean committed tree.
- `npm run source:archive:verify -- <archive>` passes for the generated ZIP.
- The generated ZIP is not tracked.
- Required validation checks pass.
- Branch is merged before treating the source archive gate as complete.

## Files Expected To Change

- `docs/development/CURRENT_TASK.md`
- `scripts/create-source-archive.mjs`
- `tests/release-integrity.test.ts`

## Files That Must Remain Unchanged

- Real `.env`, `.env.local`, `.env.production`, and `.env.development` files.
- Runtime artifacts, generated archives, logs, uploads, databases,
  `node_modules`, and `.next`.

## Tests Required

- `npm run secrets:check`
- `npm run format:check`
- `npm run lint`
- Targeted release integrity tests.
- `npm run source:archive`
- `npm run source:archive:verify -- <archive>`
- `git diff --check`
- `git status --short`

## Verification Commands

```bash
npm run secrets:check
npm run format:check
npm run lint
npm run test -- tests/release-integrity.test.ts src/lib/source-archive.test.mjs
npm run source:archive
npm run source:archive:verify -- dist/source-archives/<archive>.zip
git diff --check
git status --short
```

## Implementation Log

### What Was Implemented

- Added explicit `git archive` exclusion pathspecs to the archive creator.
- Added a CLI guard to prevent archive creation when the script is imported.
- Added release-integrity assertions for source archive exclusions.

### Files Changed

- `docs/development/CURRENT_TASK.md`
- `scripts/create-source-archive.mjs`
- `tests/release-integrity.test.ts`

### Decisions Made

- Preserve the stricter verifier and fix creation instead of allowing
  `.env.example` or eval artifacts into generated ZIPs.

### Tests Run

- `npm run secrets:check`: passed.
- `npm run format:check`: initially failed on this task ledger, then passed
  after formatting.
- `npm run lint`: passed.
- `npm run test -- tests/release-integrity.test.ts src/lib/source-archive.test.mjs`:
  passed, 2 files / 9 tests.
- `npm run typecheck`: passed.
- `git diff --check`: passed.
- `npm run source:archive`: passed from clean committed branch
  `2033a24`, creating `dist/source-archives/shri-ai-source-2033a24.zip`.
- `npm run source:archive:verify -- dist/source-archives/shri-ai-source-2033a24.zip`:
  passed, 401 entries.

### Checks Passed

- Initial failure reproduced from clean merged `main`.
- Archive creator now has explicit Git pathspec exclusions matching the unsafe
  archive classes covered by the verifier.
- Targeted release/source-archive tests pass.
- The corrected archive creator successfully generated and verified a ZIP from
  a clean committed branch tree.

### Checks Failed

- `npm run source:archive` failed before the fix because the archive contained
  `.env.example` and `data/evals/**`.

### Remaining Blockers

- Correction needs push, hosted CI, merge, and then a fresh archive generated
  from corrected `main`.
- Manual external secret rotation and old shared ZIP removal remain
  maintainer-owned.

### Recommended Next Task

- Validate, commit, and merge the archive-safety correction, then regenerate
  the archive from clean `main`.
