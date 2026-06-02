import type { DocumentStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { storageAdapter } from "@/lib/storage";

export class DocumentAccessError extends Error {
  constructor() {
    super("Document not found or access denied.");
    this.name = "DocumentAccessError";
  }
}

async function assertWorkspaceAccess(input: {
  userId: string;
  workspaceId: string;
}) {
  const membership = await db.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: input.userId,
        workspaceId: input.workspaceId,
      },
    },
  });

  if (!membership) {
    throw new DocumentAccessError();
  }
}

export async function listDocuments(input: {
  userId: string;
  workspaceId: string;
}) {
  await assertWorkspaceAccess(input);

  return db.document.findMany({
    where: {
      workspaceId: input.workspaceId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      uploadedBy: {
        select: {
          email: true,
          name: true,
        },
      },
      _count: {
        select: {
          chunks: true,
        },
      },
    },
  });
}

export async function createDocument(input: {
  userId: string;
  workspaceId: string;
  filename: string;
  contentType: string;
  bytes: Uint8Array;
  status?: DocumentStatus;
}) {
  await assertWorkspaceAccess(input);

  const storedFile = await storageAdapter.put({
    workspaceId: input.workspaceId,
    filename: input.filename,
    contentType: input.contentType,
    bytes: input.bytes,
  });

  return db.document.create({
    data: {
      filename: input.filename,
      contentType: storedFile.contentType,
      size: storedFile.size,
      storageKey: storedFile.storageKey,
      status: input.status ?? "uploaded",
      uploadedById: input.userId,
      workspaceId: input.workspaceId,
    },
  });
}

export async function deleteDocument(input: {
  userId: string;
  documentId: string;
}) {
  const document = await db.document.findFirst({
    where: {
      id: input.documentId,
      workspace: {
        members: {
          some: {
            userId: input.userId,
          },
        },
      },
    },
  });

  if (!document) {
    throw new DocumentAccessError();
  }

  await db.document.delete({
    where: {
      id: document.id,
    },
  });
  await storageAdapter.delete(document.storageKey);

  return document;
}
