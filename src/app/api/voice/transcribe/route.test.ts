import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  checkRateLimit: vi.fn(),
  logObservabilityEvent: vi.fn(),
  userFindUnique: vi.fn(),
  env: {
    STT_BASE_URL: "http://127.0.0.1:8001",
    STT_MODEL: "small",
    STT_TIMEOUT_MS: 100,
    STT_SERVICE_TOKEN: "test-token-with-at-least-thirty-two-characters",
  },
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/env", () => ({ env: mocks.env }));
vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: mocks.userFindUnique } },
}));
vi.mock("@/lib/observability", () => ({
  logObservabilityEvent: mocks.logObservabilityEvent,
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  rateLimitResponseHeaders: () => ({}),
}));

import { POST } from "./route";

function requestWithAudio(
  audio = new File(["audio"], "recording.webm", { type: "audio/webm" }),
  headers?: HeadersInit,
) {
  const formData = new FormData();
  formData.append("audio", audio);
  formData.append("language", "en");
  formData.append("traceId", "trace-stt");
  return new Request("http://localhost/api/voice/transcribe", {
    method: "POST",
    body: formData,
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.env.STT_TIMEOUT_MS = 100;
  vi.stubGlobal("fetch", vi.fn());
  mocks.auth.mockResolvedValue({ user: { id: "user-owner" } });
  mocks.userFindUnique.mockResolvedValue({
    microphoneConsentGivenAt: new Date("2026-06-22T00:00:00.000Z"),
  });
  mocks.checkRateLimit.mockReturnValue({ allowed: true, retryAfterMs: 0 });
});

describe("POST /api/voice/transcribe", () => {
  it("requires authentication", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    const response = await POST(requestWithAudio());
    expect(response.status).toBe(401);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires stored microphone processing consent before upload work", async () => {
    mocks.userFindUnique.mockResolvedValueOnce({
      microphoneConsentGivenAt: null,
    });

    const response = await POST(requestWithAudio());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "CONSENT_REQUIRED",
      error: expect.stringContaining("consent"),
    });
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends audio only to the configured local Whisper endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          text: "steady action",
          language: "en",
          duration_seconds: 1.2,
          inference_ms: 75,
          segments: [{ start: 0, end: 1.2, text: "steady action" }],
        }),
      ),
    );
    const response = await POST(requestWithAudio());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      text: "steady action",
      transcript: {
        text: "steady action",
        language: "en",
        durationSeconds: 1.2,
        inferenceMs: 75,
      },
      voiceTraceId: "trace-stt",
    });
    const fetchMock = vi.mocked(fetch);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://127.0.0.1:8001/v1/transcriptions?language=en");
    expect(init?.body).toBeInstanceOf(FormData);
    expect(init?.headers).toEqual({
      Authorization: "Bearer test-token-with-at-least-thirty-two-characters",
    });
  });

  it("rejects unsupported and oversized uploads before calling the service", async () => {
    const unsupported = await POST(
      requestWithAudio(
        new File(["text"], "recording.txt", { type: "text/plain" }),
      ),
    );
    const oversized = await POST(
      requestWithAudio(
        new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.webm", {
          type: "audio/webm",
        }),
      ),
    );

    expect(unsupported.status).toBe(415);
    await expect(unsupported.json()).resolves.toMatchObject({
      code: "UNSUPPORTED_MEDIA",
    });
    expect(oversized.status).toBe(413);
    await expect(oversized.json()).resolves.toMatchObject({
      code: "AUDIO_TOO_LARGE",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns a stable rate-limit error", async () => {
    mocks.checkRateLimit.mockReturnValueOnce({
      allowed: false,
      retryAfterMs: 2500,
    });
    const response = await POST(requestWithAudio());
    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      code: "RATE_LIMITED",
    });
  });

  it("enforces a normalized IP limit after the authoritative user limit", async () => {
    mocks.checkRateLimit
      .mockReturnValueOnce({ allowed: true, retryAfterMs: 0 })
      .mockReturnValueOnce({ allowed: false, retryAfterMs: 2500 });

    const response = await POST(
      requestWithAudio(undefined, {
        "x-forwarded-for": " 203.0.113.7, 198.51.100.4 ",
      }),
    );

    expect(response.status).toBe(429);
    expect(mocks.checkRateLimit).toHaveBeenNthCalledWith(1, {
      key: "stt:user-owner",
      limit: 20,
      windowMs: 60_000,
    });
    expect(mocks.checkRateLimit).toHaveBeenNthCalledWith(2, {
      key: "stt-ip:203.0.113.7",
      limit: 60,
      windowMs: 60_000,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns a friendly typed fallback when local STT is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    );
    const response = await POST(requestWithAudio());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("type your question"),
      voiceTraceId: "trace-stt",
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("returns a distinct timeout state", async () => {
    mocks.env.STT_TIMEOUT_MS = 5;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener(
              "abort",
              () => reject(new DOMException("aborted", "AbortError")),
              { once: true },
            );
          }),
      ),
    );

    const response = await POST(requestWithAudio());

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toMatchObject({
      code: "TRANSCRIPTION_TIMEOUT",
      error: expect.stringContaining("timed out"),
    });
    expect(fetch).toHaveBeenCalledOnce();
    mocks.env.STT_TIMEOUT_MS = 100;
  });

  it("maps local service duration rejection to an oversized-audio state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            detail: {
              code: "AUDIO_TOO_LONG",
              message: "Audio must be at most 90 seconds.",
            },
          },
          { status: 413 },
        ),
      ),
    );
    const response = await POST(requestWithAudio());
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      code: "AUDIO_TOO_LARGE",
      error: expect.stringContaining("90 seconds"),
    });
    expect(fetch).toHaveBeenCalledOnce();
  });
});
