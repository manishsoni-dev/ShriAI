import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireReviewer } from "@/lib/scripture-review/reviews";

export async function POST(req: Request) {
  try {
    const principal = await requireReviewer();
    if (principal.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required." }, { status: 403 });
    }
    
    const body = await req.json();
    const { label, device, browser, personaId, notes, steps, status } = body;

    const run = await db.voiceQaRun.create({
      data: {
        label,
        device,
        browser,
        personaId,
        notes,
        status: status || "passed",
        completedAt: new Date(),
        steps: {
          create: steps.map((step: Record<string, unknown>) => ({
            stepType: step.stepType,
            status: step.status || "passed",
            latencyMs: step.latencyMs,
            firstAudibleMs: step.firstAudibleMs,
            transcript: step.transcript,
            expectedTranscript: step.expectedTranscript,
            wer: step.wer,
            errorCode: step.errorCode
          }))
        }
      }
    });

    return NextResponse.json({ success: true, runId: run.id });
  } catch (err: unknown) {
    console.error("Voice QA save error:", err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
