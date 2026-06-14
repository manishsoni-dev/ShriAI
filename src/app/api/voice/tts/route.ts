import "server-only";

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { env } from "@/env";
import { logObservabilityEvent } from "@/lib/observability";
import { isPersonaId } from "@/lib/personas";
import { checkRateLimit, rateLimitResponseHeaders } from "@/lib/rate-limit";
import { cleanTextForTTS, truncateForTTS } from "@/lib/tts-utils";
import { getVoiceProfile } from "@/lib/voiceProfiles";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
const TTS_MIME_TYPE = "audio/mpeg";

export const runtime = "nodejs";

type TTSRequest = {
  text?: string;
  personaId?: string;
  traceId?: string;
};

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

  // ElevenLabs key check
  if (!env.ELEVENLABS_API_KEY) {
    void logObservabilityEvent({
      traceId,
      eventType: "tts",
      status: "skipped",
      userId: session.user.id,
      model: "elevenlabs",
      latencyMs: Date.now() - startedAt,
      payload: { error: "Voice output is not configured." },
    });
    return NextResponse.json(
      { error: "Voice output is not configured.", traceId },
      { status: 503 },
    );
  }

  const rawText = body?.text?.trim();
  const personaId = body?.personaId;

  if (!rawText) {
    return NextResponse.json({ error: "Missing text field." }, { status: 400 });
  }

  if (!personaId || !isPersonaId(personaId)) {
    return NextResponse.json(
      { error: "Invalid or missing personaId." },
      { status: 400 },
    );
  }

  const profile = getVoiceProfile(personaId);
  const cleaned = cleanTextForTTS(rawText);
  const truncated = truncateForTTS(cleaned, profile.maxTtsChars);

  if (!truncated) {
    return NextResponse.json(
      { error: "Text became empty after cleaning." },
      { status: 422 },
    );
  }

  try {
    const elevenRes = await fetch(
      `${ELEVENLABS_BASE}/text-to-speech/${profile.elevenLabsVoiceId}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: TTS_MIME_TYPE,
        },
        body: JSON.stringify({
          text: truncated,
          model_id: profile.elevenLabsModel,
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.78,
            style: 0.22,
            use_speaker_boost: true,
          },
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
        personaId,
        model: profile.elevenLabsModel,
        latencyMs: Date.now() - startedAt,
        payload: {
          provider: "elevenlabs",
          status: elevenRes.status,
          error: errorBody.slice(0, 1000),
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
      personaId,
      model: profile.elevenLabsModel,
      latencyMs: Date.now() - startedAt,
      payload: {
        provider: "elevenlabs",
        audioBytes: audioBuffer.byteLength,
        inputChars: truncated.length,
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
      personaId,
      latencyMs: Date.now() - startedAt,
      payload: {
        error: error instanceof Error ? error.message : String(error),
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
