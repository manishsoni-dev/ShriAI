export type StoredFile = {
  storageKey: string;
  size: number;
  contentType: string;
};

export type StoragePutInput = {
  workspaceId: string;
  filename: string;
  contentType: string;
  bytes: Uint8Array;
};

export type StorageAdapter = {
  put(input: StoragePutInput): Promise<StoredFile>;
  get(storageKey: string): Promise<Uint8Array>;
  delete(storageKey: string): Promise<void>;
};
