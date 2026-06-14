import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ConversationAccessError,
  createConversation,
  createMessage,
  deleteConversation,
  getConversation,
  listConversations,
  listMessages,
} from "./conversations";

// ---------------------------------------------------------------------------
// Mock the Prisma client so tests run without a live database
// ---------------------------------------------------------------------------

vi.mock("@/lib/db", () => {
  const workspaceMemberStore: Record<
    string,
    { id: string; userId: string; workspaceId: string; role: string }
  > = {};
  const conversationStore: Record<
    string,
    {
      id: string;
      userId: string;
      workspaceId: string;
      title: string | null;
      metadata: unknown;
      createdAt: Date;
      updatedAt: Date;
    }
  > = {};
  const messageStore: Record<
    string,
    {
      id: string;
      conversationId: string;
      role: string;
      content: string;
      metadata: unknown;
      createdAt: Date;
      updatedAt: Date;
    }
  > = {};

  let idCounter = 0;
  const newId = () => `id-${++idCounter}`;

  function memberKey(userId: string, workspaceId: string) {
    return `${userId}:${workspaceId}`;
  }

  return {
    db: {
      workspaceMember: {
        findUnique: vi.fn(({ where }) => {
          const key = memberKey(
            where.userId_workspaceId.userId,
            where.userId_workspaceId.workspaceId,
          );
          return Promise.resolve(workspaceMemberStore[key] ?? null);
        }),
        create: vi.fn(({ data }) => {
          const key = memberKey(data.userId, data.workspaceId);
          const record = { id: newId(), role: "MEMBER", ...data };
          workspaceMemberStore[key] = record;
          return Promise.resolve(record);
        }),
        // Expose store mutation for test setup
        _seed: (userId: string, workspaceId: string, role = "MEMBER") => {
          const key = memberKey(userId, workspaceId);
          workspaceMemberStore[key] = {
            id: newId(),
            userId,
            workspaceId,
            role,
          };
        },
        _clear: () => {
          for (const k of Object.keys(workspaceMemberStore)) {
            delete workspaceMemberStore[k];
          }
        },
      },
      conversation: {
        findFirst: vi.fn(({ where }) => {
          const match = Object.values(conversationStore).find(
            (c) =>
              c.id === where.id &&
              (where.userId === undefined || c.userId === where.userId),
          );
          return Promise.resolve(match ?? null);
        }),
        findMany: vi.fn(({ where, take }) => {
          const results = Object.values(conversationStore).filter(
            (c) =>
              c.workspaceId === where.workspaceId &&
              (where.userId === undefined || c.userId === where.userId),
          );
          return Promise.resolve(results.slice(0, take ?? 50));
        }),
        create: vi.fn(({ data }) => {
          const record = {
            id: newId(),
            title: null,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          conversationStore[record.id] = record;
          return Promise.resolve(record);
        }),
        delete: vi.fn(({ where }) => {
          const record = conversationStore[where.id];
          if (!record) throw new Error("Record not found");
          delete conversationStore[where.id];
          return Promise.resolve(record);
        }),
        _seed: (
          id: string,
          userId: string,
          workspaceId: string,
          title?: string,
        ) => {
          conversationStore[id] = {
            id,
            userId,
            workspaceId,
            title: title ?? null,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        },
        _clear: () => {
          for (const k of Object.keys(conversationStore)) {
            delete conversationStore[k];
          }
        },
      },
      message: {
        findMany: vi.fn(({ where, take }) => {
          const results = Object.values(messageStore).filter(
            (m) => m.conversationId === where.conversationId,
          );
          return Promise.resolve(results.slice(0, take ?? 100));
        }),
        create: vi.fn(({ data }) => {
          const record = {
            id: newId(),
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          messageStore[record.id] = record;
          return Promise.resolve(record);
        }),
        _seed: (id: string, conversationId: string, content: string) => {
          messageStore[id] = {
            id,
            conversationId,
            role: "user",
            content,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        },
        _clear: () => {
          for (const k of Object.keys(messageStore)) {
            delete messageStore[k];
          }
        },
      },
    },
  };
});

// ---------------------------------------------------------------------------
// Import db AFTER mocking so we get the mock instance
// ---------------------------------------------------------------------------

import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const OWNER_ID = "user-owner";
const OTHER_ID = "user-other";
const WORKSPACE_ID = "ws-1";
const CONV_ID = "conv-1";

function seedMembership(userId: string, workspaceId: string = WORKSPACE_ID) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (db.workspaceMember as any)._seed(userId, workspaceId);
}

function seedConversation(
  id: string = CONV_ID,
  userId: string = OWNER_ID,
  workspaceId: string = WORKSPACE_ID,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (db.conversation as any)._seed(id, userId, workspaceId, "Test conversation");
}

function seedMessage(
  id: string,
  conversationId: string = CONV_ID,
  content = "hello",
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (db.message as any)._seed(id, conversationId, content);
}

function clearAll() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (db.workspaceMember as any)._clear();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (db.conversation as any)._clear();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (db.message as any)._clear();
}

beforeEach(() => {
  clearAll();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// createConversation
// ---------------------------------------------------------------------------

describe("createConversation", () => {
  it("creates a conversation for a workspace member", async () => {
    seedMembership(OWNER_ID);
    const result = await createConversation({
      userId: OWNER_ID,
      workspaceId: WORKSPACE_ID,
      title: "My journey",
    });
    expect(result.userId).toBe(OWNER_ID);
    expect(result.workspaceId).toBe(WORKSPACE_ID);
    expect(result.title).toBe("My journey");
  });

  it("rejects a user who is not a workspace member", async () => {
    // OTHER_ID has no membership seeded
    await expect(
      createConversation({ userId: OTHER_ID, workspaceId: WORKSPACE_ID }),
    ).rejects.toBeInstanceOf(ConversationAccessError);
  });

  it("trims whitespace-only titles to null", async () => {
    seedMembership(OWNER_ID);
    const result = await createConversation({
      userId: OWNER_ID,
      workspaceId: WORKSPACE_ID,
      title: "   ",
    });
    expect(result.title).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getConversation — ownership isolation
// ---------------------------------------------------------------------------

describe("getConversation", () => {
  it("returns the conversation to the owner", async () => {
    seedConversation(CONV_ID, OWNER_ID);
    const result = await getConversation({
      userId: OWNER_ID,
      conversationId: CONV_ID,
    });
    expect(result.id).toBe(CONV_ID);
    expect(result.userId).toBe(OWNER_ID);
  });

  it("denies a workspace peer who is not the owner", async () => {
    // OTHER_ID is a member of the same workspace, but the conversation belongs to OWNER_ID
    seedMembership(OTHER_ID);
    seedConversation(CONV_ID, OWNER_ID);
    await expect(
      getConversation({ userId: OTHER_ID, conversationId: CONV_ID }),
    ).rejects.toBeInstanceOf(ConversationAccessError);
  });

  it("rejects a completely different user", async () => {
    seedConversation(CONV_ID, OWNER_ID);
    await expect(
      getConversation({ userId: "stranger", conversationId: CONV_ID }),
    ).rejects.toBeInstanceOf(ConversationAccessError);
  });

  it("rejects a valid user querying a non-existent conversation", async () => {
    await expect(
      getConversation({ userId: OWNER_ID, conversationId: "does-not-exist" }),
    ).rejects.toBeInstanceOf(ConversationAccessError);
  });
});

// ---------------------------------------------------------------------------
// listConversations — ownership isolation
// ---------------------------------------------------------------------------

describe("listConversations", () => {
  it("returns only the caller's conversations in the workspace", async () => {
    seedMembership(OWNER_ID);
    seedMembership(OTHER_ID);
    seedConversation("conv-a", OWNER_ID);
    seedConversation("conv-b", OTHER_ID); // peer's conversation — must be hidden
    seedConversation("conv-c", OWNER_ID);

    const result = await listConversations({
      userId: OWNER_ID,
      workspaceId: WORKSPACE_ID,
    });

    const ids = result.map((c) => c.id);
    expect(ids).toContain("conv-a");
    expect(ids).toContain("conv-c");
    expect(ids).not.toContain("conv-b"); // peer's conversation is not returned
  });

  it("returns an empty list when the caller has no conversations", async () => {
    seedMembership(OWNER_ID);
    seedConversation("conv-b", OTHER_ID);

    const result = await listConversations({
      userId: OWNER_ID,
      workspaceId: WORKSPACE_ID,
    });
    expect(result).toHaveLength(0);
  });

  it("rejects a user who is not a workspace member", async () => {
    await expect(
      listConversations({ userId: "stranger", workspaceId: WORKSPACE_ID }),
    ).rejects.toBeInstanceOf(ConversationAccessError);
  });
});

// ---------------------------------------------------------------------------
// deleteConversation — ownership isolation
// ---------------------------------------------------------------------------

describe("deleteConversation", () => {
  it("allows the owner to delete their conversation", async () => {
    seedConversation(CONV_ID, OWNER_ID);
    await expect(
      deleteConversation({ userId: OWNER_ID, conversationId: CONV_ID }),
    ).resolves.toBeDefined();
  });

  it("prevents a workspace peer from deleting another user's conversation", async () => {
    seedConversation(CONV_ID, OWNER_ID);
    await expect(
      deleteConversation({ userId: OTHER_ID, conversationId: CONV_ID }),
    ).rejects.toBeInstanceOf(ConversationAccessError);
  });
});

// ---------------------------------------------------------------------------
// createMessage — ownership required
// ---------------------------------------------------------------------------

describe("createMessage", () => {
  it("allows the owner to add a message", async () => {
    seedConversation(CONV_ID, OWNER_ID);
    const result = await createMessage({
      userId: OWNER_ID,
      conversationId: CONV_ID,
      role: "user",
      content: "O Krishna, what is duty?",
    });
    expect(result.content).toBe("O Krishna, what is duty?");
    expect(result.conversationId).toBe(CONV_ID);
  });

  it("prevents a workspace peer from writing to another user's conversation", async () => {
    seedConversation(CONV_ID, OWNER_ID);
    await expect(
      createMessage({
        userId: OTHER_ID,
        conversationId: CONV_ID,
        role: "user",
        content: "Injected message",
      }),
    ).rejects.toBeInstanceOf(ConversationAccessError);
  });

  it("prevents an anonymous user from writing to any conversation", async () => {
    seedConversation(CONV_ID, OWNER_ID);
    await expect(
      createMessage({
        userId: "",
        conversationId: CONV_ID,
        role: "user",
        content: "anonymous injection",
      }),
    ).rejects.toBeInstanceOf(ConversationAccessError);
  });
});

// ---------------------------------------------------------------------------
// listMessages — ownership required
// ---------------------------------------------------------------------------

describe("listMessages", () => {
  it("returns messages to the conversation owner", async () => {
    seedConversation(CONV_ID, OWNER_ID);
    seedMessage("msg-1", CONV_ID, "first message");
    seedMessage("msg-2", CONV_ID, "second message");

    const result = await listMessages({
      userId: OWNER_ID,
      conversationId: CONV_ID,
    });
    expect(result).toHaveLength(2);
  });

  it("denies a workspace peer from reading another user's messages", async () => {
    seedConversation(CONV_ID, OWNER_ID);
    seedMessage("msg-1", CONV_ID, "private message");

    await expect(
      listMessages({ userId: OTHER_ID, conversationId: CONV_ID }),
    ).rejects.toBeInstanceOf(ConversationAccessError);
  });

  it("denies a stranger from reading messages", async () => {
    seedConversation(CONV_ID, OWNER_ID);
    seedMessage("msg-1", CONV_ID, "private message");

    await expect(
      listMessages({ userId: "stranger", conversationId: CONV_ID }),
    ).rejects.toBeInstanceOf(ConversationAccessError);
  });
});

// ---------------------------------------------------------------------------
// Cross-workspace isolation
// ---------------------------------------------------------------------------

describe("cross-workspace access", () => {
  it("does not expose a conversation from workspace A to a member of workspace B", async () => {
    const WS_A = "workspace-a";
    const WS_B = "workspace-b";

    seedMembership(OWNER_ID, WS_A);
    seedMembership(OTHER_ID, WS_B);
    seedConversation("conv-ws-a", OWNER_ID, WS_A);

    // OTHER_ID is a member of WS_B, not WS_A, and does not own conv-ws-a
    await expect(
      getConversation({ userId: OTHER_ID, conversationId: "conv-ws-a" }),
    ).rejects.toBeInstanceOf(ConversationAccessError);
  });

  it("does not include foreign-workspace conversations in listConversations", async () => {
    const WS_A = "workspace-a";
    const WS_B = "workspace-b";

    seedMembership(OWNER_ID, WS_A);
    seedMembership(OWNER_ID, WS_B);
    seedConversation("conv-in-a", OWNER_ID, WS_A);
    seedConversation("conv-in-b", OWNER_ID, WS_B);

    const resultA = await listConversations({
      userId: OWNER_ID,
      workspaceId: WS_A,
    });
    expect(resultA.map((c) => c.id)).toEqual(["conv-in-a"]);

    const resultB = await listConversations({
      userId: OWNER_ID,
      workspaceId: WS_B,
    });
    expect(resultB.map((c) => c.id)).toEqual(["conv-in-b"]);
  });
});
