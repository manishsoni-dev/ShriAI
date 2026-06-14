#!/usr/bin/env tsx
/**
 * scripts/embed-scriptures.ts
 *
 * Generates OpenAI embeddings for all ScriptureChunk records that have no
 * embedding yet (or where --force flag is passed).
 *
 * Usage:
 *   npx tsx scripts/embed-scriptures.ts
 *   npx tsx scripts/embed-scriptures.ts --force   # re-embed all
 *   npx tsx scripts/embed-scriptures.ts --limit 50
 *   npx tsx scripts/embed-scriptures.ts --source=bhagavad-gita
 *   npx tsx scripts/embed-scriptures.ts --dry-run
 */

import "dotenv/config";
import { db } from "../src/lib/db";
import OpenAI from "openai";

const args = process.argv.slice(2);
const isForce = args.includes("--force");
const isDryRun = args.includes("--dry-run");

let batchLimit: number | undefined = undefined;
const limitArg = args.find((a) => a.startsWith("--limit="));
if (limitArg) {
  batchLimit = Number(limitArg.split("=")[1]);
}

let sourceFilter: string | undefined = undefined;
const sourceArg = args.find((a) => a.startsWith("--source="));
if (sourceArg) {
  sourceFilter = sourceArg.split("=")[1];
}

// ── OpenAI setup ─────────────────────────────────────────────────────────────

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL =
  process.env.AI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = Number(
  process.env.AI_EMBEDDING_DIMENSIONS ?? 1536,
);

const openai = new OpenAI({ apiKey: OPENAI_API_KEY || "dummy" });

// ── Helpers ───────────────────────────────────────────────────────────────────

function toPgVectorLiteral(embedding: number[]) {
  return `[${embedding.map((v) => Number(v).toFixed(8)).join(",")}]`;
}

function buildEmbeddingText(chunk: {
  canonicalRef: string;
  translation: string;
  commentary: string | null;
  practicalNote: string | null;
  themeTags: string[];
  emotionTags: string[];
  answerUseCases: string[];
}): string {
  const parts = [
    `Reference: ${chunk.canonicalRef}`,
    chunk.translation,
    chunk.commentary ?? "",
    chunk.practicalNote ?? "",
    chunk.themeTags.length > 0 ? `Themes: ${chunk.themeTags.join(", ")}` : "",
    chunk.emotionTags.length > 0
      ? `Emotions: ${chunk.emotionTags.join(", ")}`
      : "",
    chunk.answerUseCases.length > 0
      ? `Use Cases: ${chunk.answerUseCases.join(", ")}`
      : "",
  ].filter(Boolean);

  return parts.join("\n\n");
}

async function embedText(text: string): Promise<number[]> {
  if (isDryRun) {
    return Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.01);
  }
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });
  return response.data[0]?.embedding ?? [];
}

async function setChunkEmbedding(chunkId: string, embedding: number[]) {
  if (isDryRun) return;
  const vector = toPgVectorLiteral(embedding);
  await db.$executeRaw`
    UPDATE "ScriptureChunk"
    SET "embedding" = ${vector}::vector,
        "updatedAt" = NOW()
    WHERE "id" = ${chunkId}
  `;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// Exponential backoff retry
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  initialDelayMs = 1000,
): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (err: unknown) {
      attempt++;
      if (attempt >= retries) throw err;
      const delay = initialDelayMs * Math.pow(2, attempt - 1);
      console.warn(`    ⚠️ Retry ${attempt}/${retries} after ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw new Error("Unreachable");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    `\nShri AI — Scripture Embeddings${isDryRun ? " (DRY RUN)" : ""}`,
  );
  console.log(`Model: ${EMBEDDING_MODEL} (${EMBEDDING_DIMENSIONS}d)`);
  console.log(`Mode: ${isForce ? "force re-embed all" : "embed missing only"}`);
  if (batchLimit) console.log(`Limit: ${batchLimit} chunks`);
  if (sourceFilter) console.log(`Source Filter: ${sourceFilter}`);
  console.log("");

  // Construct raw query to find missing embeddings
  let query = `
    SELECT c.id
    FROM "ScriptureChunk" c
    JOIN "ScriptureSource" s ON c."sourceId" = s.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (!isForce) {
    query += ` AND c.embedding IS NULL`;
  }

  if (sourceFilter) {
    params.push(`%${sourceFilter}%`);
    query += ` AND s."canonicalTitle" ILIKE $${params.length}`;
  }

  query += ` ORDER BY c."createdAt" ASC`;

  if (batchLimit) {
    params.push(batchLimit);
    query += ` LIMIT $${params.length}`;
  }

  const chunkIdsObj = await db.$queryRawUnsafe<{ id: string }[]>(
    query,
    ...params,
  );
  const chunkIds = chunkIdsObj.map((row) => row.id);

  if (chunkIds.length === 0) {
    console.log("✓ No chunks found needing embeddings. Nothing to do.");
    console.log("  Use --force to re-embed all chunks.\n");
    return;
  }

  if (!OPENAI_API_KEY && !isDryRun) {
    console.error(
      "✗ OPENAI_API_KEY is not set. Embeddings cannot be generated.",
    );
    console.error("  Set it in .env.local or export it in your shell.");
    process.exit(1);
  }

  // Fetch full details for those chunks via Prisma findMany
  const chunks = await db.scriptureChunk.findMany({
    where: { id: { in: chunkIds } },
    select: {
      id: true,
      canonicalRef: true,
      translation: true,
      commentary: true,
      practicalNote: true,
      themeTags: true,
      emotionTags: true,
      answerUseCases: true,
      source: { select: { canonicalTitle: true } },
    },
  });

  // Re-sort to match original DB return order
  const idToChunk = new Map(chunks.map((c) => [c.id, c]));
  const sortedChunks = chunkIds.map((id) => idToChunk.get(id)!).filter(Boolean);

  console.log(`Processing ${sortedChunks.length} chunk(s)...\n`);

  let succeeded = 0;
  let failed = 0;

  for (const [i, chunk] of sortedChunks.entries()) {
    const progress = `[${i + 1}/${sortedChunks.length}]`;
    const label = `${chunk.source.canonicalTitle} ${chunk.canonicalRef}`;

    try {
      const text = buildEmbeddingText(chunk);
      const embedding = await withRetry(() => embedText(text));

      if (embedding.length === 0) {
        throw new Error("Empty embedding returned");
      }

      await setChunkEmbedding(chunk.id, embedding);
      console.log(`  ${progress} ✓  ${label}`);
      succeeded++;

      if (!isDryRun) await sleep(20);
    } catch (err) {
      console.error(`  ${progress} ✗  ${label}: ${String(err)}`);
      failed++;
    }
  }

  console.log("\n──────────────────────────────────────────");
  console.log(`Done: ${succeeded} embedded, ${failed} failed`);
  if (isDryRun) {
    console.log("(Dry run — no database changes were made.)");
  }

  if (failed > 0) {
    console.log(
      "\nTo retry failed chunks, run the script again (it will skip already-embedded chunks).",
    );
  }

  if (succeeded > 0 && !isDryRun) {
    console.log(
      "\nEmbeddings stored. The Scripture RAG engine is ready to retrieve.",
    );
  }

  console.log("");
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
