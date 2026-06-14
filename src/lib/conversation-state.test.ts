import { describe, expect, it, vi } from "vitest";

import {
  activeConversationPhases,
  createTurnId,
  isActiveConversationPhase,
  normalizeInteractionMode,
  type ConversationPhase,
} from "@/lib/conversation-state";

describe("conversation state helpers", () => {
  it("normalizes interaction mode with text as the missing default", () => {
    expect(normalizeInteractionMode({})).toBe("text");
    expect(normalizeInteractionMode({ interactionMode: "text" })).toBe("text");
    expect(normalizeInteractionMode({ interactionMode: "voice" })).toBe(
      "voice",
    );
    expect(normalizeInteractionMode({ legacySource: "voice" })).toBe("voice");
    expect(normalizeInteractionMode({ interactionMode: "screen" })).toBeNull();
    expect(normalizeInteractionMode({ legacySource: "screen" })).toBeNull();
  });

  it("classifies active phases without treating terminal states as active work", () => {
    const phases: ConversationPhase[] = [
      "idle",
      "listening",
      "transcribing",
      "retrieving",
      "thinking",
      "streaming",
      "speaking",
      "interrupted",
      "error",
    ];

    expect([...activeConversationPhases]).toEqual([
      "listening",
      "transcribing",
      "retrieving",
      "thinking",
      "streaming",
      "speaking",
    ]);
    expect(phases.filter((phase) => !isActiveConversationPhase(phase))).toEqual(
      ["idle", "interrupted", "error"],
    );
  });

  it("creates turn ids through crypto.randomUUID", () => {
    const randomUUID = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValue("turn-fixed-id");

    expect(createTurnId()).toBe("turn-fixed-id");
    expect(randomUUID).toHaveBeenCalledOnce();

    randomUUID.mockRestore();
  });
});
