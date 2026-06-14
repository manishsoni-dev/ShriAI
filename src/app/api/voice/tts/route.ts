import "server-only";

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { env } from "@/env";
import { db } from "@/lib/db";
import { logObservabilityEvent } from "@/lib/observability";
import { getPersonaFromMetadata, isPersonaId } from "@/lib/personas";
import { checkRateLimit, rateLimitResponseHeaders } from "@/lib/rate-limit";
import { cleanTextForTTS, truncateForTTS } from "@/lib/tts-utils";
import { getProviderVoiceProfile } from "@/lib/voiceProfiles.server";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
const TTS_MIME_TYPE = "audio/mpeg";

export const runtime = "nodejs";

type TTSRequest = {
  assistantMessageId?: string;
  traceId?: string;
  turnId?: string;
};

function metadataRecord(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  // Auth guard
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = checkRateLimit({
    key: `tts:${session.user.id}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many voice playback requests. Please slow down." },
      {
        status: 429,
        headers: rateLimitResponseHeaders(rateLimit.retryAfterMs),
      },
    );
  }

  const body = (await request.json().catch(() => null)) as TTSRequest | null;
  const traceId = body?.traceId ?? crypto.randomUUID();
  const turnId = body?.turnId;
  const assistantMessageId = body?.assistantMessageId?.trim();

  if (!assistantMessageId) {
    return NextResponse.json(
      { error: "Missing assistantMessageId.", traceId },
      { status: 400 },
    );
  }

  const assistantMessage = await db.message.findFirst({
    where: {
      id: assistantMessageId,
      role: "assistant",
      conversation: {
        userId: session.user.id,
      },
    },
    include: {
      conversation: true,
    },
  });

  if (!assistantMessage) {
    return NextResponse.json({ error: "Not found", traceId }, { status: 404 });
  }

  const metadata = metadataRecord(assistantMessage.metadata);
  const personaFromMessage = metadata.personaId;
  const personaId = isPersonaId(personaFromMessage)
    ? personaFromMessage
    : getPersonaFromMetadata(assistantMessage.conversation.metadata).id;
  const voiceEligible = metadata.voiceEligible === true;
  const spokenAnswer =
    typeof metadata.spokenAnswer === "string" && metadata.spokenAnswer.trim()
      ? metadata.spokenAnswer.trim()
      : assistantMessage.content.trim();

  if (!voiceEligible) {
    return NextResponse.json(
      { error: "This response is not approved for voice playback.", traceId },
      { status: 400 },
    );
  }

  // ElevenLabs key check happens after ownership/eligibility checks so missing
  // provider config cannot be used to probe message IDs.
  if (!env.ELEVENLABS_API_KEY) {
    void logObservabilityEvent({
      traceId,
      eventType: "tts",
      status: "skipped",
      userId: session.user.id,
      conversationId: assistantMessage.conversationId,
      messageId: assistantMessage.id,
      personaId,
      model: "elevenlabs",
      latencyMs: Date.now() - startedAt,
      payload: {
        error: "Voice output is not configured.",
        turnId,
      },
    });
    return NextResponse.json(
      { error: "Voice output is not configured.", traceId },
      { status: 503 },
    );
  }

  const profile = getProviderVoiceProfile(personaId);
  const cleaned = cleanTextForTTS(spokenAnswer);
  const truncated = truncateForTTS(cleaned, profile.maxTtsChars);

  if (!truncated) {
    return NextResponse.json(
      { error: "Text became empty after cleaning." },
      { status: 422 },
    );
  }

  try {
    const elevenRes = await fetch(
      `${ELEVENLABS_BASE}/text-to-speech/${profile.providerVoiceId}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: TTS_MIME_TYPE,
        },
        body: JSON.stringify({
          text: truncated,
          model_id: profile.providerModel,
          voice_settings: profile.providerSettings,
        }),
      },
    );

    if (!elevenRes.ok) {
      const errorBody = await elevenRes.text().catch(() => "");
      console.error("[tts] ElevenLabs error:", elevenRes.status, errorBody);
      void logObservabilityEvent({
        traceId,
        eventType: "tts",
        status: "error",
        userId: session.user.id,
        conversationId: assistantMessage.conversationId,
        messageId: assistantMessage.id,
        personaId,
        model: profile.providerModel,
        latencyMs: Date.now() - startedAt,
        payload: {
          provider: "elevenlabs",
          status: elevenRes.status,
          error: errorBody.slice(0, 1000),
          turnId,
        },
      });
      return NextResponse.json(
        { error: `ElevenLabs TTS failed (${elevenRes.status}).`, traceId },
        { status: 502 },
      );
    }

    const audioBuffer = await elevenRes.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    void logObservabilityEvent({
      traceId,
      eventType: "tts",
      status: "success",
      userId: session.user.id,
      conversationId: assistantMessage.conversationId,
      messageId: assistantMessage.id,
      personaId,
      model: profile.providerModel,
      latencyMs: Date.now() - startedAt,
      payload: {
        provider: "elevenlabs",
        audioBytes: audioBuffer.byteLength,
        inputChars: truncated.length,
        turnId,
      },
    });

    return NextResponse.json(
      {
        audioBase64,
        mimeType: TTS_MIME_TYPE,
        traceId,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("[tts] Unexpected error:", error);
    void logObservabilityEvent({
      traceId,
      eventType: "tts",
      status: "error",
      userId: session.user.id,
      conversationId: assistantMessage.conversationId,
      messageId: assistantMessage.id,
      personaId,
      latencyMs: Date.now() - startedAt,
      payload: {
        error: error instanceof Error ? error.message : String(error),
        turnId,
      },
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Voice generation failed. Please try again.",
        traceId,
      },
      { status: 500 },
    );
  }
}
