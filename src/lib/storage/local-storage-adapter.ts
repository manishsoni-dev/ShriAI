import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { StorageAdapter, StoragePutInput } from "@/lib/storage/types";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "documents");

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120);
}

export class LocalStorageAdapter implements StorageAdapter {
  async put(input: StoragePutInput) {
    const safeFilename = sanitizeFilename(input.filename) || "document";
    const storageKey = `${input.workspaceId}/${randomUUID()}-${safeFilename}`;
    const fullPath = path.join(STORAGE_ROOT, storageKey);

    await mkdir(path.dirname(fullPath), {
      recursive: true,
    });
    await writeFile(fullPath, input.bytes);

    return {
      storageKey,
      size: input.bytes.byteLength,
      contentType: input.contentType,
    };
  }

  async get(storageKey: string) {
    return readFile(path.join(STORAGE_ROOT, storageKey));
  }

  async delete(storageKey: string) {
    const fullPath = path.join(STORAGE_ROOT, storageKey);
    await rm(fullPath, {
      force: true,
    });
  }
}
