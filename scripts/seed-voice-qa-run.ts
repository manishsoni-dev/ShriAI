#!/usr/bin/env tsx
/**
 * Seed a non-release-countable development Voice QA fixture into the database.
 *
 * This fixture is intentionally marked automated_fixture + invalid so it can
 * never satisfy release readiness. Real release evidence must be entered by a
 * human through the manual QA protocol.
 *
 * Usage: npx tsx scripts/seed-voice-qa-run.ts
 */
import "dotenv/config";
import "./shim-server-only";
import { db } from "../src/lib/db";

async function main() {
  // Check if there's already a fixture development run.
  const existing = await db.voiceQaRun.count({
    where: {
      evidenceSource: "automated_fixture",
      OR: [
        { label: { contains: "development", mode: "insensitive" } },
        { notes: { contains: "development", mode: "insensitive" } },
      ],
    },
  });

  if (existing > 0) {
    console.log(
      `${existing} development Voice QA fixture run(s) already exist. No seed needed.`,
    );
    return;
  }

  // Create a non-release-countable development fixture run.
  const run = await db.voiceQaRun.create({
    data: {
      label: "Local development voice QA fixture — not release evidence",
      device: "MacBook Pro (Apple Silicon, macOS 14+)",
      browser: "Chrome (headless smoke, local dev server)",
      personaId: "sages",
      status: "invalid",
      evidenceSource: "automated_fixture",
      notes:
        "Automated development fixture only. Not manual physical-device Voice QA evidence and not release-countable.",
      invalidatedAt: new Date(),
      steps: {
        create: [
          {
            stepType: "consent_gate",
            status: "passed",
            transcript: "Microphone consent dialog presented before recording.",
            expectedTranscript:
              "User must grant consent before recording begins.",
          },
          {
            stepType: "auth_required",
            status: "passed",
            transcript:
              "Unauthenticated POST /api/voice/transcribe returns 401.",
            expectedTranscript: "Authenticated requests only.",
          },
          {
            stepType: "mime_type_rejection",
            status: "passed",
            transcript: "Non-audio MIME type rejected with 415 error.",
            expectedTranscript:
              "Accepted MIME types: audio/webm, audio/ogg, audio/wav.",
          },
          {
            stepType: "size_limit",
            status: "passed",
            transcript: "Upload > 10 MB rejected with 413 error.",
            expectedTranscript: "Maximum upload size: 10 MB.",
          },
          {
            stepType: "duration_limit",
            status: "passed",
            transcript: "Recording auto-stops at 90 seconds.",
            expectedTranscript: "Maximum recording duration: 90 seconds.",
          },
          {
            stepType: "rate_limit",
            status: "passed",
            transcript: "6th request within limit window returns 429.",
            expectedTranscript: "Rate limited per user and IP.",
          },
          {
            stepType: "browser_tts",
            status: "passed",
            transcript: "Browser SpeechSynthesis plays assistant response.",
            expectedTranscript:
              "Browser-local TTS only; no cloud voice provider.",
          },
        ],
      },
    },
    include: { steps: { select: { id: true } } },
  });

  console.log(
    `Seeded non-release-countable Voice QA fixture: ${run.id} (${run.steps.length} steps, status: ${run.status})`,
  );
}

main()
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
