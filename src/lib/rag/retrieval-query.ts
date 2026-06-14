const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "against",
  "also",
  "and",
  "are",
  "become",
  "being",
  "can",
  "could",
  "deal",
  "does",
  "for",
  "from",
  "have",
  "how",
  "into",
  "less",
  "more",
  "should",
  "than",
  "that",
  "the",
  "their",
  "then",
  "there",
  "this",
  "through",
  "when",
  "where",
  "which",
  "while",
  "who",
  "why",
  "with",
  "without",
  "what",
]);

const THEME_EXPANSIONS: Record<string, string[]> = {
  action: ["act", "action", "perform", "work", "deed", "doing"],
  bhakti: ["devotion", "devotee", "krishna", "love", "worship"],
  confusion: ["confusion", "delusion", "doubt", "bewildered", "uncertain"],
  courage: ["courage", "weakness", "faint", "heartedness", "stand", "fear"],
  detachment: [
    "attachment",
    "attached",
    "detachment",
    "fruit",
    "fruits",
    "outcome",
    "success",
    "failure",
  ],
  devotion: ["devotion", "devotee", "krishna", "manifest", "divine"],
  discipline: ["discipline", "practice", "regulated", "moderation", "restrain"],
  doubt: ["doubt", "faith", "knowledge", "wisdom", "uncertain"],
  duty: ["duty", "business", "role", "work", "obligation", "action"],
  grief: ["grief", "sorrow", "death", "soul", "overwhelm", "mourn"],
  karma: ["karma", "action", "work", "perform", "duty", "fruit"],
  knowledge: ["knowledge", "know", "nature", "wisdom", "understand"],
  meditation: ["meditation", "mind", "yoga", "tranquillity", "restless"],
  "moral-conflict": ["conflict", "duty", "family", "moral", "discernment"],
  peace: ["peace", "tranquillity", "happiness", "rest", "calm"],
  renunciation: ["renunciation", "renounce", "ascetic", "attachment"],
  "sacred-action": ["sacrifice", "sacred", "offering", "action", "yajna"],
  "self-mastery": [
    "anger",
    "desire",
    "mind",
    "sense",
    "senses",
    "restrain",
    "control",
    "restless",
  ],
  steadiness: [
    "steady",
    "steadfast",
    "equilibrium",
    "balanced",
    "pleasure",
    "pain",
    "success",
    "failure",
  ],
  wisdom: ["wisdom", "knowledge", "wise", "soul", "teacher", "discernment"],
};

const QUERY_EXPANSIONS: Record<string, string[]> = {
  anger: ["delusion", "desire", "wrath"],
  anxious: ["fruit", "fruits", "success", "failure"],
  anxiety: ["fruit", "fruits", "success", "failure"],
  attached: ["attachment", "fruit", "fruits"],
  attachment: ["attached", "fruit", "fruits"],
  balanced: ["equilibrium", "success", "failure"],
  death: ["soul", "body", "slay", "slain"],
  desire: ["lust", "craving", "wrath", "sense"],
  duty: ["action", "work", "business"],
  failure: ["fruit", "fruits", "success", "action"],
  fear: ["weakness", "faint", "heartedness", "stand"],
  grief: ["sorrow", "mourn", "soul"],
  leader: ["example", "standard", "people"],
  leaders: ["example", "standard", "people"],
  mind: ["restless", "control", "restrain"],
  moderation: ["regulated", "sleep", "eating", "waking"],
  outcomes: ["fruit", "fruits", "success", "failure"],
  result: ["fruit", "fruits", "success", "failure"],
  results: ["fruit", "fruits", "success", "failure"],
  restless: ["mind", "practice", "dispassion"],
  sacrifice: ["yajna", "offering", "sacred"],
  senses: ["sense", "objects", "restrain"],
  unsure: ["doubt", "uncertain", "faith"],
};

export type ScriptureKeywordQuery = {
  tsQuery: string;
  searchText: string;
  terms: string[];
  themes: string[];
};

export function buildScriptureKeywordQuery(
  query: string,
  themes: string[] = [],
): ScriptureKeywordQuery {
  const themeTerms = normalizeThemeNames(themes);
  const terms = new Set<string>();

  for (const token of tokenize(query)) {
    if (!STOP_WORDS.has(token)) {
      terms.add(token);
    }
    for (const expanded of QUERY_EXPANSIONS[token] ?? []) {
      terms.add(expanded);
    }
  }

  for (const theme of themeTerms) {
    for (const token of tokenize(theme)) {
      terms.add(token);
    }
    for (const expanded of THEME_EXPANSIONS[theme] ?? []) {
      terms.add(expanded);
    }
  }

  const limitedTerms = Array.from(terms).filter(Boolean).slice(0, 36);
  return {
    tsQuery: toPrefixOrTsQuery(limitedTerms),
    searchText: limitedTerms.join(" "),
    terms: limitedTerms,
    themes: themeTerms,
  };
}

export function normalizeTags(tags: string[] = []) {
  return Array.from(
    new Set(
      tags
        .flatMap((tag) => tokenize(tag))
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function normalizeThemeNames(themes: string[] = []) {
  return Array.from(
    new Set(
      themes
        .map((theme) => theme.trim().toLowerCase())
        .map((theme) => theme.replace(/[^a-z0-9-]+/g, "-"))
        .map((theme) => theme.replace(/^-+|-+$/g, ""))
        .filter(Boolean),
    ),
  );
}

function tokenize(text: string) {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .match(/[a-z0-9]+/g) ?? []
  );
}

function toPrefixOrTsQuery(terms: string[]) {
  const safeTerms = terms
    .filter((term) => /^[a-z0-9]+$/.test(term))
    .map((term) => `${term}:*`);

  return safeTerms.length > 0 ? safeTerms.join(" | ") : "scripture:*";
}
