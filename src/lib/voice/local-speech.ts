import "server-only";

export type LocalSpeechErrorCode =
  | "LOCAL_SPEECH_TIMEOUT"
  | "LOCAL_SPEECH_UNAVAILABLE"
  | "LOCAL_SPEECH_BAD_RESPONSE"
  | "LOCAL_SPEECH_REJECTED";

export class LocalSpeechError extends Error {
  constructor(
    readonly code: LocalSpeechErrorCode,
    message: string,
    readonly retryable: boolean,
    options?: { cause?: unknown; serviceCode?: string; status?: number },
  ) {
    super(message, { cause: options?.cause });
    this.name = "LocalSpeechError";
    this.status = options?.status;
    this.serviceCode = options?.serviceCode;
  }

  readonly status?: number;
  readonly serviceCode?: string;
}

export type LocalTranscript = {
  text: string;
  language: string;
  durationSeconds: number;
  inferenceMs: number;
  segments: Array<{ start: number; end: number; text: string }>;
};

type LocalSpeechClientOptions = {
  sttBaseUrl: string;
  timeoutMs: number;
  voiceServiceToken?: string;
  fetchFn?: typeof fetch;
};

export class LocalSpeechClient {
  private readonly sttBaseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly voiceServiceToken?: string;

  constructor(options: LocalSpeechClientOptions) {
    this.sttBaseUrl = loopbackBaseUrl(options.sttBaseUrl);
    this.timeoutMs = options.timeoutMs;
    this.fetchFn = options.fetchFn ?? fetch;
    this.voiceServiceToken = options.voiceServiceToken;
  }

  async transcribe(input: { audio: Blob; language: string; filename: string }) {
    if (!this.voiceServiceToken) {
      throw new LocalSpeechError(
        "LOCAL_SPEECH_UNAVAILABLE",
        "The local voice service token is not configured.",
        false,
      );
    }
    const response = await this.retry(async () => {
      const formData = new FormData();
      formData.append(
        "file",
        new File([input.audio], input.filename, {
          type: input.audio.type || "audio/webm",
        }),
      );
      const language = input.language === "hi" ? "hi" : "en";
      return this.request(
        `${this.sttBaseUrl}/v1/transcriptions?language=${language}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${this.voiceServiceToken}` },
          body: formData,
        },
      );
    });

    let data: unknown;
    try {
      data = await response.json();
    } catch (error) {
      throw badResponse("Local STT returned malformed JSON.", error);
    }
    if (!isTranscriptResponse(data)) {
      throw badResponse("Local STT returned an invalid transcript payload.");
    }
    return {
      text: data.text.trim(),
      language: data.language,
      durationSeconds: data.duration_seconds,
      inferenceMs: data.inference_ms,
      segments: data.segments,
    } satisfies LocalTranscript;
  }

  private async retry(operation: () => Promise<Response>) {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (!(error instanceof LocalSpeechError) || !error.retryable)
          throw error;
      }
    }
    throw lastError;
  }

  private async request(url: string, init: RequestInit) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchFn(url, {
        ...init,
        signal: controller.signal,
      });
      if (!response.ok) {
        const detailText = await response.text().catch(() => "");
        const detail = parseServiceError(detailText);
        throw new LocalSpeechError(
          response.status >= 500
            ? "LOCAL_SPEECH_UNAVAILABLE"
            : "LOCAL_SPEECH_REJECTED",
          detail.message.slice(0, 300) ||
            `Local speech service failed (${response.status}).`,
          response.status >= 500,
          { serviceCode: detail.code, status: response.status },
        );
      }
      return response;
    } catch (error) {
      if (controller.signal.aborted) {
        throw new LocalSpeechError(
          "LOCAL_SPEECH_TIMEOUT",
          "The local speech service timed out.",
          false,
          { cause: error },
        );
      }
      if (error instanceof LocalSpeechError) throw error;
      throw new LocalSpeechError(
        "LOCAL_SPEECH_UNAVAILABLE",
        "The local speech service is unavailable.",
        true,
        { cause: error },
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

function loopbackBaseUrl(value: string) {
  const url = new URL(value);
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)) {
    throw new Error("Local speech services must use a loopback URL.");
  }
  return value.replace(/\/$/, "");
}

function badResponse(message: string, cause?: unknown) {
  return new LocalSpeechError("LOCAL_SPEECH_BAD_RESPONSE", message, false, {
    cause,
  });
}

export function localSpeechStatus(error: unknown) {
  if (
    error instanceof LocalSpeechError &&
    error.code === "LOCAL_SPEECH_TIMEOUT"
  ) {
    return 504;
  }
  if (
    error instanceof LocalSpeechError &&
    error.code === "LOCAL_SPEECH_UNAVAILABLE"
  ) {
    return 503;
  }
  if (
    error instanceof LocalSpeechError &&
    error.code === "LOCAL_SPEECH_REJECTED" &&
    error.status &&
    error.status >= 400 &&
    error.status < 500
  ) {
    return error.status;
  }
  return 502;
}

function isTranscriptResponse(value: unknown): value is {
  text: string;
  language: string;
  duration_seconds: number;
  inference_ms: number;
  segments: Array<{ start: number; end: number; text: string }>;
} {
  if (!value || typeof value !== "object") return false;
  const transcript = value as Record<string, unknown>;
  return (
    typeof transcript.text === "string" &&
    typeof transcript.language === "string" &&
    typeof transcript.duration_seconds === "number" &&
    typeof transcript.inference_ms === "number" &&
    Array.isArray(transcript.segments) &&
    transcript.segments.every(
      (segment) =>
        segment &&
        typeof segment === "object" &&
        typeof (segment as Record<string, unknown>).start === "number" &&
        typeof (segment as Record<string, unknown>).end === "number" &&
        typeof (segment as Record<string, unknown>).text === "string",
    )
  );
}

function parseServiceError(value: string) {
  try {
    const parsed = JSON.parse(value) as {
      detail?: { code?: unknown; message?: unknown };
    };
    return {
      code:
        typeof parsed.detail?.code === "string"
          ? parsed.detail.code
          : undefined,
      message:
        typeof parsed.detail?.message === "string"
          ? parsed.detail.message
          : value,
    };
  } catch {
    return { code: undefined, message: value };
  }
}
