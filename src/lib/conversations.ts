import type { MessageRole, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

type Metadata = Prisma.InputJsonValue;

/**
 * Policy: Conversations are PRIVATE and owned by the user who created them.
 * Workspace membership alone does NOT grant access to another user's conversation.
 * Every read and write path must verify userId === conversation.userId.
 */
export class ConversationAccessError extends Error {
  constructor() {
    super("Conversation not found or access denied.");
    this.name = "ConversationAccessError";
  }
}

async function getWorkspaceMembership(input: {
  userId: string;
  workspaceId: string;
}) {
  return db.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: input.userId,
        workspaceId: input.workspaceId,
      },
    },
  });
}

async function assertWorkspaceAccess(input: {
  userId: string;
  workspaceId: string;
}) {
  const membership = await getWorkspaceMembership(input);

  if (!membership) {
    throw new ConversationAccessError();
  }

  return membership;
}

/**
 * Returns the conversation only if the authenticated user is its owner.
 * Uses findUnique on (id, userId) so the query hits the primary key and the
 * userId index in a single round-trip — no workspace join required.
 */
async function getAccessibleConversation(input: {
  userId: string;
  conversationId: string;
}) {
  const conversation = await db.conversation.findFirst({
    where: {
      id: input.conversationId,
      userId: input.userId,
    },
  });

  if (!conversation) {
    throw new ConversationAccessError();
  }

  return conversation;
}

export async function createConversation(input: {
  userId: string;
  workspaceId: string;
  title?: string;
  metadata?: Metadata;
}) {
  await assertWorkspaceAccess(input);

  return db.conversation.create({
    data: {
      title: input.title?.trim() || null,
      metadata: input.metadata,
      userId: input.userId,
      workspaceId: input.workspaceId,
    },
  });
}

export async function listConversations(input: {
  userId: string;
  workspaceId: string;
  limit?: number;
}) {
  await assertWorkspaceAccess(input);

  return db.conversation.findMany({
    where: {
      workspaceId: input.workspaceId,
      userId: input.userId, // Private: only the owner's conversations
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: input.limit ?? 50,
  });
}

export async function getConversation(input: {
  userId: string;
  conversationId: string;
}) {
  return getAccessibleConversation(input);
}

export async function deleteConversation(input: {
  userId: string;
  conversationId: string;
}) {
  await getAccessibleConversation(input);

  return db.conversation.delete({
    where: {
      id: input.conversationId,
    },
  });
}

export async function createMessage(input: {
  userId: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata?: Metadata;
}) {
  await getAccessibleConversation(input);

  return db.message.create({
    data: {
      role: input.role,
      content: input.content,
      metadata: input.metadata,
      conversationId: input.conversationId,
    },
  });
}

export async function listMessages(input: {
  userId: string;
  conversationId: string;
  limit?: number;
}) {
  await getAccessibleConversation(input);

  return db.message.findMany({
    where: {
      conversationId: input.conversationId,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: input.limit ?? 100,
  });
}
