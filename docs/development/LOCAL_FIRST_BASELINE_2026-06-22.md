# Local-First Baseline - 2026-06-22

## Repository State

- Branch: `feat/local-first-shri-ai`.
- Original uncommitted work frozen as
  `pre-freeze-local-first-wip-2026-06-22`, including untracked files.
- Environment files are ignored, are not tracked, and have no Git history.
  Secrets originating outside Git still require owner-managed rotation.
- Generated Playwright reports, test results, pytest caches, and temporary
  evaluation output are excluded by repository hygiene rules.
- The empty untracked `catchup.sql` and generated `eval_output.txt` are not part
  of the baseline commit.

## Pre-Freeze Measurements

- `npm run lint`: passed with 7 warnings.
- `npm run typecheck`: passed.
- `npm run db:check`: passed against PostgreSQL 17.10 with pgvector installed.
- `npm test`: required `npm run prisma:generate` first, then passed 196 tests
  with 1 failure in embedding integrity because no scripture embeddings were
  populated.
- Ollama executable/service: unavailable.
- Docker CLI: available; Docker daemon: unavailable.

## Clean Baseline Verification

Results are recorded after running the approved baseline command sequence.

- `npm ci`: passed; installed 611 packages. npm reported 13 audit findings
  (1 low, 6 moderate, 5 high, 1 critical). No automatic dependency mutation
  was performed.
- `npm run prisma:generate`: passed with Prisma 7.8.0.
- `npm run lint`: failed with 8 errors and 6 warnings in pre-existing scripts
  and admin voice QA code. The errors are `no-explicit-any` violations.
- `npm run typecheck`: initially failed because ignored `.next` validators
  referenced frozen-only routes. After deleting the stale `.next` cache, it
  passed.
- `npm test`: passed all 129 committed-baseline tests across 22 files.
- `npm run db:check`: passed against PostgreSQL 17.10 with pgvector 0.8.2.

## Baseline Boundaries

This commit contains hygiene and evidence only. Product implementation remains
in the retained safety stash until this baseline is committed. No environment
file cleanup with `git rm --cached` is necessary or appropriate because those
files are not tracked.
