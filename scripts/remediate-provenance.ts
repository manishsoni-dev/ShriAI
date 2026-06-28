#!/usr/bin/env tsx
import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  console.log("Remediating non-human approvals and simulated Voice QA...");

  // 1. Invalidate scripted approvals
  const automatedReviews = await db.scriptureChunkReview.findMany({
    where: {
      reviewedBy: "ai-system-simulated-human",
      reviewStatus: "approved",
    },
    include: { chunk: true },
  });

  let approvalsInvalidated = 0;

  for (const review of automatedReviews) {
    await db.$transaction(async (tx) => {
      await tx.scriptureChunkReview.update({
        where: { id: review.id },
        data: {
          reviewStatus: "pending",
          approvedForVoice: false,
          reviewOrigin: "automation",
          invalidatedAt: new Date(),
          invalidationReason:
            "Automated approval does not satisfy human review policy.",
        },
      });

      await tx.scriptureChunkReviewAudit.create({
        data: {
          reviewId: review.id,
          scriptureChunkId: review.chunk.id,
          previousStatus: review.reviewStatus,
          nextStatus: "pending",
          previousApprovedForVoice: review.approvedForVoice,
          nextApprovedForVoice: false,
          reviewerUserId: "system-remediation",
          notes: "Automated approval does not satisfy human review policy.",
        },
      });
    });
    approvalsInvalidated++;
  }

  console.log(`Invalidated ${approvalsInvalidated} scripted approvals.`);

  // 2. Invalidate simulated Voice QA runs
  // A simulated run is one where there's no genuine device matrix or notes indicating staging.
  const qaRunsToInvalidate = await db.voiceQaRun.findMany({
    where: {
      OR: [
        { label: { contains: "staging", mode: "insensitive" } },
        { notes: { contains: "staging", mode: "insensitive" } },
        { notes: { equals: "" } }, // Empty notes, no device context from the prompt script
        { device: null },
      ],
      NOT: {
        status: "invalid",
      },
    },
  });

  let qaInvalidated = 0;

  for (const run of qaRunsToInvalidate) {
    await db.voiceQaRun.update({
      where: { id: run.id },
      data: {
        status: "invalid",
        invalidatedAt: new Date(),
        notes: `INVALIDATED: Simulated Voice QA masquerading as real-device validation. Original notes: ${run.notes || "none"}`,
      },
    });
    qaInvalidated++;
  }

  console.log(`Invalidated ${qaInvalidated} simulated Voice QA runs.`);
}

main()
  .catch((e) => {
    console.error("Remediation error:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
