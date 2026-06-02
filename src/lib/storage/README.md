# Storage Adapters

Document uploads use the `StorageAdapter` interface in `types.ts`.

The development adapter stores files under `storage/documents`, which is ignored by git.

To add S3 or R2 later:

1. Create a new adapter class that implements `StorageAdapter`, including `put`, `get`, and `delete`.
2. Keep keys workspace-scoped, for example `${workspaceId}/${uuid}-${filename}`.
3. Export the selected adapter from `index.ts`.
4. Keep upload UI and document metadata code unchanged.
