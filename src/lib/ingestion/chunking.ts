export type TextChunk = {
  chunkIndex: number;
  content: string;
  metadata: {
    charStart: number;
    charEnd: number;
  };
};

export type ChunkTextOptions = {
  chunkSize?: number;
  overlap?: number;
};

const DEFAULT_CHUNK_SIZE = 1200;
const DEFAULT_OVERLAP = 200;

function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function chunkText(text: string, options: ChunkTextOptions = {}) {
  const normalizedText = normalizeText(text);
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = options.overlap ?? DEFAULT_OVERLAP;

  if (chunkSize <= 0) {
    throw new Error("chunkSize must be greater than 0.");
  }

  if (overlap < 0 || overlap >= chunkSize) {
    throw new Error(
      "overlap must be greater than or equal to 0 and less than chunkSize.",
    );
  }

  if (!normalizedText) {
    return [] satisfies TextChunk[];
  }

  const chunks: TextChunk[] = [];
  let charStart = 0;

  while (charStart < normalizedText.length) {
    const hardEnd = Math.min(charStart + chunkSize, normalizedText.length);
    const window = normalizedText.slice(charStart, hardEnd);
    const lastParagraphBreak = window.lastIndexOf("\n\n");
    const lastSentenceBreak = Math.max(
      window.lastIndexOf(". "),
      window.lastIndexOf("? "),
      window.lastIndexOf("! "),
    );
    const breakPoint =
      hardEnd < normalizedText.length && lastParagraphBreak > chunkSize * 0.5
        ? lastParagraphBreak + 2
        : hardEnd < normalizedText.length && lastSentenceBreak > chunkSize * 0.5
          ? lastSentenceBreak + 2
          : window.length;
    const charEnd = Math.min(charStart + breakPoint, normalizedText.length);
    const content = normalizedText.slice(charStart, charEnd).trim();

    if (content) {
      chunks.push({
        chunkIndex: chunks.length,
        content,
        metadata: {
          charStart,
          charEnd,
        },
      });
    }

    if (charEnd >= normalizedText.length) {
      break;
    }

    charStart = Math.max(0, charEnd - overlap);
  }

  return chunks;
}
