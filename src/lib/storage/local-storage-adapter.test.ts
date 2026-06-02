import { access, readFile, rm } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { LocalStorageAdapter } from "@/lib/storage/local-storage-adapter";

const storageRoot = path.join(process.cwd(), "storage", "documents");

describe("LocalStorageAdapter", () => {
  afterEach(async () => {
    await rm(path.join(process.cwd(), "storage"), {
      force: true,
      recursive: true,
    });
  });

  it("stores and deletes files by storage key", async () => {
    const adapter = new LocalStorageAdapter();
    const stored = await adapter.put({
      workspaceId: "workspace_1",
      filename: "Notes.md",
      contentType: "text/markdown",
      bytes: new TextEncoder().encode("# Notes"),
    });

    const bytes = await adapter.get(stored.storageKey);
    expect(new TextDecoder().decode(bytes)).toBe("# Notes");
    await expect(
      readFile(path.join(storageRoot, stored.storageKey), "utf8"),
    ).resolves.toBe("# Notes");

    await adapter.delete(stored.storageKey);

    await expect(
      access(path.join(storageRoot, stored.storageKey)),
    ).rejects.toThrow();
  });
});
