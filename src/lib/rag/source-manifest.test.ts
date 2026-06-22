import { describe, expect, it } from "vitest";

import {
  getManifestSource,
  isManifestSourceEligible,
  scriptureSourceManifest,
  sourceManifestEntrySchema,
} from "@/lib/rag/source-manifest";

describe("scripture source manifest", () => {
  it("records required provenance for every source", () => {
    expect(scriptureSourceManifest.sources.length).toBeGreaterThanOrEqual(2);
    for (const source of scriptureSourceManifest.sources) {
      expect(source.edition).toBeTruthy();
      expect(source.translator).toBeTruthy();
      expect(source.language).toBeTruthy();
      expect(source.license).toBeTruthy();
      expect(source.attribution).toBeTruthy();
      expect(source.ingestionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(isManifestSourceEligible(source)).toBe(true);
    }
  });

  it("rejects missing rights and attribution", () => {
    expect(
      sourceManifestEntrySchema.safeParse({
        id: "unknown",
        slug: "unknown",
        canonicalTitle: "Unknown",
        edition: "First",
        translator: "Unknown",
        language: "sanskrit",
        ingestionDate: "2026-06-22",
      }).success,
    ).toBe(false);
  });

  it("does not allow unmanifested sources", () => {
    expect(() => getManifestSource({ slug: "copyrighted-unknown" })).toThrow(
      "missing from the manifest",
    );
  });
});
