#!/usr/bin/env tsx
/**
 * scripts/evaluate-scripture-retrieval.ts
 *
 * Production-grade retrieval evaluation for the Bhagavad Gita corpus.
 *
 * Metrics reported:
 *   Recall@5           – fraction of queries where ≥1 expected ref appears in top-5
 *   MRR                – mean reciprocal rank of the first expected ref hit
 *   Source-hit rate    – fraction of non-empty result sets whose source is "Bhagavad Gita"
 *   Zero-result rate   – fraction of queries returning no chunks
 *   p95 latency (ms)   – 95th-percentile retrieval wall-clock time
 *
 * Release gate (configurable via THRESHOLDS):
 *   Recall@5          >= 0.75
 *   Source-hit rate   >= 0.70
 *   Zero-result rate  <= 0.10
 *   p95 latency       <= 1000 ms
 *
 * Usage:
 *   npx tsx scripts/evaluate-scripture-retrieval.ts
 *   npx tsx scripts/evaluate-scripture-retrieval.ts --no-gate   (print metrics without gating)
 *   npx tsx scripts/evaluate-scripture-retrieval.ts --verbose   (show every query result)
 *   npx tsx scripts/evaluate-scripture-retrieval.ts --file=data/evals/scripture-retrieval/bhagavad-gita-v1.json
 */

import "dotenv/config";

import * as fs from "node:fs";
import * as path from "node:path";

import { Pool } from "pg";
import { buildScriptureKeywordQuery } from "../src/lib/rag/retrieval-query";

// ── CLI args ──────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const noGate = argv.includes("--no-gate");
const verbose = argv.includes("--verbose");
const fileArg = argv.find((a) => a.startsWith("--file="));
const evalFile = path.resolve(
  process.cwd(),
  fileArg?.slice("--file=".length) ??
    "data/evals/scripture-retrieval/bhagavad-gita-v1.json",
);

// ── Release-gate thresholds ───────────────────────────────────────────────────

const THRESHOLDS = {
  recallAt5: 0.75,
  expectedRefHitRate: 0.7,
  sourceHitRate: 0.7,
  zeroResultRate: 0.1,
  unsupportedAnswerRate: 0.1,
  p95LatencyMs: 1000,
} as const;

// ── Eval-case type ────────────────────────────────────────────────────────────

