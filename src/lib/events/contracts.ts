import { z } from "zod";

const baseEventSchema = z.object({
  eventId: z.string().min(1),
  idempotencyKey: z.string().min(1),
  occurredAt: z.string().datetime(),
});

const accountCreatedSchema = baseEventSchema
  .extend({
    name: z.literal("account.created"),
    userId: z.string().min(1),
    workspaceId: z.string().min(1),
  })
  .strict();

const authLoginSucceededSchema = baseEventSchema
  .extend({
    name: z.literal("auth.login.succeeded"),
    interactive: z.literal(true),
    userId: z.string().min(1),
  })
  .strict();

const documentIngestionRequestedSchema = baseEventSchema
  .extend({
    documentId: z.string().min(1),
    name: z.literal("document.ingestion.requested"),
    requestedByUserId: z.string().min(1),
    workspaceId: z.string().min(1),
  })
  .strict();

const documentIngestionFailedSchema = baseEventSchema
  .extend({
    documentId: z.string().min(1),
    errorCode: z.string().min(1),
    name: z.literal("document.ingestion.failed"),
    workspaceId: z.string().min(1),
  })
  .strict();

const documentIngestionCompletedSchema = baseEventSchema
  .extend({
    chunkCount: z.number().int().min(0),
    documentId: z.string().min(1),
    name: z.literal("document.ingestion.completed"),
    workspaceId: z.string().min(1),
  })
  .strict();

export const appEventContractSchema = z.discriminatedUnion("name", [
  accountCreatedSchema,
  authLoginSucceededSchema,
  documentIngestionRequestedSchema,
  documentIngestionFailedSchema,
  documentIngestionCompletedSchema,
]);

export type AppEventContract = z.infer<typeof appEventContractSchema>;
export type AppEventName = AppEventContract["name"];

export const appEventNames = [
  "account.created",
  "auth.login.succeeded",
  "document.ingestion.requested",
  "document.ingestion.failed",
  "document.ingestion.completed",
] as const satisfies readonly AppEventName[];
