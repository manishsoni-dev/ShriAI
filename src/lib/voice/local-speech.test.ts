import { describe, expect, it, vi } from "vitest";

import { LocalSpeechClient, LocalSpeechError } from "@/lib/voice/local-speech";

function client(fetchFn: typeof fetch, timeoutMs = 50) {
  return new LocalSpeechClient({
    sttBaseUrl: "http://127.0.0.1:8001",
    timeoutMs,
    voiceServiceToken: "test-token-with-at-least-thirty-two-characters",
    fetchFn,
  });
}

describe("LocalSpeechClient", () => {
  it("constructs a Whisper-compatible localhost transcription request", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        text: "  steady action  ",
        language: "en",
        duration_seconds: 1.2,
        inference_ms: 80,
        segments: [{ start: 0, end: 1.2, text: "steady action" }],
      }),
    );
    await expect(
      client(fetchFn).transcribe({
        audio: new Blob(["audio"], { type: "audio/webm" }),
        language: "en",
        filename: "recording.webm",
      }),
    ).resolves.toMatchObject({
      text: "steady action",
      language: "en",
      durationSeconds: 1.2,
      inferenceMs: 80,
    });
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe("http://127.0.0.1:8001/v1/transcriptions?language=en");
    expect(init?.body).toBeInstanceOf(FormData);
    expect(init?.headers).toEqual({
      Authorization: "Bearer test-token-with-at-least-thirty-two-characters",
    });
  });

  it("rejects non-loopback speech URLs", () => {
    expect(
      () =>
        new LocalSpeechClient({
          sttBaseUrl: "https://speech.example.com",
          timeoutMs: 10,
        }),
    ).toThrow("loopback");
  });

  it("requires a server-only token for transcription", async () => {
    const fetchFn = vi.fn<typeof fetch>();
    const noTokenClient = new LocalSpeechClient({
      sttBaseUrl: "http://127.0.0.1:8001",
      timeoutMs: 10,
      fetchFn,
    });
    await expect(
      noTokenClient.transcribe({
        audio: new Blob(["audio"], { type: "audio/webm" }),
        language: "en",
        filename: "recording.webm",
      }),
    ).rejects.toMatchObject({ code: "LOCAL_SPEECH_UNAVAILABLE" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("preserves structured service rejection codes", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        {
          detail: {
            code: "AUDIO_TOO_LONG",
            message: "Audio must be at most 90 seconds.",
          },
        },
        { status: 413 },
      ),
    );
    await expect(
      client(fetchFn).transcribe({
        audio: new Blob(["audio"], { type: "audio/webm" }),
        language: "en",
        filename: "recording.webm",
      }),
    ).rejects.toMatchObject({
      code: "LOCAL_SPEECH_REJECTED",
      serviceCode: "AUDIO_TOO_LONG",
      status: 413,
    });
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("classifies unavailable services", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError("fetch failed"));
    await expect(
      client(fetchFn).transcribe({
        audio: new Blob(["audio"], { type: "audio/webm" }),
        language: "en",
        filename: "recording.webm",
      }),
    ).rejects.toMatchObject({
      code: "LOCAL_SPEECH_UNAVAILABLE",
      retryable: true,
    } satisfies Partial<LocalSpeechError>);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
