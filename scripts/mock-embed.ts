import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  const ishaChunks = await db.scriptureChunk.findMany({
    where: {
      source: {
        canonicalTitle: "Isha Upanishad",
      },
    },
  });

  const dummyEmbedding = Array.from(
    { length: 1024 },
    () => Math.random() * 0.02 - 0.01,
  );
  const vector = `[${dummyEmbedding.map((v) => Number(v).toFixed(8)).join(",")}]`;

  for (const chunk of ishaChunks) {
    await db.$executeRaw`
      UPDATE "ScriptureChunk"
      SET "embedding" = ${vector}::vector,
          "updatedAt" = NOW()
      WHERE "id" = ${chunk.id}
    `;
    console.log(`Mock-embedded ${chunk.id}`);
  }

  console.log("Mock embedding complete.");
}

main().finally(() => db.$disconnect());
