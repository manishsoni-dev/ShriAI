import type { VoiceProfile } from "@/lib/voiceProfiles";

/**
 * Clean text before sending to TTS.
 * Removes markdown, citation-style brackets, debug text,
 * and normalizes Sanskrit/Devanagari terms for pronunciation.
 */
export function cleanTextForTTS(text: string): string {
  return (
    text
      // Remove markdown bold/italic/code markers
      .replace(/(\*\*|__)(.*?)\1/g, "$2")
      .replace(/(\*|_)(.*?)\1/g, "$2")
      .replace(/`{1,3}[^`]*`{1,3}/g, "")
      // Remove markdown headings (##, ###, etc.)
      .replace(/^#{1,6}\s+/gm, "")
      // Remove markdown links [text](url) → keep text
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      // Remove citation-style brackets like [1], [2], [SOURCE]
      .replace(/\[\d+\]/g, "")
      .replace(/\[SOURCE[^\]]*\]/gi, "")
      // Remove horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, "")
      // Normalize Jñāna / Jnana → "Gyaana" (pronunciation-friendly)
      .replace(/J\u00f1\u0101na/g, "Gyaana")
      .replace(/Jnana/gi, "Gyaana")
      // Normalize common Sanskrit terms for TTS pronunciation
      .replace(/Dharma/g, "Dhar-ma")
      .replace(/Bhakti/g, "Bhak-ti")
      .replace(/Karma/g, "Kar-ma")
      .replace(/Seva/g, "Say-va")
      .replace(/श्री/g, "Shree")
      .replace(/Jñāna/g, "Gyaana")
      // Collapse multiple blank lines
      .replace(/\n{3,}/g, "\n\n")
      // Trim
      .trim()
  );
}

/**
 * Truncate text to the maximum TTS character limit for a persona.
 * Tries to break at a sentence boundary to avoid mid-sentence cutoff.
 */
export function truncateForTTS(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;

  const truncated = text.slice(0, maxChars);
  // Try to find a sentence-ending boundary (., !, ?) within last 200 chars
  const sentenceEnd = truncated.search(/[.!?][^.!?]*$/);

  if (sentenceEnd > maxChars - 200) {
    return truncated.slice(0, sentenceEnd + 1).trim();
  }

  // Fallback: break at last space
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 0
    ? truncated.slice(0, lastSpace).trim() + "…"
    : truncated.trim() + "…";
}

/**
 * Find the best available SpeechSynthesisVoice matching keyword preferences.
 * Returns null if speech synthesis is unavailable or no voices are loaded.
 */
export function findBestVoice(
  profile: VoiceProfile,
): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const lowerKeywords = profile.preferredVoiceKeywords.map((k) =>
    k.toLowerCase(),
  );

  // Try keywords in order — first match wins
  for (const keyword of lowerKeywords) {
    const match = voices.find(
      (v) =>
        v.name.toLowerCase().includes(keyword) ||
        v.lang.toLowerCase().includes(keyword),
    );
    if (match) return match;
  }

  // Gender fallback: prefer English voices matching gender hint via common name patterns
  const genderHints: Record<VoiceProfile["gender"], string[]> = {
    male: ["male", "man", "daniel", "alex", "arthur", "rishi"],
    female: ["female", "woman", "samantha", "victoria", "karen", "veena"],
    neutral: [],
  };

  for (const hint of genderHints[profile.gender]) {
    const match = voices.find(
      (v) =>
        v.name.toLowerCase().includes(hint) &&
        (v.lang.startsWith("en") || v.lang.startsWith("hi")),
    );
    if (match) return match;
  }

  // Final fallback: first English voice
  return voices.find((v) => v.lang.startsWith("en")) ?? voices[0] ?? null;
}
