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
    auth: vi.fn(),
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
  };
});

vi.mock("@/auth", () => ({
  auth: mocks.auth,
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
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  rateLimitResponseHeaders: (retryAfterMs: number) => ({
    "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))),
  }),
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

  mocks.auth.mockResolvedValue({ user: { id: OWNER_ID } });
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
});

describe("POST /api/chat/stream authorization", () => {
  it("returns 401 for unauthenticated access", async () => {
    mocks.auth.mockResolvedValueOnce(null);

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

  it("uses the authenticated user id and ignores client-supplied identity", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: PEER_ID } });
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

  it("streams a response for the owning user", async () => {
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
      "user-message",
      "assistant-delta",
      "assistant-message",
    ]);
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
