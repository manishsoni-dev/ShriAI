import type { VoiceProfile } from "@/lib/voiceProfiles";

export type BrowserSpeechResult =
  | "cancelled"
  | "completed"
  | "failed"
  | "unavailable";

type BrowserSpeechInput = {
  text: string;
  language: "en" | "hi";
  profile: VoiceProfile;
  signal?: AbortSignal;
  onStart?: () => void;
  synthesis?: SpeechSynthesis;
  createUtterance?: (text: string) => SpeechSynthesisUtterance;
  startTimeoutMs?: number;
};

export function selectBrowserVoice(
  voices: SpeechSynthesisVoice[],
  profile: VoiceProfile,
  language: "en" | "hi",
) {
  const preferredLanguage = language === "hi" ? "hi" : "en";
  const keywords = profile.preferredVoiceKeywords.map((keyword) =>
    keyword.toLowerCase(),
  );

  for (const keyword of keywords) {
    const match = voices.find(
      (voice) =>
        voice.name.toLowerCase().includes(keyword) ||
        voice.lang.toLowerCase().includes(keyword),
    );
    if (match) return match;
  }

  return (
    voices.find((voice) =>
      voice.lang.toLowerCase().startsWith(preferredLanguage),
    ) ?? null
  );
}

export function speakWithBrowserSpeech(
  input: BrowserSpeechInput,
): Promise<BrowserSpeechResult> {
  if (typeof window === "undefined" && !input.synthesis) {
    return Promise.resolve("unavailable");
  }
  const synthesis = input.synthesis ?? window.speechSynthesis;
  const createUtterance =
    input.createUtterance ??
    ((text: string) => new window.SpeechSynthesisUtterance(text));
  if (!synthesis || !createUtterance || input.signal?.aborted) {
    return Promise.resolve(input.signal?.aborted ? "cancelled" : "unavailable");
  }

  let utterance: SpeechSynthesisUtterance;
  try {
    utterance = createUtterance(input.text);
  } catch {
    return Promise.resolve("unavailable");
  }

  return new Promise((resolve) => {
    let settled = false;
    let started = false;
    const startTimer = globalThis.setTimeout(() => {
      if (!started) {
        synthesis.cancel();
        finish("failed");
      }
    }, input.startTimeoutMs ?? 2_000);

    const finish = (result: BrowserSpeechResult) => {
      if (settled) return;
      settled = true;
      globalThis.clearTimeout(startTimer);
      input.signal?.removeEventListener("abort", abort);
      resolve(result);
    };
    const abort = () => {
      synthesis.cancel();
      finish("cancelled");
    };

    utterance.lang = input.language === "hi" ? "hi-IN" : "en-IN";
    utterance.rate = input.profile.rate;
    utterance.pitch = input.profile.pitch;
    utterance.volume = input.profile.volume;
    utterance.voice = selectBrowserVoice(
      synthesis.getVoices(),
      input.profile,
      input.language,
    );
    utterance.onstart = () => {
      started = true;
      globalThis.clearTimeout(startTimer);
      input.onStart?.();
    };
    utterance.onend = () => finish("completed");
    utterance.onerror = (event) =>
      finish(event.error === "canceled" ? "cancelled" : "failed");

    input.signal?.addEventListener("abort", abort, { once: true });
    try {
      synthesis.speak(utterance);
    } catch {
      finish("failed");
    }
  });
}
