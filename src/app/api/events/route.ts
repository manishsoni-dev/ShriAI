import { NextResponse } from "next/server";
import { getAuthenticatedUser as auth } from "@/lib/auth/get-authenticated-user";
import { logProductEvent, type ProductEventType } from "@/lib/product-events";

// List of event types allowed to be sent from the client
const ALLOWED_CLIENT_EVENTS: ProductEventType[] = [
  "landing_page_viewed",
  "starter_prompt_selected",
  "citations_opened",
  "abstention_rendered",
  "voice_recording_started",
  "voice_transcription_completed",
  "workflow_error",
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventType, traceId, personaId, metadata } = body;

    if (
      !eventType ||
      !ALLOWED_CLIENT_EVENTS.includes(eventType as ProductEventType)
    ) {
      return NextResponse.json(
        { error: "Invalid event type" },
        { status: 400 },
      );
    }

    const session = await auth();
    const userId = session?.user?.id ?? null;

    // We do not require authentication for landing_page_viewed
    if (!userId && eventType !== "landing_page_viewed") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await logProductEvent(eventType as ProductEventType, {
      userId,
      traceId: traceId ? String(traceId) : undefined,
      personaId: personaId ? String(personaId) : undefined,
      metadata:
        typeof metadata === "object" && metadata !== null
          ? metadata
          : undefined,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
