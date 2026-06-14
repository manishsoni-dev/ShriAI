import { z } from "zod";

const approvedCopyrightStatuses = [
  "public_domain",
  "public-domain",
  "licensed",
  "fair_use",
] as const;

export const scriptureChunkSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  canonicalRef: z.string().min(1),
  chapter: z.number().int().positive(),
  verse: z.number().int().positive(),
  language: z.string().default("sanskrit"),
  originalText: z.string().min(1, "Original text is required"),
  transliteration: z.string().min(1, "Transliteration is required"),
  translation: z.string().min(1, "Translation is required"),
  commentary: z.string().min(1, "Project-authored commentary is required"),
  practicalNote: z.string().optional(),
  personaTags: z
    .array(z.string())
    .min(1, "At least one persona tag is required"),
  themeTags: z.array(z.string()).default([]),
  emotionTags: z.array(z.string()).default([]),
  answerUseCases: z.array(z.string()).default([]),
  sourcePriority: z.number().int().min(1).max(10).default(5),
  sourceUrl: z.string().url().optional(),
  sourceEdition: z.string().optional(),
  translator: z.string().optional(),
  license: z.string().optional(),
  copyrightStatus: z.enum(approvedCopyrightStatuses).default("public_domain"),
});

export const scriptureFileSchema = z.array(scriptureChunkSchema).min(1);

export type ScriptureChunkData = z.infer<typeof scriptureChunkSchema>;
