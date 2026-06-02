import "server-only";

import { LocalStorageAdapter } from "@/lib/storage/local-storage-adapter";
import type { StorageAdapter } from "@/lib/storage/types";

export type {
  StorageAdapter,
  StoragePutInput,
  StoredFile,
} from "@/lib/storage/types";

export const storageAdapter: StorageAdapter = new LocalStorageAdapter();
