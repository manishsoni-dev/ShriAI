#!/usr/bin/env tsx
import "dotenv/config";
import "./shim-server-only";

import { db } from "../src/lib/db";
import { toPgVectorLiteral } from "../src/lib/ingestion/vector";

const MODEL = process.env.SHRI_AI_EMBEDDING_MODEL ?? "qwen3-embedding:0.6b";
const DIMENSIONS = Number(process.env.SHRI_AI_EMBEDDING_DIMENSIONS ?? 1024);

function buildEmbeddingText(chunk: {
  canonicalRef: string;
  translation: string;
  commentary: string | null;
  practicalNote: string | null;
  themeTags: string[];
  emotionTags: string[];
  answerUseCases: string[];
}) {
  return [
    `Reference: ${chunk.canonicalRef}`,
    chunk.translation,
    chunk.commentary,
    chunk.practicalNote,
    chunk.themeTags.length ? `Themes: ${chunk.themeTags.join(", ")}` : null,
    chunk.emotionTags.length
      ? `Emotions: ${chunk.emotionTags.join(", ")}`
      : null,
    chunk.answerUseCases.length
      ? `Use cases: ${chunk.answerUseCases.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function main() {
  const { LocalEmbeddingProvider } =
    await import("../src/lib/ai/local-embedding-provider");
  const provider = new LocalEmbeddingProvider();
  const chunks = await db.scriptureChunk.findMany({
    where: {
      OR: [
        { embeddingModel: { not: MODEL } },
        { embeddingDimensions: { not: DIMENSIONS } },
        { embeddingGeneratedAt: null },
      ],
    },
    select: {
      id: true,
      canonicalRef: true,
      translation: true,
      commentary: true,
      practicalNote: true,
      themeTags: true,
      emotionTags: true,
      answerUseCases: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Embedding ${chunks.length} scripture chunks with ${MODEL}.`);
  for (const [index, chunk] of chunks.entries()) {
    const result = await provider.embedText({
      text: buildEmbeddingText(chunk),
    });
    if (result.embedding.length !== DIMENSIONS) {
      throw new Error(
        `Expected ${DIMENSIONS} dimensions, received ${result.embedding.length}.`,
      );
    }
    const vector = toPgVectorLiteral(result.embedding);
    await db.$executeRaw`
      UPDATE "ScriptureChunk"
      SET "embedding" = ${vector}::vector,
          "embeddingProvider" = 'ollama',
          "embeddingModel" = ${MODEL},
          "embeddingDimensions" = ${DIMENSIONS},
          "embeddingVersion" = 'local-ollama-v1',
          "embeddingGeneratedAt" = NOW(),
          "embeddingNormalized" = true,
          "updatedAt" = NOW()
      WHERE "id" = ${chunk.id}
    `;
    console.log(`[${index + 1}/${chunks.length}] ${chunk.canonicalRef}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
