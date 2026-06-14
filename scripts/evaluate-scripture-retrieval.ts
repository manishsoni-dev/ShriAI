#!/usr/bin/env tsx
import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { retrieveScriptureContext, type ScriptureRetrievalResult } from "../src/lib/rag/scripture-retrieval";
import { type PersonaId } from "../src/lib/personas";
import { getActiveExperimentConfig, setActiveExperimentConfig, type RetrievalExperimentConfig } from "../src/lib/rag/experiment-config";

const argv = process.argv.slice(2);
const noGate = argv.includes("--no-gate");
const verbose = argv.includes("--verbose");
const fileArg = argv.find((a) => a.startsWith("--file="));
const evalFile = path.resolve(
  process.cwd(),
  fileArg?.slice("--file=".length) ?? "data/evals/scripture-retrieval/retrieval_dev.json",
);

const THRESHOLDS = {
  recallAt5: 0.75,
  expectedRefHitRate: 0.7,
  sourceHitRate: 0.7,
  zeroResultRate: 0.1,
  unsupportedAnswerRate: 0.1,
  p95LatencyMs: 2500, // relaxed slightly for vector search
} as const;

type EvalCase = {
  id: string;
  question: string;
  personaId: PersonaId;
  themes?: string[];
  expectedRefs: string[];
  acceptableChapters?: number[];
  expectedSource?: string;
};

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

