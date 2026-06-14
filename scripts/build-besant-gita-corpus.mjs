import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const TARGET_RECORDS = 300;
const OUTPUT_FILE = path.resolve(
  process.cwd(),
  "data/scriptures/bhagavad-gita/bhagavad-gita-besant-v1.json",
);
const SOURCE_BASE = "https://en.wikisource.org/wiki/Bhagavad-Gita_(Besant_4th)";

const DEVANAGARI_DIGITS = {
  "०": "0",
  "१": "1",
  "२": "2",
  "३": "3",
  "४": "4",
  "५": "5",
  "६": "6",
  "७": "7",
  "८": "8",
  "९": "9",
};

const VOWELS = {
  अ: "a",
  आ: "ā",
  इ: "i",
  ई: "ī",
  उ: "u",
  ऊ: "ū",
  ऋ: "ṛ",
  ॠ: "ṝ",
  ऌ: "ḷ",
  ए: "e",
  ऐ: "ai",
  ओ: "o",
  औ: "au",
};

const MATRAS = {
  "ा": "ā",
  "ि": "i",
  "ी": "ī",
  "ु": "u",
  "ू": "ū",
  "ृ": "ṛ",
  "ॄ": "ṝ",
  "ॢ": "ḷ",
  "े": "e",
  "ै": "ai",
  "ो": "o",
  "ौ": "au",
};

const CONSONANTS = {
  क: "k",
  ख: "kh",
  ग: "g",
  घ: "gh",
  ङ: "ṅ",
  च: "c",
  छ: "ch",
  ज: "j",
  झ: "jh",
  ञ: "ñ",
  ट: "ṭ",
  ठ: "ṭh",
  ड: "ḍ",
  ढ: "ḍh",
  ण: "ṇ",
  त: "t",
  थ: "th",
  द: "d",
  ध: "dh",
  न: "n",
  प: "p",
  फ: "ph",
  ब: "b",
  भ: "bh",
  म: "m",
  य: "y",
  र: "r",
  ल: "l",
  व: "v",
  श: "ś",
  ष: "ṣ",
  स: "s",
  ह: "h",
  ळ: "ḻ",
};

const SIGNS = {
  "ं": "ṃ",
  "ँ": "ṃ",
  "ः": "ḥ",
  ऽ: "'",
  "।": ".",
  "॥": "..",
  ॐ: "oṃ",
};

