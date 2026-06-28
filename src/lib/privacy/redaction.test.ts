import { describe, expect, it } from "vitest";

import { redactForLogs } from "@/lib/privacy/redaction";

describe("redactForLogs", () => {
  it("does not persist raw prompt, answer, transcript, or content fields", () => {
    const redacted = redactForLogs({
      userQuery: "Please explain my private situation with my email me@example.com",
      transcript: "This is my private spoken question.",
      assistantAnswer: "This is a generated answer with private details.",
      retrievedChunks: [
        {
          id: "chunk_1",
          content: "Sensitive uploaded document text.",
        },
      ],
      status: "success",
    });

    expect(redacted).toEqual({
      userQuery: {
        redacted: true,
        type: "string",
        length: 61,
      },
      transcript: {
        redacted: true,
        type: "string",
        length: 35,
      },
      assistantAnswer: {
        redacted: true,
        type: "string",
        length: 48,
      },
      retrievedChunks: {
        redacted: true,
        type: "array",
        itemCount: 1,
      },
      status: "success",
    });
  });

  it("still redacts secrets and tokens on explicitly sensitive keys", () => {
    const redacted = redactForLogs({
      apiKey: "sk-real-looking-secret-value",
      authorization: "Bearer abc.def.ghi",
      safeMetadata: {
        latencyMs: 123,
        eventType: "chat",
      },
    });

    expect(redacted).toEqual({
      apiKey: "[redacted]",
      authorization: "[redacted]",
      safeMetadata: {
        latencyMs: 123,
        eventType: "chat",
      },
    });
  });
});
