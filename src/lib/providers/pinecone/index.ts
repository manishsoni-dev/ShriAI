import "server-only";

import { env } from "@/env";
import {
  configured,
  failed,
  hasAllValues,
  notConfigured,
} from "@/lib/providers/status";

type PineconeBoundary = {
  deriveNamespace(workspaceId: string): string;
  indexDimension: number;
  provider: "pinecone";
};

let boundary: PineconeBoundary | undefined;

export function derivePineconeNamespace(workspaceId: string) {
  const normalizedWorkspaceId = workspaceId.trim();
  if (!normalizedWorkspaceId) {
    throw new Error("workspaceId is required to derive a Pinecone namespace.");
  }

  return `workspace_${normalizedWorkspaceId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export function rejectExternalPineconeNamespace(input: {
  namespace?: unknown;
  workspaceId: string;
}) {
  if (input.namespace !== undefined) {
    throw new Error("Pinecone namespace must be derived by the server.");
  }

  return derivePineconeNamespace(input.workspaceId);
}

export function getPineconeProviderStatus() {
  if (
    !hasAllValues([
      env.PINECONE_API_KEY,
      env.PINECONE_INDEX_NAME,
      env.PINECONE_INDEX_DIMENSIONS,
    ])
  ) {
    return notConfigured("PINECONE_NOT_CONFIGURED");
  }

  if (env.PINECONE_INDEX_DIMENSIONS !== env.SHRI_AI_EMBEDDING_DIMENSIONS) {
    return failed("PINECONE_DIMENSION_MISMATCH");
  }

  return configured();
}

export function getPineconeBoundary(): PineconeBoundary | null {
  if (getPineconeProviderStatus().status !== "configured") {
    return null;
  }

  boundary ??= {
    deriveNamespace: derivePineconeNamespace,
    indexDimension: env.PINECONE_INDEX_DIMENSIONS ?? 0,
    provider: "pinecone",
  };

  return boundary;
}
