import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  checkRateLimit: vi.fn(),
  messageFindFirst: vi.fn(),
  logObservabilityEvent: vi.fn(),
  env: {
    ELEVENLABS_API_KEY: "eleven-test-key",
  },
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@/env", () => ({
  env: mocks.env,
}));

vi.mock("@/lib/db", () => ({
  db: {
    message: {
      findFirst: mocks.messageFindFirst,
    },
  },
}));

vi.mock("@/lib/observability", () => ({
  logObservabilityEvent: mocks.logObservabilityEvent,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  rateLimitResponseHeaders: (retryAfterMs: number) => ({
    "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))),
  }),
}));

import { POST } from "./route";

const OWNER_ID = "user-owner";
const CONVERSATION_ID = "conversation-owner";
const ASSISTANT_MESSAGE_ID = "message-assistant";

function ttsRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/voice/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function ownedAssistantMessage(metadata: Record<string, unknown>) {
  return {
    id: ASSISTANT_MESSAGE_ID,
    role: "assistant",
    content: "Visible assistant text.",
    conversationId: CONVERSATION_ID,
    metadata,
    conversation: {
      id: CONVERSATION_ID,
      metadata: { personaId: "rama" },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.env.ELEVENLABS_API_KEY = "eleven-test-key";
  mocks.auth.mockResolvedValue({ user: { id: OWNER_ID } });
  mocks.checkRateLimit.mockReturnValue({
    allowed: true,
    remaining: 29,
    retryAfterMs: 0,
  });
  mocks.messageFindFirst.mockResolvedValue(
    ownedAssistantMessage({
      personaId: "krishna",
      spokenAnswer: "Server approved spoken answer.",
      voiceEligible: true,
    }),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
        },
      }),
    ),
  );
});

describe("POST /api/voice/tts", () => {
  it("requires authentication", async () => {
    mocks.auth.mockResolvedValueOnce(null);

    const response = await POST(
      ttsRequest({ assistantMessageId: ASSISTANT_MESSAGE_ID }),
    );

    expect(response.status).toBe(401);
    expect(mocks.messageFindFirst).not.toHaveBeenCalled();
  });

  it("requires an owned assistant message", async () => {
    mocks.messageFindFirst.mockResolvedValueOnce(null);

    const response = await POST(
      ttsRequest({ assistantMessageId: ASSISTANT_MESSAGE_ID }),
    );

    expect(response.status).toBe(404);
    expect(mocks.messageFindFirst).toHaveBeenCalledWith({
      where: {
        id: ASSISTANT_MESSAGE_ID,
        role: "assistant",
        conversation: {
          userId: OWNER_ID,
        },
      },
      include: {
        conversation: true,
      },
    });
  });

  it("refuses assistant messages that are not voice eligible", async () => {
    mocks.messageFindFirst.mockResolvedValueOnce(
      ownedAssistantMessage({
        personaId: "krishna",
        spokenAnswer: "Text-only answer.",
        voiceEligible: false,
      }),
    );

    const response = await POST(
      ttsRequest({ assistantMessageId: ASSISTANT_MESSAGE_ID }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "This response is not approved for voice playback.",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses server-approved message text and persona instead of client-supplied text", async () => {
    const response = await POST(
      ttsRequest({
        assistantMessageId: ASSISTANT_MESSAGE_ID,
        text: "Forged client text.",
        personaId: "shiva",
        traceId: "trace-1",
        turnId: "turn-1",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      audioBase64: "AQID",
      mimeType: "audio/mpeg",
      traceId: "trace-1",
    });

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/text-to-speech/VR6AewLTigWG4xSOukaG/");
    expect(init?.headers).toMatchObject({
      "xi-api-key": "eleven-test-key",
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      text: "Server approved spoken answer.",
      model_id: "eleven_multilingual_v2",
    });
  });
});
