import "server-only";

import { isIP } from "node:net";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { env } from "@/env";
import { db } from "@/lib/db";
import { logObservabilityEvent } from "@/lib/observability";
import {
  checkConcurrency,
  checkRateLimit,
  rateLimitResponseHeaders,
  releaseConcurrency,
} from "@/lib/rate-limit";
import { getFeatureFlag } from "@/lib/feature-flags";
import { hasStoredMicrophoneConsent } from "@/lib/voice/consent";
import {
  LocalSpeechClient,
  LocalSpeechError,
  localSpeechStatus,
} from "@/lib/voice/local-speech";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
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

export const runtime = "nodejs";

type VoiceErrorCode =
  | "AUDIO_TOO_LARGE"
  | "CONSENT_REQUIRED"
  | "EMPTY_AUDIO"
  | "INVALID_MULTIPART"
  | "MISSING_AUDIO"
  | "NO_SPEECH"
  | "LOCAL_STT_UNAVAILABLE"
  | "RATE_LIMITED"
  | "TRANSCRIPTION_TIMEOUT"
  | "TRANSCRIPTION_UNAVAILABLE"
  | "UNSUPPORTED_MEDIA";

function voiceError(
  code: VoiceErrorCode,
  message: string,
  status: number,
  voiceTraceId?: string,
  headers?: HeadersInit,
) {
  return NextResponse.json(
    { code, error: message, ...(voiceTraceId ? { voiceTraceId } : {}) },
    { status, headers },
  );
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await getFeatureFlag("voice_input"))) {
    return voiceError(
      "LOCAL_STT_UNAVAILABLE",
      "Voice input is currently disabled.",
      503,
    );
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { microphoneConsentGivenAt: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasStoredMicrophoneConsent(user)) {
    return voiceError(
      "CONSENT_REQUIRED",
      "Microphone processing consent is required before recording.",
      403,
    );
  }

  const rateLimit = checkRateLimit({
    key: `stt:${session.user.id}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return voiceError(
      "RATE_LIMITED",
      "Too many voice transcription requests. Please slow down.",
      429,
      undefined,
      rateLimitResponseHeaders(rateLimit.retryAfterMs),
    );
  }

  const ipRateLimit = checkRateLimit({
    key: `stt-ip:${clientIp(request)}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (!ipRateLimit.allowed) {
    return voiceError(
      "RATE_LIMITED",
      "Too many voice transcription requests from this network.",
      429,
      undefined,
      rateLimitResponseHeaders(ipRateLimit.retryAfterMs),
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return voiceError(
      "INVALID_MULTIPART",
      "Invalid request - expected multipart/form-data.",
      400,
    );
  }

  const audioField = formData.get("audio");
  const traceId =
    typeof formData.get("traceId") === "string"
      ? String(formData.get("traceId"))
      : crypto.randomUUID();
  const safeTraceId = traceId.trim().slice(0, 128) || crypto.randomUUID();
  const rawLanguage = formData.get("language");
  const language = typeof rawLanguage === "string" ? rawLanguage : "en";

  if (!audioField || !(audioField instanceof Blob)) {
    return voiceError(
      "MISSING_AUDIO",
      "Missing audio field in form data.",
      400,
      safeTraceId,
    );
  }
  if (audioField.size === 0) {
    return voiceError("EMPTY_AUDIO", "Audio file is empty.", 400, safeTraceId);
  }
  if (audioField.size > MAX_AUDIO_BYTES) {
    return voiceError(
      "AUDIO_TOO_LARGE",
      "Audio file too large. Maximum is 10 MB or 90 seconds.",
      413,
      safeTraceId,
    );
  }

  const audioMimeType = baseMimeType(audioField.type);
  if (!audioMimeType || !ALLOWED_AUDIO_MIME_TYPES.has(audioMimeType)) {
    return voiceError(
      "UNSUPPORTED_MEDIA",
      "Unsupported audio format. Please use webm, mp4, mpeg, ogg, wav, m4a, or flac audio.",
      415,
      safeTraceId,
    );
  }

  const client = new LocalSpeechClient({
    sttBaseUrl: env.STT_BASE_URL,
    timeoutMs: env.STT_TIMEOUT_MS,
    voiceServiceToken: env.STT_SERVICE_TOKEN,
  });

  if (!checkConcurrency("whisper_transcribe", env.WHISPER_MAX_CONCURRENCY)) {
    return voiceError(
      "RATE_LIMITED",
      "Transcription service is at maximum capacity. Please try again in a few moments.",
      503,
      safeTraceId,
      { "Retry-After": "5" },
    );
  }

  try {
    const transcript = await client.transcribe({
      audio: audioField,
      language,
      filename: `recording.${mimeExtension(audioMimeType)}`,
    });
    if (!transcript.text) {
      return voiceError(
        "NO_SPEECH",
        "No speech detected in the recording.",
        422,
        safeTraceId,
      );
    }

    void logObservabilityEvent({
      traceId: safeTraceId,
      eventType: "stt",
      status: "success",
      userId: session.user.id,
      model: env.STT_MODEL,
      latencyMs: Date.now() - startedAt,
      payload: {
        provider: "local-whisper",
        audioBytes: audioField.size,
        transcriptLength: transcript.text.length,
        detectedLanguage: transcript.language,
        audioDurationSeconds: transcript.durationSeconds,
        inferenceMs: transcript.inferenceMs,
      },
    });

    return NextResponse.json({
      text: transcript.text,
      transcript,
      voiceTraceId: safeTraceId,
    });
  } catch (error) {
    const status = localSpeechStatus(error);
    const responseError = transcriptionError(error, status);
    void logObservabilityEvent({
      traceId: safeTraceId,
      eventType: "stt",
      status: "error",
      userId: session.user.id,
      model: env.STT_MODEL,
      latencyMs: Date.now() - startedAt,
      payload: {
        provider: "local-whisper",
        audioBytes: audioField.size,
        errorClass:
          error instanceof Error ? error.constructor.name : "UnknownError",
      },
    });
    return voiceError(
      responseError.code,
      responseError.message,
      status,
      safeTraceId,
    );
  } finally {
    releaseConcurrency("whisper_transcribe");
  }
}

function transcriptionError(error: unknown, status: number) {
  if (error instanceof LocalSpeechError) {
    if (error.serviceCode === "AUDIO_TOO_LONG") {
      return {
        code: "AUDIO_TOO_LARGE" as const,
        message: "Recording is too long. Maximum duration is 90 seconds.",
      };
    }
    if (
      error.serviceCode === "UNSUPPORTED_MEDIA" ||
      error.serviceCode === "INVALID_AUDIO"
    ) {
      return {
        code: "UNSUPPORTED_MEDIA" as const,
        message:
          "The recording format could not be decoded. Try recording again.",
      };
    }
  }
  if (status === 504) {
    return {
      code: "TRANSCRIPTION_TIMEOUT" as const,
      message:
        "Local speech transcription timed out. You can still type your question.",
    };
  }
  return {
    code: "LOCAL_STT_UNAVAILABLE" as const,
    message:
      "Local speech transcription is unavailable. Start the faster-whisper service or type your question.",
  };
}

function baseMimeType(mime: string) {
  return mime.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

function mimeExtension(mime: string) {
  const extensions: Record<string, string> = {
    "audio/flac": "flac",
    "audio/m4a": "m4a",
    "audio/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/mpga": "mp3",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/webm": "webm",
    "audio/x-m4a": "m4a",
    "audio/x-wav": "wav",
  };
  return extensions[mime] ?? "webm";
}

function clientIp(request: Request) {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",", 1)[0]
    ?.trim();
  const candidate = forwarded || request.headers.get("x-real-ip")?.trim();
  return candidate && isIP(candidate) ? candidate : "unknown";
}
