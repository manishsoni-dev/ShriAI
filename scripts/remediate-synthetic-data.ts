#!/usr/bin/env tsx
import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  const syntheticReviews = await db.scriptureChunkReview.findMany({
    where: {
      reviewedBy: "ai-system-simulated-human",
      reviewStatus: "approved",
    },
    include: { chunk: true },
  });

  console.log(`Found ${syntheticReviews.length} synthetic reviews.`);

  let remediatedCount = 0;
  for (const review of syntheticReviews) {
    await db.$transaction(async (tx) => {
      // Return to pending, mark invalid, update origin
      await tx.scriptureChunkReview.update({
        where: { id: review.id },
        data: {
          reviewStatus: "pending",
          approvedForVoice: false,
          reviewOrigin: "automation",
          invalidatedAt: new Date(),
          accuracyScore: null,
          reviewedBy: null,
          reviewedAt: null,
        },
      });

      // Add audit entry explaining the invalidation
      await tx.scriptureChunkReviewAudit.create({
        data: {
          reviewId: review.id,
          scriptureChunkId: review.chunk.id,
          previousStatus: "approved",
          nextStatus: "pending",
          previousApprovedForVoice: true,
          nextApprovedForVoice: false,
          reviewerUserId: "system-remediation",
          notes:
            "INVALIDATED: Scripted approval masquerading as human review removed. Returned to pending.",
        },
      });
    });
    remediatedCount++;
  }

  console.log(`Remediated ${remediatedCount} synthetic reviews.`);

  // Find simulated VoiceQA Runs
  const simulatedRuns = await db.voiceQaRun.findMany({
    where: {
      status: "passed",
      OR: [
        { label: "Staging Release QA" },
        { label: { contains: "Staging", mode: "insensitive" } },
      ],
    },
    include: { steps: true },
  });

  console.log(`Found ${simulatedRuns.length} synthetic Voice QA runs.`);
  let qaRemediated = 0;

  for (const run of simulatedRuns) {
    // Only fail the ones that have no actual device footprints
    if (!run.device && !run.browser) {
      await db.voiceQaRun.update({
        where: { id: run.id },
        data: {
          status: "invalid",
          invalidatedAt: new Date(),
          notes:
            (run.notes ? run.notes + "\n" : "") +
            "INVALIDATED: Simulated Voice QA masquerading as real-device validation.",
        },
      });
      qaRemediated++;
    }
  }

  console.log(`Invalidated ${qaRemediated} Voice QA runs.`);
}

main()
  .catch((error) => {
    console.error("Fatal:", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
