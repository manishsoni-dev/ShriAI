#!/usr/bin/env tsx
import "dotenv/config";

import { db } from "../src/lib/db";

const args = process.argv.slice(2);

function readArg(name: string) {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

const label =
  readArg("label") ?? `Voice QA ${new Date().toISOString().slice(0, 10)}`;
const device = readArg("device");
const browser = readArg("browser");
const personaId = readArg("persona") ?? "krishna";
const notes = readArg("notes");

const DEFAULT_STEPS = [
  "mic-permission",
  "stt-transcription",
  "retrieval-grounding",
  "chat-grounded-response",
  "tts-first-audible",
  "tts-playback",
  "barge-in-interruption",
  "denied-mic-permission",
  "empty-audio",
  "missing-stt-key",
  "missing-tts-key",
];

async function main() {
  const run = await db.voiceQaRun.create({
    data: {
      label,
      device,
      browser,
      personaId,
      notes,
      steps: {
        create: DEFAULT_STEPS.map((stepType) => ({ stepType })),
      },
    },
    include: {
      steps: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  console.log("Voice QA run created.");
  console.log(`Run ID: ${run.id}`);
  console.log(`Label: ${run.label}`);
  console.log(`Persona: ${run.personaId ?? "not set"}`);
  console.log(`Steps: ${run.steps.map((step) => step.stepType).join(", ")}`);
}

main()
  .catch((error) => {
    console.error("Fatal:", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