type EvalCase = {
  id: string;
  question: string;
  personaId: string;
  themes?: string[];
  expectedRefs: string[];
  acceptableChapters?: number[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function chapterOf(ref: string): number {
  return Number(ref.split(".")[0]);
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1);
  return sorted[idx] ?? 0;
}

function pad(s: string, n: number) {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function hr(char = "─", len = 60) {
  return char.repeat(len);
}

// ── DB keyword retrieval (no OpenAI dependency) ───────────────────────────────
// This is a direct SQL implementation so the eval never needs an API key.
// It mirrors the keyword path in scripture-retrieval.ts exactly.

type ChunkRow = {
  id: string;
  canonicalRef: string;
  sourceTitle: string;
  translation: string;
  themeTags: string[];
  answerUseCases: string[];
  score: number;
};

async function keywordRetrieve(
  pool: Pool,
  question: string,
  personaId: string,
  themes: string[],
  limit: number,
): Promise<ChunkRow[]> {
  const keywordQuery = buildScriptureKeywordQuery(question, themes);
  const { rows } = await pool.query<ChunkRow>(
    `
    WITH input AS (
      SELECT
        to_tsquery('english', $1) AS tsq,
        $2::TEXT[] AS themes,
        $3::TEXT[] AS terms
    )
    SELECT
      sc."id",
      sc."canonicalRef",
      ss."canonicalTitle"                                         AS "sourceTitle",
      sc."translation",
      sc."themeTags",
      sc."answerUseCases",
      (
        CASE
          WHEN sc."searchVector" @@ input.tsq
            THEN ts_rank_cd(sc."searchVector", input.tsq) * 2.8
          ELSE 0
        END
        + LEAST(
            0.7,
            0.18 * (
              SELECT COUNT(*)
              FROM unnest(sc."themeTags") AS tag
              WHERE lower(tag) = ANY(input.themes)
            )
          )
        + LEAST(
            0.7,
            0.12 * (
              SELECT COUNT(*)
              FROM unnest(sc."answerUseCases") AS use_case
              CROSS JOIN unnest(input.terms) AS term
              WHERE lower(use_case) LIKE '%' || term || '%'
            )
          )
        + (ss."priority"::DOUBLE PRECISION / 100.0)
      ) AS "score"
    FROM "ScriptureChunk" sc
    INNER JOIN "ScriptureSource" ss ON ss."id" = sc."sourceId"
    CROSS JOIN input
    WHERE
      (
        sc."searchVector" @@ input.tsq
        OR EXISTS (
          SELECT 1
          FROM unnest(sc."themeTags") AS tag
          WHERE lower(tag) = ANY(input.themes)
        )
        OR EXISTS (
          SELECT 1
          FROM unnest(sc."answerUseCases") AS use_case
          CROSS JOIN unnest(input.terms) AS term
          WHERE lower(use_case) LIKE '%' || term || '%'
        )
      )
      AND sc."personaTags" @> ARRAY[$4]::TEXT[]
    ORDER BY "score" DESC
    LIMIT $5
    `,
    [
      keywordQuery.tsQuery,
      keywordQuery.themes,
      keywordQuery.terms,
      personaId,
      limit,
    ],
  );
  return rows;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Load eval dataset
  if (!fs.existsSync(evalFile)) {
    console.error(`✗ Eval file not found: ${evalFile}`);
    process.exit(1);
  }
  const cases: EvalCase[] = JSON.parse(fs.readFileSync(evalFile, "utf-8"));
  if (!Array.isArray(cases) || cases.length === 0) {
    console.error("✗ Eval file is empty or not an array.");
    process.exit(1);
  }

  // Connect to Postgres
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log(hr("═"));
  console.log("  Shri AI — Scripture Retrieval Evaluation");
  console.log(hr("═"));
  console.log(`  Corpus file : ${path.relative(process.cwd(), evalFile)}`);
  console.log(`  Cases       : ${cases.length}`);
  console.log(`  Mode        : keyword-only (no OpenAI required)`);
  console.log(hr());
  console.log();

  // ── Per-query loop ──────────────────────────────────────────────────────────

  let recallHits = 0;
  let expectedRefHits = 0;
  let rrTotal = 0;
  let sourceHits = 0;
  let zeroResults = 0;
  let unsupportedAnswers = 0;
  const latencies: number[] = [];

  type MissRecord = {
    id: string;
    question: string;
    expectedRefs: string[];
    gotRefs: string[];
    latencyMs: number;
  };
  const misses: MissRecord[] = [];

  type PassRecord = {
    id: string;
    question: string;
    firstHitRef: string;
    rank: number;
    latencyMs: number;
  };
  const passes: PassRecord[] = [];

  type CaseResult = {
    id: string;
    question: string;
    expectedRefs: string[];
    gotRefs: string[];
    recallHit: boolean;
    expectedRefHit: boolean;
    firstHitRank: number | null;
    firstExactHitRank: number | null;
    correctSource: boolean;
    latencyMs: number;
  };
  const caseResults: CaseResult[] = [];

  for (const evalCase of cases) {
    const t0 = Date.now();
    let rows: ChunkRow[] = [];
    try {
      rows = await keywordRetrieve(
        pool,
        evalCase.question,
        evalCase.personaId,
        evalCase.themes ?? [],
        5,
      );
    } catch (err) {
      console.error(`[ERROR] Query failed for ${evalCase.id}: ${String(err)}`);
    }
    const latencyMs = Date.now() - t0;
    latencies.push(latencyMs);

    const gotRefs = rows.map((r) => r.canonicalRef);
    const expectedSet = new Set(evalCase.expectedRefs);
    const acceptableChapters = new Set(evalCase.acceptableChapters ?? []);

    // A hit is: exact ref match OR acceptable-chapter match
    const firstHitIndex = gotRefs.findIndex(
      (ref) => expectedSet.has(ref) || acceptableChapters.has(chapterOf(ref)),
    );
    const firstExactHitIndex = gotRefs.findIndex((ref) => expectedSet.has(ref));
    const hasHit = firstHitIndex >= 0;
    const hasExactHit = firstExactHitIndex >= 0;

    recallHits += hasHit ? 1 : 0;
    expectedRefHits += hasExactHit ? 1 : 0;
    rrTotal += hasHit ? 1 / (firstHitIndex + 1) : 0;

    // Source check: all returned citations should be "Bhagavad Gita"
    const correctSource =
      rows.length > 0 && rows.every((r) => r.sourceTitle === "Bhagavad Gita");
    if (correctSource) sourceHits++;

    if (rows.length === 0) zeroResults++;
    if (rows.length === 0 || !correctSource) unsupportedAnswers++;

    caseResults.push({
      id: evalCase.id,
      question: evalCase.question,
      expectedRefs: evalCase.expectedRefs,
      gotRefs,
      recallHit: hasHit,
      expectedRefHit: hasExactHit,
      firstHitRank: hasHit ? firstHitIndex + 1 : null,
      firstExactHitRank: hasExactHit ? firstExactHitIndex + 1 : null,
      correctSource,
      latencyMs,
    });

    if (hasHit) {
      passes.push({
        id: evalCase.id,
        question: evalCase.question,
        firstHitRef: gotRefs[firstHitIndex]!,
        rank: firstHitIndex + 1,
        latencyMs,
      });
    } else {
      misses.push({
        id: evalCase.id,
        question: evalCase.question,
        expectedRefs: evalCase.expectedRefs,
        gotRefs,
        latencyMs,
      });
    }
  }

  // ── Aggregate metrics ───────────────────────────────────────────────────────

  const n = cases.length;
  const recallAt5 = recallHits / n;
  const expectedRefHitRate = expectedRefHits / n;
  const mrr = rrTotal / n;
  const sourceHitRate = sourceHits / n;
  const zeroResultRate = zeroResults / n;
  const unsupportedAnswerRate = unsupportedAnswers / n;
  const p50 = percentile(latencies, 0.5);
  const p95 = percentile(latencies, 0.95);
  const p99 = percentile(latencies, 0.99);

  // ── Print metrics ───────────────────────────────────────────────────────────

  console.log(hr("─", 60));
  console.log("  RETRIEVAL METRICS");
  console.log(hr("─", 60));

  function gate(value: number, threshold: number, mode: "gte" | "lte"): string {
    const pass = mode === "gte" ? value >= threshold : value <= threshold;
    return pass ? "✅ PASS" : "❌ FAIL";
  }

  console.log(
    `  ${pad("Recall@5", 30)} ${(recallAt5 * 100).toFixed(1).padStart(6)}%   ${gate(recallAt5, THRESHOLDS.recallAt5, "gte")}  (gate >= ${(THRESHOLDS.recallAt5 * 100).toFixed(0)}%)`,
  );
  console.log(
    `  ${pad("Expected-ref hit rate", 30)} ${(expectedRefHitRate * 100).toFixed(1).padStart(6)}%   ${gate(expectedRefHitRate, THRESHOLDS.expectedRefHitRate, "gte")}  (gate >= ${(THRESHOLDS.expectedRefHitRate * 100).toFixed(0)}%)`,
  );
  console.log(
    `  ${pad("MRR", 30)} ${(mrr * 100).toFixed(1).padStart(6)}%   (informational)`,
  );
  console.log(
    `  ${pad("Source-hit rate", 30)} ${(sourceHitRate * 100).toFixed(1).padStart(6)}%   ${gate(sourceHitRate, THRESHOLDS.sourceHitRate, "gte")}  (gate >= ${(THRESHOLDS.sourceHitRate * 100).toFixed(0)}%)`,
  );
  console.log(
    `  ${pad("Zero-result rate", 30)} ${(zeroResultRate * 100).toFixed(1).padStart(6)}%   ${gate(zeroResultRate, THRESHOLDS.zeroResultRate, "lte")}  (gate <= ${(THRESHOLDS.zeroResultRate * 100).toFixed(0)}%)`,
  );
  console.log(
    `  ${pad("Unsupported-answer proxy", 30)} ${(unsupportedAnswerRate * 100).toFixed(1).padStart(6)}%   ${gate(unsupportedAnswerRate, THRESHOLDS.unsupportedAnswerRate, "lte")}  (gate <= ${(THRESHOLDS.unsupportedAnswerRate * 100).toFixed(0)}%)`,
  );
  console.log();
  console.log(hr("─", 60));
  console.log("  LATENCY (keyword-only, local Postgres)");
  console.log(hr("─", 60));
  console.log(`  ${pad("p50 latency", 30)} ${String(p50).padStart(6)} ms`);
  console.log(
    `  ${pad("p95 latency", 30)} ${String(p95).padStart(6)} ms   ${gate(p95, THRESHOLDS.p95LatencyMs, "lte")}  (gate <= ${THRESHOLDS.p95LatencyMs} ms)`,
  );
  console.log(`  ${pad("p99 latency", 30)} ${String(p99).padStart(6)} ms`);
  console.log();

  // ── Passes / misses summary ─────────────────────────────────────────────────

  console.log(hr("─", 60));
  console.log(
    `  RESULT SUMMARY  —  ${passes.length} pass, ${misses.length} miss out of ${n}`,
  );
  console.log(hr("─", 60));

  if (misses.length > 0) {
    console.log(
      "\n  MISSES (keyword search did not surface an expected reference):\n",
    );
    for (const m of misses.slice(0, 20)) {
      console.log(`  [${m.id}] "${m.question}"`);
      console.log(`    expected : ${m.expectedRefs.join(", ")}`);
      console.log(`    got      : ${m.gotRefs.join(", ") || "(none)"}`);
      console.log(`    latency  : ${m.latencyMs} ms`);
      console.log();
    }
  }

  const exactMisses = caseResults.filter((result) => !result.expectedRefHit);
  if (exactMisses.length > 0) {
    console.log(
      "\n  EXACT-REFERENCE MISSES (chapter fallback may still pass):\n",
    );
    for (const m of exactMisses.slice(0, 20)) {
      console.log(`  [${m.id}] "${m.question}"`);
      console.log(`    expected : ${m.expectedRefs.join(", ")}`);
      console.log(`    got      : ${m.gotRefs.join(", ") || "(none)"}`);
      console.log();
    }
  }

  if (verbose && passes.length > 0) {
    console.log("\n  PASSES:\n");
    for (const p of passes) {
      console.log(
        `  ✅ [${p.id}] rank ${p.rank} → ${p.firstHitRef}  (${p.latencyMs} ms)`,
      );
    }
    console.log();
  }

  // ── Per-query inspection table (first 50 for manual review) ────────────────

  console.log(hr("─", 60));
  console.log("  MANUAL INSPECTION TABLE (top result per query)");
  console.log(hr("─", 60));
  console.log(
    `  ${"#".padEnd(4)} ${"ID".padEnd(16)} ${"Result".padEnd(8)} ${"Top ref".padEnd(8)} ${"Score".padEnd(8)} Translation snippet`,
  );
  console.log(
    `  ${"─".repeat(4)} ${"─".repeat(16)} ${"─".repeat(8)} ${"─".repeat(8)} ${"─".repeat(8)} ${"─".repeat(30)}`,
  );

  for (let i = 0; i < Math.min(cases.length, 50); i++) {
    const evalCase = cases[i]!;
    // Re-run only if we need more detail (we already have pass/miss info)
    // Find the row for this case in passes or misses
    const isPassed = passes.some((p) => p.id === evalCase.id);
    const passInfo = passes.find((p) => p.id === evalCase.id);
    const missInfo = misses.find((m) => m.id === evalCase.id);
    const topRef = passInfo?.firstHitRef ?? missInfo?.gotRefs[0] ?? "—";
    const result = isPassed ? "PASS ✅" : "MISS ❌";

    // Find the score from a quick lookup
    const allRows = await keywordRetrieve(
      pool,
      evalCase.question,
      evalCase.personaId,
      evalCase.themes ?? [],
      1,
    );
    const topRow = allRows[0];
    const scoreStr = topRow ? topRow.score.toFixed(4) : "—";
    const snippet = topRow
      ? topRow.translation.slice(0, 45).replace(/\n/g, " ") + "…"
      : "no results";

    console.log(
      `  ${String(i + 1).padEnd(4)} ${evalCase.id.padEnd(16)} ${result.padEnd(8)} ${topRef.padEnd(8)} ${scoreStr.padEnd(8)} ${snippet}`,
    );
  }
  console.log();

  // ── Gate check ─────────────────────────────────────────────────────────────

  const gateFailures = [
    recallAt5 < THRESHOLDS.recallAt5
      ? `Recall@5 ${(recallAt5 * 100).toFixed(1)}% < ${(THRESHOLDS.recallAt5 * 100).toFixed(0)}% required`
      : null,
    expectedRefHitRate < THRESHOLDS.expectedRefHitRate
      ? `Expected-ref hit rate ${(expectedRefHitRate * 100).toFixed(1)}% < ${(THRESHOLDS.expectedRefHitRate * 100).toFixed(0)}% required`
      : null,
    sourceHitRate < THRESHOLDS.sourceHitRate
      ? `Source-hit rate ${(sourceHitRate * 100).toFixed(1)}% < ${(THRESHOLDS.sourceHitRate * 100).toFixed(0)}% required`
      : null,
    zeroResultRate > THRESHOLDS.zeroResultRate
      ? `Zero-result rate ${(zeroResultRate * 100).toFixed(1)}% > ${(THRESHOLDS.zeroResultRate * 100).toFixed(0)}% allowed`
      : null,
    unsupportedAnswerRate > THRESHOLDS.unsupportedAnswerRate
      ? `Unsupported-answer proxy ${(unsupportedAnswerRate * 100).toFixed(1)}% > ${(THRESHOLDS.unsupportedAnswerRate * 100).toFixed(0)}% allowed`
      : null,
    p95 > THRESHOLDS.p95LatencyMs
      ? `p95 latency ${p95} ms > ${THRESHOLDS.p95LatencyMs} ms allowed`
      : null,
  ].filter((x): x is string => x !== null);

  const artifactDir = path.resolve(
    process.cwd(),
    "data/evals/scripture-retrieval/runs",
  );
  fs.mkdirSync(artifactDir, { recursive: true });
  const artifactPath = path.join(
    artifactDir,
    `bhagavad-gita-v1-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  fs.writeFileSync(
    artifactPath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        evalFile: path.relative(process.cwd(), evalFile),
        cases: n,
        mode: "keyword-only",
        thresholds: THRESHOLDS,
        metrics: {
          recallAt5,
          expectedRefHitRate,
          mrr,
          sourceHitRate,
          zeroResultRate,
          unsupportedAnswerRate,
          p50LatencyMs: p50,
          p95LatencyMs: p95,
          p99LatencyMs: p99,
        },
        caseResults,
        passes,
        misses,
      },
      null,
      2,
    ),
  );
  console.log(`  Eval artifact: ${path.relative(process.cwd(), artifactPath)}`);
  console.log();

  if (noGate) {
    console.log(hr("═"));
    console.log("  Gate check skipped (--no-gate).");
    console.log(hr("═"));
  } else if (gateFailures.length === 0) {
    console.log(hr("═"));
    console.log("  ✅  ALL RELEASE GATES PASSED");
    console.log(hr("═"));
  } else {
    console.log(hr("═"));
    console.log("  ❌  RELEASE GATE FAILED — fix retrieval before shipping:");
    for (const f of gateFailures) console.log(`     • ${f}`);
    console.log(hr("═"));
    await pool.end();
    process.exit(1);
  }

  await pool.end();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
