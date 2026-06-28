export type SupportedLanguage = "en" | "hi";
export type SupportedLocale = "en-IN" | "hi-IN" | "auto";

export const defaultLocale: SupportedLocale = "en-IN";

/**
 * Heuristic to detect if text is predominantly Hindi.
 * Looks for Devanagari script characters.
 */
export function isDevanagari(text: string): boolean {
  // Unicode range for Devanagari is \u0900-\u097F
  const devanagariPattern = /[\u0900-\u097F]/;
  return devanagariPattern.test(text);
}

/**
 * Very basic heuristic to detect Hinglish (Hindi written in Latin script).
 * Real implementation would need an NLP classifier or dictionary approach,
 * but for this MVP we look for common Hinglish connector words.
 */
export function isHinglish(text: string): boolean {
  const normalized = text.toLowerCase();
  const hinglishWords = [
    " hai",
    " nahi",
    " kya",
    " kaise",
    " kyun",
    " aur",
    " lekin",
    " mujhe",
    " mera",
    " apna",
    " chahiye",
    " karte",
  ];
  return hinglishWords.some((word) => normalized.includes(word));
}

export function detectLanguage(
  text: string,
  userPreference: SupportedLocale = "auto",
): SupportedLanguage {
  if (userPreference === "hi-IN") return "hi";
  if (userPreference === "en-IN") return "en";

  // If auto, rely on heuristics
  if (isDevanagari(text) || isHinglish(text)) {
    return "hi";
  }

  return "en";
}

export function getLanguageName(lang: SupportedLanguage): string {
  return lang === "hi" ? "Hindi/Hinglish" : "English";
}
