import "server-only";

import { Prisma } from "@prisma/client";

import { aiProvider } from "@/lib/ai";
import { db } from "@/lib/db";
import { chunkText } from "@/lib/ingestion/chunking";
import { extractTextFromDocument } from "@/lib/ingestion/extract-text";
import { toPgVectorLiteral } from "@/lib/ingestion/vector";
import { storageAdapter } from "@/lib/storage";

type IngestDocumentInput = {
  userId: string;
  documentId: string;
  chunkSize?: number;
  overlap?: number;
};

async function setChunkEmbedding(input: {
  chunkId: string;
  embedding: number[];
}) {
  const vector = toPgVectorLiteral(input.embedding);

  await db.$executeRaw`
    UPDATE "DocumentChunk"
    SET "embedding" = ${vector}::vector
    WHERE "id" = ${input.chunkId}
  `;
}

export async function ingestDocument(input: IngestDocumentInput) {
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
    throw new Error("Document not found or access denied.");
  }

  await db.document.update({
    where: {
      id: document.id,
    },
    data: {
      status: "processing",
    },
  });

  try {
    const bytes = await storageAdapter.get(document.storageKey);
    const text = await extractTextFromDocument({
      bytes,
      contentType: document.contentType,
      filename: document.filename,
    });
    const chunks = chunkText(text, {
      chunkSize: input.chunkSize,
      overlap: input.overlap,
    });

    if (chunks.length === 0) {
      throw new Error("No extractable text was found.");
    }

    await db.documentChunk.deleteMany({
      where: {
        documentId: document.id,
      },
    });

    for (const chunk of chunks) {
      const createdChunk = await db.documentChunk.create({
        data: {
          documentId: document.id,
          workspaceId: document.workspaceId,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          metadata: chunk.metadata,
        },
      });

      const embedding = await aiProvider.embedText({
        text: chunk.content,
        metadata: {
          documentId: document.id,
          chunkId: createdChunk.id,
        },
        usageContext: {
          userId: input.userId,
          workspaceId: document.workspaceId,
        },
      });

      await setChunkEmbedding({
        chunkId: createdChunk.id,
        embedding: embedding.embedding,
      });
    }

    return db.document.update({
      where: {
        id: document.id,
      },
      data: {
        status: "ready",
      },
    });
  } catch (error) {
    await db.document.update({
      where: {
        id: document.id,
      },
      data: {
        status: "failed",
      },
    });

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw error;
    }

    return null;
  }
}
