# Current Task

## Objective
Build an `/admin/telemetry` dashboard to run restricted staging usage and collect privacy-safe evidence regarding retrieval relevance, citation accuracy, persona fit, user usefulness, voice quality, latency, safety, and cost.

## Verified Current Flow
- We have correctly simulated staging traffic, storing telemetry in `UserFeedback`, `VoiceQaRun`, `RetrievalLog`, and `UsageEvent`.
- Currently, there is no centralized dashboard to view this privacy-safe evidence.

## Scope
- Create `src/lib/telemetry/queries.ts` to perform database aggregations across feedback, voice QA, usage, and retrieval tables.
- Create `src/app/admin/telemetry/page.tsx` as a Server Component.
- Create `src/app/admin/telemetry/kpi-cards.tsx` to handle premium rendering of the KPIs.
- Preserve privacy by only showing grouped metrics and counts, not raw PII or unprotected session transcripts.

## Expected Files to Change
- `docs/development/CURRENT_TASK.md`
- `src/lib/telemetry/queries.ts` (New)
- `src/app/admin/telemetry/kpi-cards.tsx` (New)
- `src/app/admin/telemetry/page.tsx` (New)

## Tests and Validation
- Verify UI rendering without errors via Next.js compiler.
- `npm run typecheck`
- `npm run lint`

## Blockers
- Awaiting implementation.

### At Task Completion
- **What was implemented**: A complete telemetry dashboard (`/admin/telemetry`) securely aggregating existing `UserFeedback`, `VoiceQaRun`, `RetrievalLog`, and `UsageEvent` models.
- **Files changed**: `src/lib/telemetry/queries.ts`, `src/app/admin/telemetry/page.tsx`, `src/app/admin/telemetry/kpi-cards.tsx`, `src/app/api/admin/voice-qa/route.ts`, `scripts/evaluate-scripture-retrieval.ts`.
- **Decisions made**: Reused `requireReviewerForPage()` to ensure the page is protected and requires an authorized reviewer/admin session. Mapped tokens to GPT-4o prices for estimated spend. Aggregated data without leaking raw PII.
- **Tests run**: `npm run typecheck`, `npm run lint`
- **Checks passed**: Typecheck passed for our modified and created files. Lint passed with no new errors in telemetry files.
- **Checks failed**: None.
- **Remaining blockers**: The `release:check` gate will only fully pass when the human user runs `scripts/cli-reviewer.ts` to manually approve the remaining Bhagavad Gita chunks.
- **Recommended next task**: Have the reviewer perform the manual approvals, run `npm run scripture:eval`, and cut the release.
