import type { UsageEventStatus } from "@prisma/client";

import { db } from "@/lib/db";

type RecordUsageEventInput = {
  userId: string;
  workspaceId: string;
  conversationId?: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs: number;
  status: UsageEventStatus;
  errorCode?: string;
};

export async function recordUsageEvent(input: RecordUsageEventInput) {
  return db.usageEvent.create({
    data: {
      userId: input.userId,
      workspaceId: input.workspaceId,
      conversationId: input.conversationId,
      provider: input.provider,
      model: input.model,
      inputTokens: input.inputTokens ?? 0,
      outputTokens: input.outputTokens ?? 0,
      totalTokens:
        input.totalTokens ??
        (input.inputTokens ?? 0) + (input.outputTokens ?? 0),
      latencyMs: input.latencyMs,
      status: input.status,
      errorCode: input.errorCode,
    },
  });
}
