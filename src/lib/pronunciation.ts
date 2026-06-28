export const pronunciationDictionary: Record<string, string> = {
  // Scripture & Concepts
  "Bhagavad Gita": "Bhagg-vud Ghee-tha",
  Mahabharata: "Ma-haa-bhaa-ra-tha",
  Upanishads: "Oo-pa-ni-shads",
  Dharma: "Dhur-ma",
  Karma: "Kur-ma",
  Samsara: "Sum-saa-ra",
  Moksha: "Mok-sha",
  Brahman: "Bruh-mun",
  Atman: "Aath-mun",
  Yoga: "Yo-ga",
  Bhakti: "Bhuk-tee",
  Jnana: "Gyaa-na",
  Jñāna: "Gyaa-na",
  Dhyana: "Dhyaa-na",
  Seva: "Say-va",
  श्री: "Shree",

  // Deities
  Krishna: "Krish-na",
  Rama: "Raa-ma",
  Shiva: "Shi-va",
  Vishnu: "Vish-nu",
  Hanuman: "Hu-nu-maan",
  Sita: "See-tha",
  Radha: "Raa-dha",
  Arjuna: "Ur-joo-na",

  // Greeting/Endings
  Namaste: "Nu-mus-tay",
  Pranam: "Pru-naam",
  Om: "Aum",
};

/**
 * Replaces known Sanskrit/philosophical terms with their phonetic equivalents for TTS.
 */
export function applyPronunciationDictionary(text: string): string {
  let processedText = text;

  for (const [word, pronunciation] of Object.entries(pronunciationDictionary)) {
    // Replace whole words only, case-insensitive, preserving surrounding punctuation
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    processedText = processedText.replace(regex, pronunciation);
  }

  return processedText;
}
