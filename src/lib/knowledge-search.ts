import "server-only";

import { aiProvider } from "@/lib/ai";
import { db } from "@/lib/db";
import { toPgVectorLiteral } from "@/lib/ingestion/vector";

type SemanticSearchInput = {
  userId: string;
  workspaceId: string;
  query: string;
  topK?: number;
};

type SearchRow = {
  id: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  content: string;
  score: number;
};

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
    throw new Error("Workspace not found or access denied.");
  }
}

export async function semanticSearch(input: SemanticSearchInput) {
  await assertWorkspaceAccess(input);

  const query = input.query.trim();

  if (!query) {
    return [];
  }

  const embedding = await aiProvider.embedText({
    text: query,
    usageContext: {
      userId: input.userId,
      workspaceId: input.workspaceId,
    },
  });
  const vector = toPgVectorLiteral(embedding.embedding);
  const topK = Math.min(Math.max(input.topK ?? 5, 1), 20);

  return db.$queryRaw<SearchRow[]>`
    SELECT
      "DocumentChunk"."id",
      "DocumentChunk"."documentId",
      "Document"."filename" AS "documentName",
      "DocumentChunk"."chunkIndex",
      "DocumentChunk"."content",
      1 - ("DocumentChunk"."embedding" <=> ${vector}::vector) AS "score"
    FROM "DocumentChunk"
    INNER JOIN "Document" ON "Document"."id" = "DocumentChunk"."documentId"
    WHERE "DocumentChunk"."workspaceId" = ${input.workspaceId}
      AND "Document"."status" = 'ready'
      AND "DocumentChunk"."embedding" IS NOT NULL
    ORDER BY "DocumentChunk"."embedding" <=> ${vector}::vector
    LIMIT ${topK}
  `;
}
