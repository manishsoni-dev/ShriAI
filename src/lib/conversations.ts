import type { MessageRole, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

type Metadata = Prisma.InputJsonValue;

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

async function getAccessibleConversation(input: {
  userId: string;
  conversationId: string;
}) {
  const conversation = await db.conversation.findFirst({
    where: {
      id: input.conversationId,
      workspace: {
        members: {
          some: {
            userId: input.userId,
          },
        },
      },
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
