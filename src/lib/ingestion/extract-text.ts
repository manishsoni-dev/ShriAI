import "server-only";

import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

type ExtractTextInput = {
  bytes: Uint8Array;
  contentType: string;
  filename: string;
};

function hasExtension(filename: string, extensions: string[]) {
  const lowerName = filename.toLowerCase();

  return extensions.some((extension) => lowerName.endsWith(extension));
}

export async function extractTextFromDocument(input: ExtractTextInput) {
  const buffer = Buffer.from(input.bytes);

  if (
    input.contentType.startsWith("text/") ||
    hasExtension(input.filename, [".txt", ".md", ".markdown"])
  ) {
    return new TextDecoder().decode(input.bytes);
  }

  if (
    input.contentType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    hasExtension(input.filename, [".docx"])
  ) {
    const result = await mammoth.extractRawText({
      buffer,
    });

    return result.value;
  }

  if (
    input.contentType === "application/pdf" ||
    hasExtension(input.filename, [".pdf"])
  ) {
    const parser = new PDFParse({
      data: buffer,
    });
    const result = await parser.getText();
    await parser.destroy();

    return result.text;
  }

  throw new Error("Unsupported document type.");
}
