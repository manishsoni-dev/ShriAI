import { describe, expect, it, vi } from "vitest";

import {
  selectBrowserVoice,
  speakWithBrowserSpeech,
} from "@/lib/voice/browser-speech";
import { getVoiceProfile } from "@/lib/voiceProfiles";

function voice(name: string, lang: string) {
  return { name, lang } as SpeechSynthesisVoice;
}

function harness() {
  let utterance: SpeechSynthesisUtterance | null = null;
  const synthesis = {
    cancel: vi.fn(),
    getVoices: vi.fn(() => [voice("Rishi", "en-IN")]),
    speak: vi.fn((value: SpeechSynthesisUtterance) => {
      utterance = value;
    }),
  } as unknown as SpeechSynthesis;
  return {
    synthesis,
    getUtterance: () => utterance,
    createUtterance: (text: string) =>
      ({ text }) as unknown as SpeechSynthesisUtterance,
  };
}

describe("browser speech", () => {
  it("selects persona and language-aware local voices", () => {
    const selected = selectBrowserVoice(
      [voice("Samantha", "en-US"), voice("Rishi", "en-IN")],
      getVoiceProfile("krishna"),
      "en",
    );
    expect(selected?.name).toBe("Rishi");
  });

  it("resolves after successful browser speech", async () => {
    const test = harness();
    const result = speakWithBrowserSpeech({
      text: "Steady action.",
      language: "en",
      profile: getVoiceProfile("krishna"),
      synthesis: test.synthesis,
      createUtterance: test.createUtterance,
    });
    test.getUtterance()!.onstart!(new Event("start") as SpeechSynthesisEvent);
    test.getUtterance()!.onend!(new Event("end") as SpeechSynthesisEvent);
    await expect(result).resolves.toBe("completed");
  });

  it("cancels without asking callers to fall back", async () => {
    const test = harness();
    const controller = new AbortController();
    const result = speakWithBrowserSpeech({
      text: "Steady action.",
      language: "en",
      profile: getVoiceProfile("rama"),
      signal: controller.signal,
      synthesis: test.synthesis,
      createUtterance: test.createUtterance,
    });
    controller.abort();
    await expect(result).resolves.toBe("cancelled");
    expect(test.synthesis.cancel).toHaveBeenCalledOnce();
  });

  it("signals failure while leaving the visible text available", async () => {
    const test = harness();
    const result = speakWithBrowserSpeech({
      text: "Steady action.",
      language: "en",
      profile: getVoiceProfile("sita"),
      synthesis: test.synthesis,
      createUtterance: test.createUtterance,
    });
    test.getUtterance()!.onerror!(
      new Event("error") as SpeechSynthesisErrorEvent,
    );
    await expect(result).resolves.toBe("failed");
  });

  it("reports unavailable when the utterance API is missing", async () => {
    const test = harness();
    await expect(
      speakWithBrowserSpeech({
        text: "Steady action.",
        language: "en",
        profile: getVoiceProfile("hanuman"),
        synthesis: test.synthesis,
        createUtterance: () => {
          throw new Error("SpeechSynthesisUtterance missing");
        },
      }),
    ).resolves.toBe("unavailable");
    expect(test.synthesis.speak).not.toHaveBeenCalled();
  });
});
