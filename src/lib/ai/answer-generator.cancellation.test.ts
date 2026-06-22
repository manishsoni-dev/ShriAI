import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  streamGroundedAnswer,
  type StreamEvent,
} from "@/lib/ai/answer-generator";
import { aiProvider } from "@/lib/ai";
import { personas } from "@/lib/personas";

vi.mock("@/lib/ai", () => {
  return {
    aiProvider: {
      streamChat: vi.fn(),
      generateText: vi.fn(),
      embedText: vi.fn(),
    },
    ai: vi.fn().mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("@/lib/ai").aiProvider;
    }),
  };
});

const mockPersona = personas[1]; // Krishna

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("streamGroundedAnswer - Deterministic Cancellation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aborts before any unvalidated model text is emitted", async () => {
    const controller = new AbortController();
    let yieldedChunks = 0;

    // A deterministic delayed chunk emitter
    async function* mockDelayedStream() {
      const chunks = [
        "First chunk is long enough ",
        "Second chunk ",
        "Third ",
        "Fourth ",
      ];
      for (const text of chunks) {
        // Yield after a delay
        await delay(50);
        yield { type: "text-delta" as const, text };
        yieldedChunks++;
      }
    }

    vi.mocked(aiProvider.streamChat).mockReturnValue(mockDelayedStream());

    const stream = streamGroundedAnswer({
      query: "Hello",
      persona: mockPersona,
      scriptureContext: "",
      insufficientContext: false,
      signal: controller.signal,
    });

    const events: StreamEvent[] = [];
    const abortPromise = (async () => {
      // Abort after a short time, to catch it in the middle of streaming
      await delay(75);
      controller.abort();
    })();

    await expect(async () => {
      for await (const event of stream) {
        events.push(event);
      }
    }).rejects.toThrow("AbortError");

    await abortPromise;

    // Verify it aborted before finishing all chunks (only 1 or 2 chunks yielded)
    expect(yieldedChunks).toBeGreaterThan(0);
    expect(yieldedChunks).toBeLessThan(4);

    // Citation-first buffering prevents partial, unvalidated prose from leaking.
    expect(events).toEqual([]);
  });
});
