#!/usr/bin/env tsx
import "dotenv/config";

import * as fs from "node:fs";
import Module from "node:module";
import * as path from "node:path";

import { db } from "../src/lib/db";

type Gate = {
  name: string;
  passed: boolean;
  details: string;
};

const REQUIRED_TABLES = [
  "ScriptureSource",
  "ScriptureChunk",
  "ScriptureChunkReview",
  "ScriptureChunkReviewAudit",
  "RetrievalLog",
  "AnswerCitation",
  "VoiceQaRun",
  "VoiceQaStep",
];

const REQUIRED_MIGRATIONS = [
  "20260612000000_add_scripture_rag_tables",
  "20260612143000_add_scripture_chunk_reviews",
  "20260612144500_add_voice_qa_runs",
  "20260612160000_add_needs_changes_review_status",
  "20260612161000_add_scripture_review_workflow_audit",
];

const releaseEnvironment = process.env.RELEASE_ENVIRONMENT ?? "staging";
const minVoiceApprovedChunks = Number(
  process.env.RELEASE_MIN_VOICE_APPROVED_CHUNKS ?? "1",
);
const minVoiceApprovedPercent = Number(
  process.env.RELEASE_MIN_VOICE_APPROVED_PERCENT ?? "1",
);
const requireCompletedVoiceQa =
  (process.env.RELEASE_REQUIRE_COMPLETED_VOICE_QA ?? "true") !== "false";

function installServerOnlyShimForCli() {
  const moduleWithLoad = Module as unknown as {
    _load: (
      request: string,
      parent: NodeModule | null | undefined,
      isMain: boolean,
    ) => unknown;
  };
  const originalLoad = moduleWithLoad._load;

  moduleWithLoad._load = function patchedLoad(request, parent, isMain) {
    if (request === "server-only") return {};
    return originalLoad.call(this, request, parent, isMain);
  };
}

installServerOnlyShimForCli();

function configured(value: string | undefined) {
  return Boolean(value && value.trim() && !value.includes("replace-with"));
}

function gate(name: string, passed: boolean, details: string): Gate {
  return { name, passed, details };
}

function latestEvalArtifact() {
  const dir = path.resolve(
    process.cwd(),
    "data/evals/scripture-retrieval/runs",
  );
  if (!fs.existsSync(dir)) return null;

  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort();

  const latest = files.at(-1);
  return latest ? path.join(dir, latest) : null;
}

function evalArtifactPasses(artifact: unknown) {
  const data = artifact as {
    thresholds?: Record<string, number>;
    metrics?: Record<string, number>;
  };
  const thresholds = data.thresholds ?? {};
  const metrics = data.metrics ?? {};

  const failures = [
    metrics.recallAt5 < thresholds.recallAt5 ? "Recall@5" : null,
    metrics.expectedRefHitRate < thresholds.expectedRefHitRate
      ? "Expected-ref hit rate"
      : null,
    metrics.sourceHitRate < thresholds.sourceHitRate ? "Source-hit rate" : null,
    metrics.zeroResultRate > thresholds.zeroResultRate
      ? "Zero-result rate"
      : null,
    metrics.unsupportedAnswerRate > thresholds.unsupportedAnswerRate
      ? "Unsupported-answer proxy"
      : null,
    metrics.p95LatencyMs > thresholds.p95LatencyMs ? "p95 latency" : null,
  ].filter((item): item is string => item !== null);

  return {
    passed: failures.length === 0,
    failures,
    cases: (artifact as { cases?: number }).cases ?? 0,
  };
}

