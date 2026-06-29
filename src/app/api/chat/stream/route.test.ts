import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class MockConversationAccessError extends Error {
    constructor() {
      super("Conversation not found or access denied.");
      this.name = "ConversationAccessError";
    }
  }

  return {
    ConversationAccessError: MockConversationAccessError,
    getAuthenticatedUser: vi.fn(),
    userFindUnique: vi.fn(),
    checkRateLimit: vi.fn(),
    getConversation: vi.fn(),
    listMessages: vi.fn(),
    createMessage: vi.fn(),
    txMessageCreate: vi.fn(),
    txConversationUpdate: vi.fn(),
    transaction: vi.fn(),
    detectCrisisIntent: vi.fn(),
    crisisSupportMessage: vi.fn(),
    logObservabilityEvent: vi.fn(),
    semanticSearch: vi.fn(),
    retrieveScriptureContext: vi.fn(),
    formatScriptureContextForPrompt: vi.fn(),
    streamGroundedAnswer: vi.fn(),
    validateAnswerCitations: vi.fn(),
    answerCitationCreateMany: vi.fn(),
    getAIUserFacingMessage: vi.fn(),
  };
});

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mocks.userFindUnique,
    },
    $transaction: mocks.transaction,
    answerCitation: {
      createMany: mocks.answerCitationCreateMany,
    },
  },
}));

vi.mock("@/lib/conversations", () => ({
  ConversationAccessError: mocks.ConversationAccessError,
  createMessage: mocks.createMessage,
  getConversation: mocks.getConversation,
  listMessages: mocks.listMessages,
}));

vi.mock("@/lib/ai", () => ({
  AIError: class AIError extends Error {
    code: string;

    constructor(code = "AI_ERROR", message = "AI error") {
      super(message);
      this.name = "AIError";
      this.code = code;
    }
  },
  getAIUserFacingMessage: mocks.getAIUserFacingMessage,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  rateLimitResponseHeaders: (retryAfterMs: number) => ({
    "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))),
  }),
  checkConcurrency: vi.fn(() => true),
  releaseConcurrency: vi.fn(),
}));

vi.mock("@/lib/safety/crisis", () => ({
  crisisSupportMessage: mocks.crisisSupportMessage,
  detectCrisisIntent: mocks.detectCrisisIntent,
}));

vi.mock("@/lib/observability", () => ({
  logObservabilityEvent: mocks.logObservabilityEvent,
}));

vi.mock("@/lib/knowledge-search", () => ({
  semanticSearch: mocks.semanticSearch,
}));

vi.mock("@/lib/rag/scripture-retrieval", () => ({
  formatScriptureContextForPrompt: mocks.formatScriptureContextForPrompt,
  retrieveScriptureContext: mocks.retrieveScriptureContext,
}));

vi.mock("@/lib/ai/answer-generator", () => ({
  streamGroundedAnswer: mocks.streamGroundedAnswer,
  validateAnswerCitations: mocks.validateAnswerCitations,
}));

import { POST } from "./route";

const OWNER_ID = "user-owner";
const PEER_ID = "user-peer";
const CONVERSATION_ID = "conversation-owner";

function chatRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/chat/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function responseJson(response: Response) {
  return response.json() as Promise<{ error?: string }>;
}

async function readEvents(response: Response) {
  const text = await response.text();

  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map(
      (line) => JSON.parse(line) as { type: string; [key: string]: unknown },
    );
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.getAuthenticatedUser.mockResolvedValue({ user: { id: OWNER_ID } });
  mocks.userFindUnique.mockResolvedValue({
    id: OWNER_ID,
    email: "owner@example.com",
  });
  mocks.checkRateLimit.mockReturnValue({
    allowed: true,
    remaining: 29,
    retryAfterMs: 0,
  });
  mocks.getConversation.mockResolvedValue({
    id: CONVERSATION_ID,
    userId: OWNER_ID,
    workspaceId: "workspace-owner",
    title: "Krishna guidance",
    metadata: { personaId: "krishna" },
  });
  mocks.listMessages.mockResolvedValue([]);
  mocks.txMessageCreate.mockResolvedValue({
    id: "message-user",
    role: "user",
    content: "What is duty?",
    createdAt: new Date("2026-06-14T00:00:00.000Z"),
  });
  mocks.txConversationUpdate.mockResolvedValue({});
  mocks.transaction.mockImplementation(async (callback) =>
    callback({
      message: { create: mocks.txMessageCreate },
      conversation: { update: mocks.txConversationUpdate },
    }),
  );
  mocks.createMessage.mockResolvedValue({
    id: "message-assistant",
    role: "assistant",
    content: "Steady yourself and act with care.",
    createdAt: new Date("2026-06-14T00:00:01.000Z"),
  });
  mocks.detectCrisisIntent.mockReturnValue(true);
  mocks.crisisSupportMessage.mockReturnValue(
    "Steady yourself and seek immediate support.",
  );
  mocks.getAIUserFacingMessage.mockReturnValue(
    "Local AI is unavailable. Start Ollama and confirm the configured model is installed.",
  );
});

