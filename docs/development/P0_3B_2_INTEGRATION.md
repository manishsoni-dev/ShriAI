# P0.3B.2 Integration Findings

## Topology Inspection

- `origin/main` has advanced significantly, incorporating Cosmic UI changes (`p1-0a-cosmic-highdpi`), build-gating safe env (`d5bbb28`), and even a merge of a previous `P0.3B.2` attempt (`fc058dd`).
- Commit `23dd098` (test: extend auth cutover certification) resides in `origin/codex/p0-3b-1-auth-certification` but conflicts with `origin/main` in multiple files (`CURRENT_TASK.md`, `SUPABASE_AUTH_STAGING_CUTOVER.md`, `package.json`, `src/env.ts`).

## Integration Plan

- Since `23dd098` cannot be integrated seamlessly, I will cherry-pick the required changes from `23dd098` (excluding conflicts in documentation or resolving them) or manually apply the relevant test files from `23dd098` that are missing in `origin/main`.
- Exclude cosmic/UI WIP and unrelated scripts (source-archive scripts, etc).
- Add safe deterministic CI commands (`npm run test:ci`, `npm run build:ci`).
- Add `TEST_DATABASE_URL` protection.
- Create `SHRI_AI_DECISION_LOG.md`.
