import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  db: {
    observabilityEvent: {
      create: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import { logObservabilityEvent } from "@/lib/observability";

describe("logObservabilityEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not persist raw content-like telemetry fields", async () => {
    await logObservabilityEvent({
      traceId: "trace-1",
      eventType: "chat",
      status: "error",
      payload: {
        contentPreview: "What should I privately do?",
        queryPreview: "private query",
        error: "provider leaked raw details",
        errorClass: "AIError",
        contentLength: 27,
        retrievedChunkCount: 2,
        nested: {
          transcriptText: "spoken private text",
          safeId: "chunk-1",
        },
      },
    });

    expect(db.observabilityEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        payload: {
          contentPreview: { length: 27 },
          queryPreview: { length: 13 },
          error: { length: 27 },
          errorClass: "AIError",
          contentLength: 27,
          retrievedChunkCount: 2,
          nested: {
            transcriptText: { length: 19 },
            safeId: "chunk-1",
          },
        },
      }),
    });
  });

  it("redacts secret, email, cookie, and token-like payload values", async () => {
    await logObservabilityEvent({
      traceId: "trace-2",
      eventType: "chat",
      status: "error",
      payload: {
        authorization: "Bearer api_key_sentinel_private",
        cookie: "session=token_sentinel_private",
        diagnostic: "email seeker@example.com used sk-privateSentinel1234",
        transcript: "spoken private text",
      },
    });

    const createCall = vi.mocked(db.observabilityEvent.create).mock.calls[0]!;
    const payload = createCall[0].data.payload;

    expect(JSON.stringify(payload)).not.toContain("seeker@example.com");
    expect(JSON.stringify(payload)).not.toContain("privateSentinel");
    expect(payload).toMatchObject({
      authorization: "[redacted]",
      cookie: "[redacted]",
      diagnostic: "email [redacted-email] used [redacted-key]",
      transcript: { length: 19 },
    });
  });
});
