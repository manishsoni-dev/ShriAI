import "server-only";

import { NextResponse } from "next/server";
import OpenAI from "openai";

import { auth } from "@/auth";
import { env } from "@/env";
import { logObservabilityEvent } from "@/lib/observability";
import { checkRateLimit, rateLimitResponseHeaders } from "@/lib/rate-limit";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB — Whisper limit
const SAFE_STT_CONFIG_ERROR = "Speech transcription is not configured.";
const ALLOWED_AUDIO_MIME_TYPES = new Set([
  "audio/flac",
  "audio/m4a",
  "audio/mp4",
  "audio/mpeg",
  "audio/mpga",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
  "audio/x-wav",
]);

type STTProvider = "openai" | "deepgram" | "google";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const startedAt = Date.now();
  // Auth guard
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = checkRateLimit({
    key: `stt:${session.user.id}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many voice transcription requests. Please slow down." },
      {
        status: 429,
        headers: rateLimitResponseHeaders(rateLimit.retryAfterMs),
      },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid request — expected multipart/form-data." },
      { status: 400 },
    );
  }

  const audioField = formData.get("audio");
  const traceId =
    typeof formData.get("traceId") === "string"
      ? String(formData.get("traceId"))
      : crypto.randomUUID();

  if (!audioField || !(audioField instanceof Blob)) {
    return NextResponse.json(
      { error: "Missing audio field in form data." },
      { status: 400 },
    );
  }

  if (audioField.size === 0) {
    return NextResponse.json(
      { error: "Audio file is empty." },
      { status: 400 },
    );
  }

  if (audioField.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "Audio file too large. Maximum is 25 MB." },
      { status: 413 },
    );
  }

  const audioMimeType = baseMimeType(audioField.type);
  if (!audioMimeType || !ALLOWED_AUDIO_MIME_TYPES.has(audioMimeType)) {
    return NextResponse.json(
      {
        error:
          "Unsupported audio format. Please use webm, mp4, mpeg, ogg, wav, m4a, or flac audio.",
        voiceTraceId: traceId,
      },
      { status: 415 },
    );
  }

  const provider = env.STT_PROVIDER;

  if (!hasProviderKey(provider)) {
    void logObservabilityEvent({
      traceId,
      eventType: "stt",
      status: "skipped",
      userId: session.user.id,
      model: provider,
      latencyMs: Date.now() - startedAt,
      payload: {
        provider,
        audioBytes: audioField.size,
        error: SAFE_STT_CONFIG_ERROR,
      },
    });
    return NextResponse.json(
      { error: SAFE_STT_CONFIG_ERROR, voiceTraceId: traceId },
      { status: 503 },
    );
  }

  try {
    const text = await transcribeAudio(audioField, provider);

    if (!text) {
      void logObservabilityEvent({
        traceId,
        eventType: "stt",
        status: "skipped",
        userId: session.user.id,
        model: provider,
        latencyMs: Date.now() - startedAt,
        payload: {
          provider,
          audioBytes: audioField.size,
          error: "No speech detected in the recording.",
        },
      });
      return NextResponse.json(
        {
          error: "No speech detected in the recording.",
          voiceTraceId: traceId,
        },
        { status: 422 },
      );
    }

    void logObservabilityEvent({
      traceId,
      eventType: "stt",
      status: "success",
      userId: session.user.id,
      model: provider,
      latencyMs: Date.now() - startedAt,
      payload: {
        provider,
        audioBytes: audioField.size,
        transcriptLength: text.length,
        transcriptPreview: text.replace(/\s+/g, " ").trim().slice(0, 120),
      },
    });

    return NextResponse.json({ text, voiceTraceId: traceId });
  } catch (error) {
    console.error("[transcribe] STT error:", error);
    void logObservabilityEvent({
      traceId,
      eventType: "stt",
      status: "error",
      userId: session.user.id,
      model: provider,
      latencyMs: Date.now() - startedAt,
      payload: {
        provider,
        audioBytes: audioField.size,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Transcription failed. Please try again.",
        voiceTraceId: traceId,
      },
      { status: 500 },
    );
  }
}

function hasProviderKey(provider: STTProvider): boolean {
  if (provider === "openai") return Boolean(env.OPENAI_API_KEY);
  if (provider === "deepgram") return Boolean(env.DEEPGRAM_API_KEY);
  if (provider === "google") return Boolean(env.GOOGLE_API_KEY);
  return false;
}

async function transcribeAudio(
  audioField: Blob,
  provider: STTProvider,
): Promise<string> {
  if (provider === "openai") {
    return transcribeWithOpenAI(audioField);
  }

  if (provider === "deepgram") {
    return transcribeWithDeepgram(audioField);
  }

  return transcribeWithGoogle(audioField);
}

async function transcribeWithOpenAI(audioField: Blob): Promise<string> {
  if (!env.OPENAI_API_KEY) {
    throw new Error(SAFE_STT_CONFIG_ERROR);
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  // Whisper accepts: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm
  const mimeType = audioField.type || "audio/webm";
  const ext = mimeExtension(mimeType);
  const audioFile = new File([audioField], `recording.${ext}`, {
    type: mimeType,
  });

  const transcription = await client.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
    language: "en",
    response_format: "text",
  });

  const text =
    typeof transcription === "string"
      ? transcription.trim()
      : String(transcription).trim();

  return text;
}

async function transcribeWithDeepgram(audioField: Blob): Promise<string> {
  if (!env.DEEPGRAM_API_KEY) {
    throw new Error(SAFE_STT_CONFIG_ERROR);
  }

  const response = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${env.DEEPGRAM_API_KEY}`,
        "Content-Type": audioField.type || "audio/webm",
      },
      body: audioField,
    },
  );

  if (!response.ok) {
    throw new Error(`Deepgram transcription failed (${response.status}).`);
  }

  const data = (await response.json()) as {
    results?: {
      channels?: Array<{
        alternatives?: Array<{
          transcript?: string;
        }>;
      }>;
    };
  };

  return (
    data.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? ""
  );
}

