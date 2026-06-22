import "dotenv/config";
import { db } from "../src/lib/db";
import * as readline from "node:readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log("Starting Interactive CLI Review...");

  // Allow passing a source via command line, default to Bhagavad Gita
  const sourceTitle = process.argv[2] || "Bhagavad Gita";

  let user = await db.user.findFirst();

  if (!user) {
    user = await db.user.create({
      data: {
        email: "reviewer@shri-ai.com",
        name: "CLI Reviewer",
        passwordHash: "dummy",
      },
    });
  }

  const chunksToReview = await db.scriptureChunk.findMany({
    where: {
      source: {
        canonicalTitle: sourceTitle,
      },
      OR: [
        { reviews: { none: {} } },
        { reviews: { some: { reviewStatus: "pending" } } },
      ],
    },
    include: {
      reviews: true,
    },
    orderBy: {
      canonicalRef: "asc",
    },
  });

  console.log(
    `Found ${chunksToReview.length} pending chunks to review for ${sourceTitle}.`,
  );

  let approved = 0;
  let rejected = 0;
  let skipped = 0;

  for (const chunk of chunksToReview) {
    console.log(
      `\n────────────────────────────────────────────────────────────`,
    );
    console.log(`Chunk: ${sourceTitle} ${chunk.canonicalRef}`);
    console.log(`Translation: ${chunk.translation}`);
    if (chunk.commentary) console.log(`Commentary: ${chunk.commentary}`);
    console.log(`────────────────────────────────────────────────────────────`);

    const answer = await askQuestion(
      `Approve this chunk for voice? (y/n/s to skip/q to quit): `,
    );
    const action = answer.trim().toLowerCase();

    if (action === "q") {
      console.log("Quitting review session.");
      break;
    }

    if (action === "s") {
      console.log("Skipped.");
      skipped++;
      continue;
    }

    const isApproved = action === "y";
    const nextStatus = isApproved ? "approved" : "rejected";
    let review = chunk.reviews?.[0];

    await db.$transaction(async (tx) => {
      if (!review) {
        review = await tx.scriptureChunkReview.create({
          data: {
            chunkId: chunk.id,
            reviewStatus: nextStatus,
            approvedForVoice: isApproved,
            reviewedBy: user.id,
            reviewedAt: new Date(),
            accuracyScore: isApproved ? 5 : 1,
            interpretationNotes: `Manually reviewed via interactive CLI. Action: ${nextStatus}.`,
            reviewOrigin: "human",
          },
        });
      } else {
        await tx.scriptureChunkReview.update({
          where: { id: review.id },
          data: {
            reviewStatus: nextStatus,
            approvedForVoice: isApproved,
            reviewedBy: user.id,
            reviewedAt: new Date(),
            accuracyScore: isApproved ? 5 : 1,
            interpretationNotes: `Manually reviewed via interactive CLI. Action: ${nextStatus}.`,
            reviewOrigin: "human",
          },
        });
      }

      await tx.scriptureChunkReviewAudit.create({
        data: {
          reviewId: review.id,
          scriptureChunkId: chunk.id,
          previousStatus: "pending",
          nextStatus: nextStatus,
          previousApprovedForVoice: false,
          nextApprovedForVoice: isApproved,
          reviewerUserId: user.id,
          notes: `Interactive CLI review decision: ${nextStatus}`,
        },
      });
    });

    if (isApproved) {
      console.log(`✓ Approved: ${chunk.canonicalRef}`);
      approved++;
    } else {
      console.log(`✗ Rejected: ${chunk.canonicalRef}`);
      rejected++;
    }
  }

  console.log(
    `\nReview session complete. Approved: ${approved}, Rejected: ${rejected}, Skipped: ${skipped}`,
  );
  rl.close();
}

main()
  .catch((err) => {
    console.error("Error:", err);
    rl.close();
  })
  .finally(() => db.$disconnect());