async function tableExists(tableName: string) {
  const result = await db.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
    ) AS "exists"
  `;
  return Boolean(result[0]?.exists);
}

async function appliedMigrationNames() {
  const result = await db.$queryRaw<Array<{ migration_name: string }>>`
    SELECT migration_name
    FROM "_prisma_migrations"
    WHERE finished_at IS NOT NULL
  `;
  return new Set(result.map((row) => row.migration_name));
}

async function main() {
  const gates: Gate[] = [];

  try {
    await db.$queryRaw`SELECT 1`;
    gates.push(gate("Database reachable", true, "Connection succeeded."));
  } catch (error) {
    gates.push(
      gate(
        "Database reachable",
        false,
        error instanceof Error ? error.message : "Connection failed.",
      ),
    );
    printAndExit(gates);
    return;
  }

  const migrations = await appliedMigrationNames().catch(
    () => new Set<string>(),
  );
  const missingMigrations = REQUIRED_MIGRATIONS.filter(
    (name) => !migrations.has(name),
  );
  gates.push(
    gate(
      "Required migrations",
      missingMigrations.length === 0,
      missingMigrations.length
        ? `Missing: ${missingMigrations.join(", ")}`
        : "All required migrations applied.",
    ),
  );

  const missingTables: string[] = [];
  for (const table of REQUIRED_TABLES) {
    if (!(await tableExists(table))) missingTables.push(table);
  }
  gates.push(
    gate(
      "Required tables",
      missingTables.length === 0,
      missingTables.length
        ? `Missing: ${missingTables.join(", ")}`
        : "Present.",
    ),
  );

  const [totalChunks, reviewCount, voiceApproved] = await Promise.all([
    db.scriptureChunk.count(),
    db.scriptureChunkReview.count(),
    db.scriptureChunkReview.count({
      where: {
        reviewStatus: "approved",
        reviewOrigin: "human",
        approvedForVoice: true,
        chunk: {
          source: {
            active: true,
            copyrightStatus: {
              in: ["public_domain", "public-domain", "licensed"],
            },
          },
        },
      },
    }),
  ]);
  const voiceApprovedPercent =
    totalChunks === 0 ? 0 : (voiceApproved / totalChunks) * 100;

  gates.push(
    gate(
      "Scripture corpus",
      totalChunks > 0 && reviewCount >= totalChunks,
      `${totalChunks} chunks, ${reviewCount} review rows.`,
    ),
  );
  gates.push(
    gate(
      "Voice-approved coverage",
      voiceApproved >= minVoiceApprovedChunks &&
        voiceApprovedPercent >= minVoiceApprovedPercent,
      `${voiceApproved}/${totalChunks} chunks (${voiceApprovedPercent.toFixed(1)}%), required ${minVoiceApprovedChunks} and ${minVoiceApprovedPercent}%.`,
    ),
  );

  const artifactPath = latestEvalArtifact();
  if (!artifactPath) {
    gates.push(
      gate(
        "Latest retrieval eval",
        false,
        "No artifact found in data/evals/scripture-retrieval/runs.",
      ),
    );
  } else {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    const result = evalArtifactPasses(artifact);
    gates.push(
      gate(
        "Latest retrieval eval",
        result.passed,
        result.passed
          ? `${path.relative(process.cwd(), artifactPath)} passed (${result.cases} cases).`
          : `Failed: ${result.failures.join(", ")}`,
      ),
    );
  }

  const { retrieveScriptureContext } =
    await import("../src/lib/rag/scripture-retrieval");
  const voiceRetrieval = await retrieveScriptureContext({
    query: "karma duty action",
    personaId: "krishna",
    mode: "voice",
    limit: 5,
  });
  const returnedIds = voiceRetrieval.chunks.map((chunk) => chunk.id);
  const unsafeReturned =
    returnedIds.length === 0
      ? 0
      : await db.scriptureChunk.count({
          where: {
            id: { in: returnedIds },
            NOT: {
              reviews: {
                some: {
                  reviewStatus: "approved",
                  reviewOrigin: "human",
                  approvedForVoice: true,
                },
              },
              source: {
                active: true,
                copyrightStatus: {
                  in: ["public_domain", "public-domain", "licensed"],
                },
              },
            },
          },
        });
  gates.push(
    gate(
      "Voice retrieval gate",
      unsafeReturned === 0,
      `${returnedIds.length} chunks returned, ${unsafeReturned} unsafe.`,
    ),
  );

  if (requireCompletedVoiceQa) {
    const completedVoiceQa = await db.voiceQaRun.count({
      where: {
        status: "passed",
        completedAt: { not: null },
        device: { not: null },
        browser: { not: null },
        OR: [
          { label: { contains: releaseEnvironment, mode: "insensitive" } },
          { notes: { contains: releaseEnvironment, mode: "insensitive" } },
        ],
      },
    });
    gates.push(
      gate(
        "Completed Voice QA",
        completedVoiceQa > 0,
        `${completedVoiceQa} passed completed runs for ${releaseEnvironment}.`,
      ),
    );
  } else {
    gates.push(
      gate(
        "Completed Voice QA",
        true,
        "Skipped by RELEASE_REQUIRE_COMPLETED_VOICE_QA=false.",
      ),
    );
  }

  const missingEnv = [
    configured(process.env.DATABASE_URL) ? null : "DATABASE_URL",
    configured(process.env.AUTH_SECRET) ? null : "AUTH_SECRET",
    configured(process.env.ADMIN_EMAILS) ||
    configured(process.env.REVIEWER_EMAILS)
      ? null
      : "ADMIN_EMAILS or REVIEWER_EMAILS",
    releaseEnvironment === "production" &&
    !configured(process.env.OPENAI_API_KEY)
      ? "OPENAI_API_KEY"
      : null,
    releaseEnvironment === "production" &&
    process.env.STT_PROVIDER === "deepgram" &&
    !configured(process.env.DEEPGRAM_API_KEY)
      ? "DEEPGRAM_API_KEY"
      : null,
    releaseEnvironment === "production" &&
    process.env.STT_PROVIDER === "google" &&
    !configured(process.env.GOOGLE_API_KEY)
      ? "GOOGLE_API_KEY"
      : null,
    releaseEnvironment === "production" &&
    (process.env.STT_PROVIDER ?? "openai") === "openai" &&
    !configured(process.env.OPENAI_API_KEY)
      ? "OPENAI_API_KEY"
      : null,
    releaseEnvironment === "production" &&
    !configured(process.env.ELEVENLABS_API_KEY)
      ? "ELEVENLABS_API_KEY"
      : null,
  ].filter((item): item is string => item !== null);

  gates.push(
    gate(
      "Required environment",
      missingEnv.length === 0,
      missingEnv.length
        ? `Missing: ${Array.from(new Set(missingEnv)).join(", ")}`
        : "Configured.",
    ),
  );

  printAndExit(gates);
}

function printAndExit(gates: Gate[]) {
  const nameWidth = Math.max(...gates.map((item) => item.name.length), 10);
  console.log("\nRelease readiness");
  console.log("=".repeat(80));
  console.log(`${"Gate".padEnd(nameWidth)}  Status  Details`);
  console.log("-".repeat(80));
  for (const item of gates) {
    console.log(
      `${item.name.padEnd(nameWidth)}  ${item.passed ? "PASS " : "FAIL "}  ${item.details}`,
    );
  }
  console.log("=".repeat(80));

  const failed = gates.filter((item) => !item.passed);
  if (failed.length > 0) {
    console.error(`Release readiness failed: ${failed.length} gate(s) failed.`);
    process.exit(1);
  }

  console.log("Release readiness passed.");
}

main()
  .catch((error) => {
    console.error("Fatal:", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