async function transcribeWithGoogle(audioField: Blob): Promise<string> {
  if (!env.GOOGLE_API_KEY) {
    throw new Error(SAFE_STT_CONFIG_ERROR);
  }

  const audioBase64 = Buffer.from(await audioField.arrayBuffer()).toString(
    "base64",
  );
  const response = await fetch(
    `https://speech.googleapis.com/v1/speech:recognize?key=${env.GOOGLE_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        config: {
          encoding: googleEncoding(audioField.type),
          languageCode: "en-US",
          enableAutomaticPunctuation: true,
        },
        audio: {
          content: audioBase64,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Google transcription failed (${response.status}).`);
  }

  const data = (await response.json()) as {
    results?: Array<{
      alternatives?: Array<{
        transcript?: string;
      }>;
    }>;
  };

  return (
    data.results
      ?.map((result) => result.alternatives?.[0]?.transcript?.trim())
      .filter(Boolean)
      .join(" ")
      .trim() ?? ""
  );
}

function googleEncoding(mime: string): string {
  const base = baseMimeType(mime);

  if (base === "audio/ogg") return "OGG_OPUS";
  if (base === "audio/webm") return "WEBM_OPUS";
  if (base === "audio/mp4") return "MP3";
  if (base === "audio/mpeg") return "MP3";
  if (base === "audio/wav" || base === "audio/x-wav") return "LINEAR16";

  return "WEBM_OPUS";
}

/** Map MIME type to Whisper-acceptable file extension. */
function mimeExtension(mime: string): string {
  const map: Record<string, string> = {
    "audio/webm": "webm",
    "audio/webm;codecs=opus": "webm",
    "audio/ogg": "ogg",
    "audio/ogg;codecs=opus": "ogg",
    "audio/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/flac": "flac",
    "audio/m4a": "m4a",
    "audio/x-m4a": "m4a",
  };
  const base = baseMimeType(mime);
  return map[base] ?? map[mime.toLowerCase()] ?? "webm";
}

function baseMimeType(mime: string): string {
  return mime.split(";")[0]?.trim().toLowerCase() ?? "";
}
