# P0.2.1 Baseline Reconciliation Report

This document classifies every modified or untracked file to safely untangle the repository's current state, which contains a mix of P0.1 release-integrity work, P0.2 managed-services-foundation work, and unrelated inherited WIP.

## P0.1 Release-Integrity Work

Files belonging to P0.1 will be committed separately.

- `.github/workflows/ci.yml` (CI split)
- `package-lock.json` (audit remediation)
- `package.json` (audit remediation)
- `scripts/check-release-readiness.ts` (release integrity checks)
- `scripts/create-voice-qa-run.ts` (Voice QA integrity)
- `scripts/evaluate-scripture-retrieval.ts` (local evaluation fail-fast handling)
- `src/app/api/admin/voice-qa/route.ts` (Voice QA integrity)
- `tests/integrity.test.ts` (release integrity checks)
- `Caddyfile` (Caddy policy tests/docs)
- `docs/release/`
- `docs/security/`
- `prisma/migrations/20260628160000_voice_qa_evidence_source/` (Voice QA integrity)
- `scripts/check-local-ai-readiness.ts` (local evaluation fail-fast handling)
- `scripts/check-secret-containment.mjs` (source archive safety)
- `scripts/create-source-archive.mjs` (source archive safety)
- `scripts/evaluate-scripture-retrieval.test.ts` (local evaluation fail-fast handling)
- `scripts/seed-voice-qa-run.ts` (Voice QA integrity)
- `scripts/verify-source-archive.mjs` (source archive safety)
- `src/lib/source-archive.test.mjs` (source archive safety)
- `tests/release-integrity.test.ts` (Caddy policy docs & tests)

## P0.2 Managed-Services-Foundation Work

Files belonging to P0.2 will be committed separately.

- `docker-compose.yml` (provider boundaries)
- `src/app/api/chat/stream/route.test.ts` (provider boundaries)
- `src/app/api/chat/stream/route.ts` (provider boundaries)
- `src/app/api/voice/transcribe/route.test.ts` (provider boundaries)
- `src/app/api/voice/transcribe/route.ts` (provider boundaries)
- `src/env.ts` (optional provider environment validation)
- `src/lib/ai/answer-generator.test.ts` (provider boundaries)
- `src/lib/ai/answer-generator.ts` (provider boundaries)
- `src/lib/ai/local-ai-provider.ts` (provider boundaries)
- `src/lib/ai/local-embedding-provider.ts` (provider boundaries)
- `src/lib/ai/local-ollama-provider.ts` (provider boundaries)
- `src/lib/ai/ollama-provider.test.ts` (provider boundaries)
- `src/lib/ai/ollama-provider.ts` (provider boundaries)
- `src/lib/ai/types.ts` (provider boundaries)
- `src/lib/ai/usage-logging-provider.ts` (provider boundaries)
- `src/lib/observability.ts` (health reporting)
- `src/lib/privacy/redaction.ts` (shared privacy redaction)
- `src/lib/voice/local-speech.ts` (provider boundaries)
- `Dockerfile` (provider boundaries)
- `docs/architecture/MANAGED_SERVICES_BOUNDARY.md` (managed-services architecture documentation)
- `docs/deployment.md`
- `src/app/api/events/` (typed event contracts)
- `src/app/api/health/` (health reporting)
- `src/lib/events/` (typed event contracts)
- `src/lib/logger.ts` (health reporting)
- `src/lib/observability.test.ts` (health reporting)
- `src/lib/product-events.test.ts` (typed event contracts)
- `src/lib/product-events.ts` (typed event contracts)
- `src/lib/providers/` (provider boundaries)
- `tests/managed-services-boundary.test.ts` (architecture documentation)

## P0.2.1 Work

These files are associated with this specific stabilization phase.

- `docs/development/CURRENT_TASK.md`
- `prisma/schema.prisma` (Supabase identity-link migration)
- `src/lib/auth/users.test.ts` (Supabase identity-link mapping correction)
- `src/lib/auth/users.ts` (Supabase identity-link mapping correction)
- `prisma/migrations/20260628173000_add_supabase_auth_mapping/` (Supabase mapping correction)
- `docs/development/BASELINE_RECONCILIATION.md` (This file)

## Unrelated Inherited WIP / Ignored Files

The following files are either unrelated WIP, runtime generated, or uncertain. They will NOT be staged or committed, but will be preserved on the disk.

- `.env.example`
- `README.md`
- `next.config.ts`
- `prisma/migrations/20260622000000_local_ollama_embeddings/migration.sql` (Will not alter already-applied migrations)
- `prisma/migrations/migration_lock.toml`
- `scripts/ingest-scriptures.ts`
- `scripts/simulate-staging-traffic.ts`
- `src/app/_components/CosmicOrbitEngine.tsx`
- `src/app/_components/devotional-shell.tsx`
- `src/app/admin/telemetry/page.tsx`
- `src/app/chat/actions.ts`
- `src/app/chat/chat-shell.tsx`
- `src/app/chat/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/knowledge/actions.ts`
- `src/app/knowledge/page.tsx`
- `src/app/onboarding/actions.ts`
- `src/app/onboarding/page.tsx`
- `src/app/page.tsx`
- `src/app/sign-in/actions.ts`
- `src/lib/ingestion/ingest-document.ts`
- `src/lib/knowledge-search.test.ts`
- `src/lib/knowledge-search.ts`
- `src/lib/personas.ts`
- `src/lib/rag/scripture-retrieval.ts`
- `src/lib/rate-limit.ts`
- `src/lib/scripture-review/reviews.test.ts`
- `src/lib/telemetry/queries.ts`
- `CHANGELOG.md`
- `data/evals/scripture-retrieval/runs/eval-run-baseline-v1-2026-06-23T13-31-58-775Z.json`
- `data/evals/scripture-retrieval/runs/eval-run-baseline-v1-2026-06-23T13-34-02-862Z.json`
- `prisma/migrations/20260623120543_phase_2_rag_hardening/`
- `prisma/migrations/20260623140903_phase5_user_value_loop/`
- `prisma/migrations/20260623143929_phase_6_usability/`
- `prisma/migrations/20260623145131_phase_7_beta/`
- `scripts/beta-operations.ts`
- `scripts/export-portfolio-evidence.ts`
- `scripts/export-research-metrics.ts`
- `scripts/test-answer-generator.ts`
- `src/app/_components/support/`
- `src/app/actions/`
- `src/app/onboarding/wizard.tsx`
- `src/app/saved/`
- `src/app/settings/`
- `src/lib/feature-flags.ts`
- `src/lib/ingestion/ingest-document.test.ts`
