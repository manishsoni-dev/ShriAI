#!/usr/bin/env tsx
import "dotenv/config";
import { db } from "../src/lib/db";
import { pipeline } from "@xenova/transformers";

const EMBEDDING_DIMENSIONS = 1536;

function toPgVectorLiteral(embedding: number[]) {
  return `[${embedding.map((v) => Number(v).toFixed(8)).join(",")}]`;
}

function buildEmbeddingText(chunk: any): string {
  const parts = [
    `Reference: ${chunk.canonicalRef}`,
    chunk.translation,
    chunk.commentary ?? "",
    chunk.practicalNote ?? "",
    chunk.themeTags.length > 0 ? `Themes: ${chunk.themeTags.join(", ")}` : "",
    chunk.emotionTags.length > 0 ? `Emotions: ${chunk.emotionTags.join(", ")}` : "",
    chunk.answerUseCases.length > 0 ? `Use Cases: ${chunk.answerUseCases.join(", ")}` : "",
  ].filter(Boolean);

  return parts.join("\n\n");
}

async function main() {
  console.log("Loading local Xenova/all-MiniLM-L6-v2 transformer pipeline...");
  const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

  const chunks = await db.scriptureChunk.findMany({
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
  });

  console.log(`Generating local embeddings for ${chunks.length} chunks...`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const text = buildEmbeddingText(chunk);
    
    const output = await extractor(text, { pooling: "mean", normalize: true });
    
    // Extractor outputs Float32Array of length 384
    const baseVector = Array.from(output.data);
    
    // Pad to 1536 dimensions
    const paddedVector = new Array(EMBEDDING_DIMENSIONS).fill(0);
    for (let j = 0; j < baseVector.length; j++) {
      paddedVector[j] = baseVector[j];
    }
    
    const vectorLiteral = toPgVectorLiteral(paddedVector);

    await db.$executeRaw`
      UPDATE "ScriptureChunk"
      SET "embedding" = ${vectorLiteral}::vector,
          "updatedAt" = NOW()
      WHERE "id" = ${chunk.id}
    `;

    if (i % 50 === 0) {
      console.log(`Processed ${i}/${chunks.length} chunks`);
    }
  }

  console.log("Local embeddings generation complete!");
}

main().catch(console.error).finally(() => db.$disconnect());
