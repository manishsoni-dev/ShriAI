import { describe, expect, it, vi, beforeEach } from "vitest";

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
    ensureDefaultWorkspace: vi.fn(),
    listConversations: vi.fn(),
    getConversation: vi.fn(),
    listMessages: vi.fn(),
    notFound: vi.fn(() => {
      throw new Error("NEXT_NOT_FOUND");
    }),
    redirect: vi.fn((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    }),
  };
});

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}));

vi.mock("@/auth", () => ({ auth: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mocks.userFindUnique,
    },
  },
}));

vi.mock("@/lib/workspaces", () => ({
  ensureDefaultWorkspace: mocks.ensureDefaultWorkspace,
}));

vi.mock("@/lib/conversations", () => ({
  ConversationAccessError: mocks.ConversationAccessError,
  getConversation: mocks.getConversation,
  listConversations: mocks.listConversations,
  listMessages: mocks.listMessages,
}));

vi.mock("@/app/chat/chat-shell", () => ({
  ChatShell: () => null,
}));

import ChatPage from "./page";

const OWNER_ID = "user-owner";
const CONVERSATION_ID = "conversation-owner";

function searchParams(params: { conversationId?: string; persona?: string }) {
  return Promise.resolve(params);
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.getAuthenticatedUser.mockResolvedValue({ user: { id: OWNER_ID } });
  mocks.userFindUnique.mockResolvedValue({
    id: OWNER_ID,
    email: "owner@example.com",
    name: "Owner",
    onboardedAt: new Date(),
  });
  mocks.ensureDefaultWorkspace.mockResolvedValue({
    id: "workspace-owner",
    name: "Owner Workspace",
    slug: "owner",
  });
  mocks.listConversations.mockResolvedValue([]);
  mocks.getConversation.mockResolvedValue({
    id: CONVERSATION_ID,
    title: "Krishna guidance",
    metadata: { personaId: "krishna" },
  });
  mocks.listMessages.mockResolvedValue([]);
});

describe("ChatPage conversation ownership", () => {
  it("returns notFound for missing or inaccessible selected conversations", async () => {
    mocks.getConversation.mockRejectedValueOnce(
      new mocks.ConversationAccessError(),
    );

    await expect(
      ChatPage({
        searchParams: searchParams({ conversationId: CONVERSATION_ID }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mocks.getConversation).toHaveBeenCalledWith({
      userId: OWNER_ID,
      conversationId: CONVERSATION_ID,
    });
    expect(mocks.notFound).toHaveBeenCalledOnce();
    expect(mocks.listMessages).not.toHaveBeenCalled();
  });

  it("loads messages only after confirming the selected conversation belongs to the user", async () => {
    await ChatPage({
      searchParams: searchParams({ conversationId: CONVERSATION_ID }),
    });

    expect(mocks.getConversation).toHaveBeenCalledWith({
      userId: OWNER_ID,
      conversationId: CONVERSATION_ID,
    });
    expect(mocks.listMessages).toHaveBeenCalledWith({
      userId: OWNER_ID,
      conversationId: CONVERSATION_ID,
    });
  });
});
