import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireReviewer } from "@/lib/scripture-review/reviews";

const voiceQaSchema = z.object({
  label: z.string().trim().min(1).max(120),
  device: z.string().trim().min(1).max(500),
  browser: z.string().trim().min(1).max(120),
  personaId: z.string().trim().min(1).max(40),
  notes: z.string().trim().max(1000).optional(),
  steps: z
    .array(
      z.object({
        stepType: z.string().trim().min(1).max(100),
        status: z.enum(["passed", "failed"]),
        latencyMs: z.number().int().nonnegative().optional(),
        firstAudibleMs: z.number().int().nonnegative().optional(),
        transcript: z.string().max(1000).optional(),
        expectedTranscript: z.string().max(1000).optional(),
        wer: z.number().nonnegative().optional(),
        errorCode: z.string().max(100).optional(),
      }),
    )
    .min(1)
    .max(30),
});

export async function POST(req: Request) {
  try {
    const principal = await requireReviewer();
    if (principal.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required." },
        { status: 403 },
      );
    }

    const parsed = voiceQaSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid completed Voice QA record." },
        { status: 400 },
      );
    }
    const { label, device, browser, personaId, notes, steps } = parsed.data;
    const status = steps.every((step) => step.status === "passed")
      ? "passed"
      : "failed";

    const run = await db.voiceQaRun.create({
      data: {
        label,
        device,
        browser,
        personaId,
        notes,
        status,
        completedAt: new Date(),
        steps: {
          create: steps.map((step) => ({
            stepType: step.stepType,
            status: step.status,
            latencyMs: step.latencyMs,
            firstAudibleMs: step.firstAudibleMs,
            transcript: step.transcript,
            expectedTranscript: step.expectedTranscript,
            wer: step.wer,
            errorCode: step.errorCode,
          })),
        },
      },
    });

    return NextResponse.json({ success: true, runId: run.id });
  } catch (err: unknown) {
    console.error("Voice QA save error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
