import { z } from "zod";

import manifestJson from "../../../data/scriptures/source-manifest.json";

export const sourceManifestEntrySchema = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  canonicalTitle: z.string().min(1),
  tradition: z.string().min(1),
  edition: z.string().min(1),
  translator: z.string().min(1),
  language: z.string().min(1),
  rightsStatus: z.enum(["public_domain", "licensed", "restricted"]),
  license: z.string().min(1),
  attribution: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  ingestionDate: z.iso.date(),
  priority: z.number().int().min(1).max(10),
});

export const sourceManifestSchema = z
  .object({
    version: z.string().min(1),
    sources: z.array(sourceManifestEntrySchema).min(1),
  })
  .superRefine((manifest, context) => {
    for (const field of ["id", "slug", "canonicalTitle"] as const) {
      const seen = new Set<string>();
      for (const [index, source] of manifest.sources.entries()) {
        if (seen.has(source[field])) {
          context.addIssue({
            code: "custom",
            path: ["sources", index, field],
            message: `Duplicate source manifest ${field}: ${source[field]}`,
          });
        }
        seen.add(source[field]);
      }
    }
  });

export type SourceManifestEntry = z.infer<typeof sourceManifestEntrySchema>;

export const scriptureSourceManifest = sourceManifestSchema.parse(manifestJson);

const bySlug = new Map(
  scriptureSourceManifest.sources.map((entry) => [entry.slug, entry]),
);
const byTitle = new Map(
  scriptureSourceManifest.sources.map((entry) => [entry.canonicalTitle, entry]),
);

export function getManifestSource(input: { slug?: string; title?: string }) {
  const entry =
    (input.slug ? bySlug.get(input.slug) : undefined) ??
    (input.title ? byTitle.get(input.title) : undefined);
  if (!entry) {
    throw new Error(
      `Scripture source is missing from the manifest: ${input.slug ?? input.title ?? "unknown"}`,
    );
  }
  return entry;
}

export function isManifestSourceEligible(entry: SourceManifestEntry) {
  return (
    entry.rightsStatus === "public_domain" || entry.rightsStatus === "licensed"
  );
}