function decodeEntities(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(html) {
  return decodeEntities(
    html
      .replace(/<style[\s\S]*?<\/style>/g, "")
      .replace(/<script[\s\S]*?<\/script>/g, "")
      .replace(/<sup[\s\S]*?<\/sup>/g, "")
      .replace(/<[^>]+>/g, "\n"),
  )
    .replace(/\u200b/g, "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n");
}

function normalizeLine(line) {
  return line
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasDevanagari(line) {
  return /[\u0900-\u097F]/.test(line);
}

function devanagariNumberToArabic(value) {
  return Number(
    value
      .split("")
      .map((char) => DEVANAGARI_DIGITS[char] ?? char)
      .join(""),
  );
}

function extractVerseNumber(line) {
  const match = line.match(/॥\s*([०-९0-9]+)\s*॥/);
  return match ? devanagariNumberToArabic(match[1]) : null;
}

function transliterateDevanagari(text) {
  let output = "";

  for (let index = 0; index < text.length; index++) {
    const char = text[index];

    if (CONSONANTS[char]) {
      const next = text[index + 1];
      if (next === "्") {
        output += CONSONANTS[char];
        index++;
      } else if (MATRAS[next]) {
        output += CONSONANTS[char] + MATRAS[next];
        index++;
      } else {
        output += CONSONANTS[char] + "a";
      }
      continue;
    }

    output +=
      VOWELS[char] ??
      MATRAS[char] ??
      SIGNS[char] ??
      DEVANAGARI_DIGITS[char] ??
      char;
  }

  return output.replace(/\s+/g, " ").trim();
}

function chapterTheme(chapter) {
  const map = {
    1: ["confusion", "grief", "moral-conflict"],
    2: ["wisdom", "steadiness", "duty"],
    3: ["karma", "duty", "action"],
    4: ["wisdom", "discipline", "sacred-action"],
    5: ["renunciation", "detachment", "peace"],
    6: ["meditation", "self-mastery", "discipline"],
    7: ["devotion", "knowledge", "surrender"],
  };
  return map[chapter] ?? ["wisdom"];
}

function tagsForVerse(chapter, translation) {
  const lower = translation.toLowerCase();
  const themeTags = new Set(chapterTheme(chapter));
  const emotionTags = new Set();
  const answerUseCases = new Set();

  if (lower.includes("fear") || lower.includes("faint")) {
    emotionTags.add("fear-of-failure");
    answerUseCases.add("courage under pressure");
  }
  if (
    lower.includes("grief") ||
    lower.includes("sorrow") ||
    lower.includes("weep")
  ) {
    emotionTags.add("grief");
    answerUseCases.add("dealing with grief");
  }
  if (lower.includes("duty") || lower.includes("righteous")) {
    themeTags.add("duty");
    answerUseCases.add("understanding duty");
  }
  if (lower.includes("action") || lower.includes("work")) {
    themeTags.add("karma");
    answerUseCases.add("acting without attachment");
  }
  if (lower.includes("desire") || lower.includes("attachment")) {
    themeTags.add("detachment");
    emotionTags.add("attachment");
    answerUseCases.add("becoming less attached");
  }
  if (lower.includes("anger")) {
    emotionTags.add("anger");
    answerUseCases.add("controlling anger");
  }
  if (lower.includes("mind") || lower.includes("self")) {
    themeTags.add("self-mastery");
    answerUseCases.add("steadying the mind");
  }
  if (lower.includes("devotion") || /\b(me|lord)\b/.test(lower)) {
    themeTags.add("bhakti");
    answerUseCases.add("devotional trust");
  }

  if (emotionTags.size === 0) emotionTags.add("confusion");
  if (answerUseCases.size === 0) answerUseCases.add("daily discernment");

  return {
    themeTags: Array.from(themeTags),
    emotionTags: Array.from(emotionTags),
    answerUseCases: Array.from(answerUseCases),
  };
}

const CURATION_OVERLAY = {
  1.28: {
    themeTags: ["moral-conflict", "grief"],
    answerUseCases: [
      "deciding when family duty conflicts with moral duty",
      "recognizing grief inside moral conflict",
    ],
  },
  2.7: {
    themeTags: ["confusion", "wisdom", "moral-conflict"],
    answerUseCases: [
      "seeking guidance in spiritual confusion",
      "deciding when family duty conflicts with moral duty",
    ],
  },
  2.11: {
    themeTags: ["grief", "wisdom"],
    answerUseCases: [
      "remembering wisdom when grief overwhelms",
      "not grieving for the living or the dead",
    ],
  },
  2.13: {
    themeTags: ["grief", "wisdom"],
    answerUseCases: [
      "remembering the soul during grief",
      "seeing change through the continuity of the self",
    ],
  },
  2.14: {
    themeTags: ["steadiness", "self-mastery"],
    answerUseCases: [
      "enduring external contact and discomfort",
      "staying steady in pleasure and pain",
    ],
  },
  2.15: {
    themeTags: ["steadiness", "self-mastery"],
    answerUseCases: [
      "staying steady in pleasure and pain",
      "enduring pleasure and pain without being tormented",
    ],
  },
  "2.30": {
    themeTags: ["grief", "wisdom"],
    answerUseCases: [
      "remembering the indwelling self when grief overwhelms",
      "meeting grief through the deathless self",
    ],
  },
  2.31: {
    themeTags: ["duty", "moral-conflict"],
    answerUseCases: [
      "understanding duty in moral conflict",
      "working with attachment to one's own role",
    ],
  },
  "2.40": {
    themeTags: ["discipline", "karma"],
    answerUseCases: [
      "trusting that effort on the path is never wasted",
      "continuing disciplined practice without fear of loss",
    ],
  },
  2.52: {
    themeTags: ["confusion", "wisdom"],
    answerUseCases: [
      "moving beyond delusion",
      "crossing spiritual confusion through wisdom",
    ],
  },
  2.58: {
    themeTags: ["self-mastery", "steadiness"],
    answerUseCases: [
      "restraining restless senses",
      "withdrawing the senses like a tortoise",
    ],
  },
  "2.60": {
    themeTags: ["self-mastery", "steadiness"],
    answerUseCases: [
      "restraining restless senses",
      "understanding why senses carry away the mind",
    ],
  },
  2.61: {
    themeTags: ["self-mastery", "steadiness"],
    answerUseCases: [
      "restraining restless senses",
      "establishing wisdom through sense restraint",
    ],
  },
  2.62: {
    themeTags: ["self-mastery", "detachment"],
    answerUseCases: [
      "controlling anger at its source",
      "understanding the danger of chasing sense objects",
    ],
  },
  2.63: {
    themeTags: ["self-mastery", "detachment", "confusion"],
    answerUseCases: [
      "controlling anger before it becomes delusion",
      "understanding how anger causes spiritual confusion",
    ],
  },
  2.67: {
    themeTags: ["self-mastery", "detachment"],
    answerUseCases: [
      "understanding the danger of chasing sense objects",
      "guarding the mind from sense currents",
    ],
  },
  3.6: {
    themeTags: ["discipline", "self-mastery"],
    answerUseCases: ["avoiding hypocrisy in spiritual practice"],
  },
  3.7: {
    themeTags: ["discipline", "self-mastery"],
    answerUseCases: [
      "avoiding hypocrisy in spiritual practice",
      "integrating inner restraint with outward action",
    ],
  },
  3.9: {
    themeTags: ["sacred-action", "karma", "detachment"],
    answerUseCases: [
      "relating sacrifice to daily life",
      "turning work into sacred action",
    ],
  },
  "3.10": {
    themeTags: ["sacred-action", "karma"],
    answerUseCases: [
      "relating sacrifice to daily life",
      "understanding sacrifice as a life pattern",
    ],
  },
  3.13: {
    themeTags: ["sacred-action", "karma"],
    answerUseCases: [
      "relating sacrifice to daily life",
      "living from offered action rather than selfish consumption",
    ],
  },
  3.27: {
    themeTags: ["knowledge", "self-mastery"],
    answerUseCases: [
      "understanding the gunas",
      "seeing how the qualities of nature act",
    ],
  },
  3.39: {
    themeTags: ["self-mastery", "confusion"],
    answerUseCases: [
      "controlling anger and desire",
      "understanding what causes spiritual confusion",
    ],
  },
  4.1: {
    themeTags: ["wisdom", "knowledge"],
    answerUseCases: [
      "understanding how knowledge is preserved",
      "remembering the lineage of wisdom",
    ],
  },
  4.2: {
    themeTags: ["wisdom", "knowledge"],
    answerUseCases: [
      "understanding how knowledge is preserved and restored",
      "honoring the transmitted wisdom tradition",
    ],
  },
  4.7: {
    themeTags: ["devotion", "duty", "sacred-action"],
    answerUseCases: [
      "understanding when Krishna manifests",
      "remembering divine manifestation when dharma declines",
    ],
  },
  4.8: {
    themeTags: ["devotion", "duty", "sacred-action"],
    answerUseCases: [
      "understanding why Krishna manifests",
      "remembering divine manifestation when righteousness needs restoring",
    ],
  },
  5.7: {
    themeTags: ["detachment", "self-mastery", "karma"],
    answerUseCases: [
      "acting while remaining unstained",
      "acting without being inwardly affected",
    ],
  },
  5.22: {
    themeTags: ["steadiness", "detachment"],
    answerUseCases: [
      "enduring external contact and discomfort",
      "not depending on contact-born pleasures",
    ],
  },
  "5.10": {
    themeTags: ["detachment", "renunciation", "karma"],
    answerUseCases: [
      "acting while remaining unstained",
      "placing action in the Eternal like a lotus leaf",
    ],
  },
  5.11: {
    themeTags: ["detachment", "self-mastery", "karma"],
    answerUseCases: [
      "acting while remaining unstained",
      "purifying the self through unattached action",
    ],
  },
  5.18: {
    themeTags: ["wisdom", "equality", "all-beings"],
    answerUseCases: [
      "seeing all beings with equal vision",
      "honoring the same dignity across beings",
    ],
  },
  5.19: {
    themeTags: ["wisdom", "equality", "steadiness"],
    answerUseCases: [
      "seeing all beings with equal vision",
      "remaining balanced in equal regard",
    ],
  },
  6.29: {
    themeTags: ["wisdom", "meditation", "all-beings"],
    answerUseCases: [
      "seeing the self in all beings",
      "seeing all beings in the Self",
    ],
  },
  "6.40": {
    themeTags: ["discipline", "meditation"],
    answerUseCases: [
      "trusting that effort on the path is never wasted",
      "continuing spiritual effort without despair",
    ],
  },
  6.41: {
    themeTags: ["discipline", "meditation"],
    answerUseCases: [
      "trusting that effort on the path is never wasted",
      "understanding the future of sincere spiritual effort",
    ],
  },
  6.46: {
    themeTags: ["meditation", "devotion"],
    answerUseCases: [
      "understanding who is the highest yogi",
      "comparing yoga with asceticism and knowledge",
    ],
  },
  6.47: {
    themeTags: ["meditation", "devotion", "bhakti"],
    answerUseCases: [
      "understanding who is the highest yogi",
      "seeing devotion as the heart of yoga",
    ],
  },
  7.4: {
    themeTags: ["knowledge", "devotion"],
    answerUseCases: [
      "understanding divine nature",
      "learning Krishna's lower nature",
    ],
  },
  7.5: {
    themeTags: ["knowledge", "devotion"],
    answerUseCases: [
      "understanding divine nature",
      "learning Krishna's higher nature",
    ],
  },
  7.7: {
    themeTags: ["knowledge", "devotion"],
    answerUseCases: [
      "understanding divine nature",
      "seeing Krishna as the thread through the world",
    ],
  },
  7.12: {
    themeTags: ["knowledge", "self-mastery"],
    answerUseCases: [
      "understanding the gunas",
      "seeing the qualities as dependent on Krishna",
    ],
  },
  7.13: {
    themeTags: ["knowledge", "self-mastery"],
    answerUseCases: [
      "understanding the gunas",
      "moving beyond delusion caused by the gunas",
    ],
  },
  7.14: {
    themeTags: ["wisdom", "devotion"],
    answerUseCases: [
      "moving beyond delusion",
      "crossing divine illusion through refuge",
    ],
  },
  7.15: {
    themeTags: ["wisdom", "devotion"],
    answerUseCases: [
      "moving beyond delusion",
      "recognizing what keeps people from turning toward Krishna",
    ],
  },
};

function applyCurationOverlay(record, tags) {
  const overlay = CURATION_OVERLAY[record.canonicalRef];
  if (!overlay) return tags;

  return {
    themeTags: Array.from(new Set([...tags.themeTags, ...overlay.themeTags])),
    emotionTags: tags.emotionTags,
    answerUseCases: Array.from(
      new Set([...tags.answerUseCases, ...overlay.answerUseCases]),
    ),
  };
}

function commentaryFor(record, tags) {
  const theme = tags.themeTags[0] ?? "wisdom";
  return `This verse is indexed for ${theme} because it gives practical spiritual direction through Krishna's teaching to Arjuna. In Shri AI, it should ground concise guidance rather than be treated as a complete standalone doctrine.`;
}

function practicalNoteFor(record, tags) {
  const useCase = tags.answerUseCases[0] ?? "daily discernment";
  return `Use this when a seeker asks about ${useCase}; keep the response brief, cite ${record.canonicalRef}, and avoid stretching beyond the verse.`;
}

async function fetchRenderedDiscourse(chapter) {
  const page = `Bhagavad-Gita_(Besant_4th)/Discourse_${chapter}`;
  const url = new URL("https://en.wikisource.org/w/api.php");
  url.searchParams.set("action", "parse");
  url.searchParams.set("format", "json");
  url.searchParams.set("prop", "text");
  url.searchParams.set("page", page);
  url.searchParams.set("origin", "*");

  let response;
  for (let attempt = 1; attempt <= 4; attempt++) {
    response = await fetch(url, {
      headers: { "User-Agent": "ShriAI corpus builder" },
    });

    if (response.ok) break;

    if (response.status !== 429 || attempt === 4) {
      throw new Error(`Failed to fetch ${page}: ${response.status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
  }

  const json = await response.json();
  return stripHtml(json.parse.text["*"]);
}

function extractChapterRecords(chapter, text) {
  const lines = text.split(/\n+/).map(normalizeLine).filter(Boolean);
  const records = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!hasDevanagari(line) || /उवाच\s*।$/.test(line)) continue;

    const originalLines = [line];
    let verse = extractVerseNumber(line);

    while (
      !verse &&
      index + 1 < lines.length &&
      hasDevanagari(lines[index + 1])
    ) {
      index++;
      originalLines.push(lines[index]);
      verse = extractVerseNumber(lines[index]);
    }

    if (!verse) continue;

    const translationLines = [];
    let cursor = index + 1;
    while (cursor < lines.length) {
      const next = lines[cursor];
      if (next === `(${verse})`) break;
      if (hasDevanagari(next)) break;
      if (!/^\(\d+\)$/.test(next) && !/^Discourse \d+$/.test(next)) {
        translationLines.push(next);
      }
      cursor++;
    }

    const translation = translationLines.join(" ").replace(/\s+/g, " ").trim();

    if (!translation) continue;

    const canonicalRef = `${chapter}.${verse}`;
    const baseRecord = {
      id: `bhagavad-gita-${canonicalRef.replace(".", "-")}`,
      source: "Bhagavad Gita",
      canonicalRef,
      chapter,
      verse,
      language: "sanskrit",
      originalText: originalLines.join("\n"),
      transliteration: transliterateDevanagari(originalLines.join(" ")),
      translation,
      personaTags: ["krishna"],
      sourcePriority: 10,
      sourceUrl: `${SOURCE_BASE}/Discourse_${chapter}`,
      sourceEdition: "Annie Besant 4th edition, 1922",
      translator: "Annie Wood Besant",
      license: "Public domain source text via Wikisource",
      copyrightStatus: "public_domain",
    };
    const tags = applyCurationOverlay(
      baseRecord,
      tagsForVerse(chapter, translation),
    );

    records.push({
      ...baseRecord,
      commentary: commentaryFor(baseRecord, tags),
      practicalNote: practicalNoteFor(baseRecord, tags),
      ...tags,
    });

    index = Math.max(index, cursor);
  }

  return records.sort((a, b) => a.verse - b.verse);
}

async function main() {
  const allRecords = [];

  for (
    let chapter = 1;
    chapter <= 18 && allRecords.length < TARGET_RECORDS;
    chapter++
  ) {
    const text = await fetchRenderedDiscourse(chapter);
    const records = extractChapterRecords(chapter, text);
    allRecords.push(...records);
    console.log(`Chapter ${chapter}: ${records.length} records`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const selected = allRecords.slice(0, TARGET_RECORDS);
  if (selected.length !== TARGET_RECORDS) {
    throw new Error(
      `Expected ${TARGET_RECORDS} records, found ${selected.length}`,
    );
  }

  await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, `${JSON.stringify(selected, null, 2)}\n`);
  console.log(`Wrote ${selected.length} records to ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
