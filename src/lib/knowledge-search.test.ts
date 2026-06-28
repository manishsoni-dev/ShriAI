import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/ai", () => ({
  aiProvider: {
    embedText: vi.fn().mockResolvedValue({ embedding: [0.1, 0.2] }),
  },
}));

vi.mock("@/lib/ai/config", () => ({
  aiModelConfig: {
    embeddingModel: "qwen3-embedding:0.6b",
    embeddingDimensions: 1024,
  },
}));

vi.mock("@/lib/ingestion/vector", () => ({
  toPgVectorLiteral: vi.fn(() => "[0.1,0.2]"),
}));

vi.mock("@/lib/db", () => ({
  db: {
    workspaceMember: { findUnique: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

import { aiProvider } from "@/lib/ai";
import { db } from "@/lib/db";
import { semanticSearch } from "@/lib/knowledge-search";

describe("semanticSearch workspace isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a workspace before embedding when the user is not a member", async () => {
    vi.mocked(db.workspaceMember.findUnique).mockResolvedValue(null);

    await expect(
      semanticSearch({
        userId: "user-a",
        workspaceId: "workspace-b",
        query: "private instructions",
      }),
    ).rejects.toThrow("access denied");

    expect(aiProvider.embedText).not.toHaveBeenCalled();
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it("binds every document query to the authorized workspace", async () => {
    vi.mocked(db.workspaceMember.findUnique).mockResolvedValue({
      id: "membership-a",
      userId: "user-a",
      workspaceId: "workspace-a",
      role: "MEMBER",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(db.$queryRaw).mockResolvedValue([]);

    await semanticSearch({
      userId: "user-a",
      workspaceId: "workspace-a",
      query: "dharma",
    });

    expect(db.workspaceMember.findUnique).toHaveBeenCalledWith({
      where: {
        userId_workspaceId: {
          userId: "user-a",
          workspaceId: "workspace-a",
        },
      },
    });
    expect(vi.mocked(db.$queryRaw).mock.calls[0]).toContain("workspace-a");
  });
});
