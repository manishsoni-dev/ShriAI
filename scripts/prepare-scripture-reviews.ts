#!/usr/bin/env tsx
import "dotenv/config";

import { db } from "../src/lib/db";

async function main() {
  const chunks = await db.scriptureChunk.findMany({
    select: {
      id: true,
      canonicalRef: true,
      source: {
        select: {
          active: true,
        },
      },
    },
    orderBy: [{ sourceId: "asc" }, { canonicalRef: "asc" }],
  });
  const inactiveSourceChunks = chunks.filter((chunk) => !chunk.source.active);

  let created = 0;
  for (const chunk of chunks) {
    const existing = await db.scriptureChunkReview.findUnique({
      where: { chunkId: chunk.id },
      select: { id: true },
    });
    if (existing) continue;

    await db.scriptureChunkReview.create({
      data: {
        chunkId: chunk.id,
        reviewStatus: "pending",
      },
    });
    created++;
  }

  const counts = await db.scriptureChunkReview.groupBy({
    by: ["reviewStatus", "approvedForVoice"],
    _count: { _all: true },
    orderBy: [{ reviewStatus: "asc" }, { approvedForVoice: "asc" }],
  });

  console.log("Scripture review preparation complete.");
  console.log(`Chunks found: ${chunks.length}`);
  console.log(
    `Chunks from inactive sources retained for audit/review: ${inactiveSourceChunks.length}`,
  );
  console.log(`Pending review rows created: ${created}`);
  console.log(
    "Policy: existing reviews are never reset; missing chunks receive pending rows; inactive-source chunks are excluded later by voice retrieval gates.",
  );
  console.log("Review counts:");
  for (const count of counts) {
    console.log(
      `  ${count.reviewStatus} / voice=${count.approvedForVoice}: ${count._count._all}`,
    );
  }
}

main()
  .catch((error) => {
    console.error("Fatal:", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