describe("POST /api/chat/stream authorization", () => {
  it("returns 401 for unauthenticated access", async () => {
    mocks.getAuthenticatedUser.mockResolvedValueOnce(null);

    const response = await POST(
      chatRequest({ conversationId: CONVERSATION_ID, message: "Hello" }),
    );

    expect(response.status).toBe(401);
    await expect(responseJson(response)).resolves.toEqual({
      error: "Unauthorized",
    });
    expect(mocks.getConversation).not.toHaveBeenCalled();
  });

  it("returns 401 when the session user no longer exists", async () => {
    mocks.userFindUnique.mockResolvedValueOnce(null);

    const response = await POST(
      chatRequest({ conversationId: CONVERSATION_ID, message: "Hello" }),
    );

    expect(response.status).toBe(401);
    expect(mocks.getConversation).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid input before conversation lookup", async () => {
    const response = await POST(
      chatRequest({ conversationId: CONVERSATION_ID, message: "   " }),
    );

    expect(response.status).toBe(400);
    await expect(responseJson(response)).resolves.toEqual({
      error: "conversationId and message are required.",
    });
    expect(mocks.getConversation).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid interaction mode before conversation lookup", async () => {
    const response = await POST(
      chatRequest({
        conversationId: CONVERSATION_ID,
        message: "Hello",
        interactionMode: "video",
      }),
    );

    expect(response.status).toBe(400);
    await expect(responseJson(response)).resolves.toEqual({
      error: "interactionMode must be text or voice.",
    });
    expect(mocks.getConversation).not.toHaveBeenCalled();
  });

  it("uses the authenticated user id and ignores client-supplied identity", async () => {
    mocks.getAuthenticatedUser.mockResolvedValueOnce({ user: { id: PEER_ID } });
    mocks.userFindUnique.mockResolvedValueOnce({
      id: PEER_ID,
      email: "peer@example.com",
    });
    mocks.getConversation.mockRejectedValueOnce(
      new mocks.ConversationAccessError(),
    );

    const response = await POST(
      chatRequest({
        conversationId: CONVERSATION_ID,
        message: "Let me in",
        userId: OWNER_ID,
        workspaceId: "workspace-owner",
      }),
    );

    expect(response.status).toBe(404);
    expect(mocks.getConversation).toHaveBeenCalledWith({
      userId: PEER_ID,
      conversationId: CONVERSATION_ID,
    });
  });

  it.each([
    ["workspace peer"],
    ["cross-user caller"],
    ["cross-workspace caller"],
  ])("returns a non-enumerating 404 for %s access", async () => {
    mocks.getConversation.mockRejectedValueOnce(
      new mocks.ConversationAccessError(),
    );

    const response = await POST(
      chatRequest({ conversationId: CONVERSATION_ID, message: "Hello" }),
    );

    expect(response.status).toBe(404);
    await expect(responseJson(response)).resolves.toEqual({
      error: "Not found",
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.createMessage).not.toHaveBeenCalled();
  });

  it("streams a response for the owning user through crisis support", async () => {
    const response = await POST(
      chatRequest({
        conversationId: CONVERSATION_ID,
        message: "What is duty?",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain(
      "application/x-ndjson",
    );
    expect(mocks.getConversation).toHaveBeenCalledWith({
      userId: OWNER_ID,
      conversationId: CONVERSATION_ID,
    });
    expect(mocks.txMessageCreate).toHaveBeenCalledWith({
      data: {
        role: "user",
        content: "What is duty?",
        conversationId: CONVERSATION_ID,
      },
    });
    expect(mocks.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: OWNER_ID,
        conversationId: CONVERSATION_ID,
        role: "assistant",
      }),
    );

    const events = await readEvents(response);
    expect(events.map((event) => event.type)).toEqual([
      "phase",
      "user-message",
      "assistant-delta",
      "assistant-message",
      "done",
    ]);
    expect(events[0]).toMatchObject({ phase: "streaming" });
    expect(events.at(-1)).toMatchObject({ status: "completed" });
  });

  it("streams a progressive response through the genuine AI provider", async () => {
    mocks.detectCrisisIntent.mockReturnValueOnce(false);

    // Mock the async generator for streamGroundedAnswer
    mocks.streamGroundedAnswer.mockImplementationOnce(async function* (
      input: Record<string, unknown>,
    ) {
      // Ensure usageContext was passed correctly
      expect(input.usageContext).toEqual({
        userId: OWNER_ID,
        workspaceId: "workspace-owner",
        conversationId: CONVERSATION_ID,
      });

      yield { type: "delta", text: "Steady" };
      yield { type: "delta", text: " yourself." };
      yield {
        type: "done",
        answer: {
          spokenAnswer: "Steady yourself.",
          displayAnswer: "Steady yourself.",
          citations: [],
          grounding: { usedRag: false, confidence: 1 },
        },
      };
    });

    const response = await POST(
      chatRequest({
        conversationId: CONVERSATION_ID,
        message: "What is duty?",
      }),
    );

    expect(response.status).toBe(200);
    const events = await readEvents(response);

    expect(mocks.retrieveScriptureContext).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "text",
        personaId: "krishna",
      }),
    );
    expect(events.map((event) => event.type)).toEqual([
      "user-message",
      "phase",
      "phase",
      "phase",
      "assistant-delta",
      "assistant-delta",
      "assistant-message",
      "done",
    ]);
    expect(events.filter((event) => event.type === "phase")).toEqual([
      expect.objectContaining({ phase: "retrieving" }),
      expect.objectContaining({ phase: "thinking" }),
      expect.objectContaining({ phase: "streaming" }),
    ]);
    expect(events.at(-1)).toMatchObject({ status: "completed" });

    // Check that createMessage was called to persist final answer
    expect(mocks.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "assistant",
        content: "Steady yourself.",
      }),
    );
  });

  it("streams a friendly terminal failure when local Ollama is unavailable", async () => {
    mocks.detectCrisisIntent.mockReturnValueOnce(false);
    mocks.streamGroundedAnswer.mockImplementationOnce(async function* () {
      throw new Error("connect ECONNREFUSED 127.0.0.1:11434");
    });

    const response = await POST(
      chatRequest({
        conversationId: CONVERSATION_ID,
        message: "What is duty?",
      }),
    );
    const events = await readEvents(response);

    expect(events).toContainEqual(
      expect.objectContaining({
        type: "error",
        code: "LOCAL_AI_UNAVAILABLE",
        error:
          "Local AI is unavailable. Start Ollama and confirm the configured model is installed.",
      }),
    );
    expect(events.at(-1)).toMatchObject({ type: "done", status: "failed" });
  });

  it("passes only bounded user-visible conversation history to generation", async () => {
    mocks.detectCrisisIntent.mockReturnValueOnce(false);
    const previousTurns = Array.from({ length: 14 }, (_, index) => ({
      id: `previous-${index}`,
      role: index % 2 === 0 ? "user" : "assistant",
      content: `turn-${index}`,
      createdAt: new Date(
        `2026-06-14T00:00:${String(index).padStart(2, "0")}.000Z`,
      ),
    }));
    mocks.listMessages.mockResolvedValueOnce([
      {
        id: "system-internal",
        role: "system",
        content: "internal prompt",
        createdAt: new Date("2026-06-14T00:00:00.000Z"),
      },
      {
        id: "tool-internal",
        role: "tool",
        content: "internal tool output",
        createdAt: new Date("2026-06-14T00:00:00.000Z"),
      },
      ...previousTurns,
    ]);
    mocks.streamGroundedAnswer.mockImplementationOnce(async function* (
      input: Record<string, unknown>,
    ) {
      expect(input.history).toEqual(
        previousTurns.slice(2).map((message) => ({
          role: message.role,
          content: message.content,
        })),
      );
      yield { type: "delta", text: "Follow the recent thread." };
      yield {
        type: "done",
        answer: {
          spokenAnswer: "Follow the recent thread.",
          displayAnswer: "Follow the recent thread.",
          citations: [],
          grounding: { usedRag: false, confidence: 1 },
        },
      };
    });

    const response = await POST(
      chatRequest({
        conversationId: CONVERSATION_ID,
        message: "Continue",
      }),
    );

    expect(response.status).toBe(200);
    await readEvents(response);
  });

  it("passes voice mode through without marking an ungrounded answer voice-eligible", async () => {
    mocks.detectCrisisIntent.mockReturnValueOnce(false);
    mocks.streamGroundedAnswer.mockImplementationOnce(async function* () {
      yield { type: "delta", text: "Act with steadiness." };
      yield {
        type: "done",
        answer: {
          spokenAnswer: "Act with steadiness.",
          displayAnswer: "Act with steadiness.",
          citations: [],
          grounding: { usedRag: false, confidence: 1 },
          metadata: {
            provider: "ollama",
            model: "qwen3:8b",
          },
        },
      };
    });

    const response = await POST(
      chatRequest({
        conversationId: CONVERSATION_ID,
        message: "What is duty?",
        interactionMode: "voice",
        turnId: "turn-voice",
      }),
    );

    expect(response.status).toBe(200);
    await readEvents(response);

    expect(mocks.retrieveScriptureContext).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "voice",
        traceId: expect.any(String),
      }),
    );
    expect(mocks.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          interactionMode: "voice",
          model: "qwen3:8b",
          provider: "ollama",
          turnId: "turn-voice",
          voiceEligible: false,
        }),
      }),
    );
  });

  it("returns 429 before conversation lookup when rate limited", async () => {
    mocks.checkRateLimit.mockReturnValueOnce({
      allowed: false,
      remaining: 0,
      retryAfterMs: 2500,
    });

    const response = await POST(
      chatRequest({ conversationId: CONVERSATION_ID, message: "Hello" }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("3");
    expect(mocks.getConversation).not.toHaveBeenCalled();
  });
});