async function main() {
  if (!fs.existsSync(evalFile)) {
    console.error(`✗ Eval file not found: ${evalFile}`);
    process.exit(1);
  }
  
  const evalData = JSON.parse(fs.readFileSync(evalFile, "utf-8"));
  // In our new format, evalData.cases contains the array
  const cases: EvalCase[] = Array.isArray(evalData) ? evalData : evalData.cases;
  
  if (!Array.isArray(cases) || cases.length === 0) {
    console.error("✗ Eval file is empty or not an array.");
    process.exit(1);
  }

  const config = getActiveExperimentConfig();
  console.log(hr("═"));
  console.log("  Shri AI — Scripture Retrieval Evaluation");
  console.log(hr("═"));
  console.log(`  Corpus file : ${path.relative(process.cwd(), evalFile)}`);
  console.log(`  Experiment  : ${config.id}`);
  console.log(`  Cases       : ${cases.length}`);
  console.log(`  Mode        : Production Pipeline (Vector + Keyword)`);
  console.log(hr());
  console.log();

  let recallHits = 0;
  let expectedRefHits = 0;
  let rrTotal = 0;
  let sourceHits = 0;
  let zeroResults = 0;
  let unsupportedAnswers = 0;
  const latencies: number[] = [];

  const passes: any[] = [];
  const misses: any[] = [];
  const caseResults: any[] = [];

  for (let i = 0; i < cases.length; i++) {
    const evalCase = cases[i];
    
    // Throttle queries slightly to avoid overwhelming DB/Embeddings locally
    if (i > 0 && i % 5 === 0) {
       await new Promise(r => setTimeout(r, 1000));
    }
    
    const result = await retrieveScriptureContext({
      query: evalCase.question,
      personaId: evalCase.personaId,
      themes: evalCase.themes ?? [],
      limit: 5,
      debugMode: true,
      mode: "chat" as any,
    });
    
    const latencyMs = result.debug?.totalMs ?? 0;
    latencies.push(latencyMs);

    const gotRefs = result.chunks.map((r) => r.canonicalRef);
    const expectedSet = new Set(evalCase.expectedRefs);
    const acceptableChapters = new Set(evalCase.acceptableChapters ?? []);

    const firstHitIndex = gotRefs.findIndex(
      (ref) => expectedSet.has(ref) || acceptableChapters.has(chapterOf(ref)),
    );
    const firstExactHitIndex = gotRefs.findIndex((ref) => expectedSet.has(ref));
    
    const hasHit = firstHitIndex >= 0;
    const hasExactHit = firstExactHitIndex >= 0;

    recallHits += hasHit ? 1 : 0;
    expectedRefHits += hasExactHit ? 1 : 0;
    rrTotal += hasHit ? 1 / (firstHitIndex + 1) : 0;

    const targetSource = evalCase.expectedSource ?? "Bhagavad Gita";
    const correctSource = result.chunks.length > 0 && result.chunks.some((r) => r.sourceTitle === targetSource);
    
    if (evalCase.id === "gita-eval-001") {
      console.log(`[DEBUG] targetSource: ${targetSource}, chunkSources: ${result.chunks.map(c => c.sourceTitle).join(', ')}`);
    }
    if (correctSource) sourceHits++;

    if (result.chunks.length === 0) zeroResults++;
    if (result.chunks.length === 0 || !correctSource) unsupportedAnswers++;

    caseResults.push({
      id: evalCase.id,
      question: evalCase.question,
      expectedRefs: evalCase.expectedRefs,
      gotRefs,
      recallHit: hasHit,
      expectedRefHit: hasExactHit,
      firstHitRank: hasHit ? firstHitIndex + 1 : null,
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
    
    if (verbose) {
       console.log(`[${evalCase.id}] ${hasHit ? "✅" : "❌"} ${latencyMs}ms - Got ${result.chunks.length} chunks`);
       if (i === 0) console.log(JSON.stringify(result.debug, null, 2));
    }
  }

  const n = cases.length;
  const recallAt5 = recallHits / n;
  const expectedRefHitRate = expectedRefHits / n;
  const mrr = rrTotal / n;
  const sourceHitRate = sourceHits / n;
  const zeroResultRate = zeroResults / n;
  const unsupportedAnswerRate = unsupportedAnswers / n;
  const p50 = percentile(latencies, 0.5);
  const p95 = percentile(latencies, 0.95);

  console.log(hr("─", 60));
  console.log("  RETRIEVAL METRICS");
  console.log(hr("─", 60));

  function gate(value: number, threshold: number, mode: "gte" | "lte"): string {
    const pass = mode === "gte" ? value >= threshold : value <= threshold;
    return pass ? "✅ PASS" : "❌ FAIL";
  }

  console.log(`  ${pad("Recall@5", 30)} ${(recallAt5 * 100).toFixed(1).padStart(6)}%   ${gate(recallAt5, THRESHOLDS.recallAt5, "gte")}  (gate >= ${(THRESHOLDS.recallAt5 * 100).toFixed(0)}%)`);
  console.log(`  ${pad("Expected-ref hit rate", 30)} ${(expectedRefHitRate * 100).toFixed(1).padStart(6)}%   ${gate(expectedRefHitRate, THRESHOLDS.expectedRefHitRate, "gte")}  (gate >= ${(THRESHOLDS.expectedRefHitRate * 100).toFixed(0)}%)`);
  console.log(`  ${pad("MRR", 30)} ${(mrr * 100).toFixed(1).padStart(6)}%   (informational)`);
  console.log(`  ${pad("Source-hit rate", 30)} ${(sourceHitRate * 100).toFixed(1).padStart(6)}%   ${gate(sourceHitRate, THRESHOLDS.sourceHitRate, "gte")}  (gate >= ${(THRESHOLDS.sourceHitRate * 100).toFixed(0)}%)`);
  console.log(`  ${pad("Zero-result rate", 30)} ${(zeroResultRate * 100).toFixed(1).padStart(6)}%   ${gate(zeroResultRate, THRESHOLDS.zeroResultRate, "lte")}  (gate <= ${(THRESHOLDS.zeroResultRate * 100).toFixed(0)}%)`);
  console.log(`  ${pad("Unsupported-answer proxy", 30)} ${(unsupportedAnswerRate * 100).toFixed(1).padStart(6)}%   ${gate(unsupportedAnswerRate, THRESHOLDS.unsupportedAnswerRate, "lte")}  (gate <= ${(THRESHOLDS.unsupportedAnswerRate * 100).toFixed(0)}%)`);
  console.log();
  console.log(hr("─", 60));
  console.log("  LATENCY");
  console.log(hr("─", 60));
  console.log(`  ${pad("p50 latency", 30)} ${String(p50).padStart(6)} ms`);
  console.log(`  ${pad("p95 latency", 30)} ${String(p95).padStart(6)} ms   ${gate(p95, THRESHOLDS.p95LatencyMs, "lte")}  (gate <= ${THRESHOLDS.p95LatencyMs} ms)`);
  console.log();

  const artifactDir = path.resolve(process.cwd(), "data/evals/scripture-retrieval/runs");
  if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
  const artifactPath = path.join(artifactDir, `eval-run-${config.id}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  
  fs.writeFileSync(
    artifactPath,
    JSON.stringify({
      createdAt: new Date().toISOString(),
      experimentConfig: config,
      evalFile: path.relative(process.cwd(), evalFile),
      cases: n,
      mode: "production-pipeline",
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
      },
      caseResults,
    }, null, 2)
  );
  console.log(`  Eval artifact: ${path.relative(process.cwd(), artifactPath)}`);
  console.log();

  const gateFailures = [
    recallAt5 < THRESHOLDS.recallAt5 ? "Recall@5 too low" : null,
    expectedRefHitRate < THRESHOLDS.expectedRefHitRate ? "Expected-ref hit rate too low" : null,
    sourceHitRate < THRESHOLDS.sourceHitRate ? "Source-hit rate too low" : null,
    zeroResultRate > THRESHOLDS.zeroResultRate ? "Zero-result rate too high" : null,
    unsupportedAnswerRate > THRESHOLDS.unsupportedAnswerRate ? "Unsupported-answer proxy too high" : null,
    p95 > THRESHOLDS.p95LatencyMs ? "p95 latency too high" : null,
  ].filter((x): x is string => x !== null);

  if (noGate) {
    console.log("  Gate check skipped (--no-gate).");
  } else if (gateFailures.length === 0) {
    console.log("  ✅  ALL RELEASE GATES PASSED");
  } else {
    console.log("  ❌  RELEASE GATE FAILED:");
    for (const f of gateFailures) console.log(`     • ${f}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
