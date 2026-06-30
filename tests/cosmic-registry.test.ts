import { describe, expect, it } from "vitest";

import {
  CELESTIAL_BODIES,
  CELESTIAL_REGISTRY,
  REQUIRED_CELESTIAL_BODY_COUNT,
  SUN_ASSET,
} from "../src/lib/celestial-registry";

describe("Celestial Registry", () => {
  it("contains one central sun and exactly nine symbolic celestial bodies", () => {
    expect(SUN_ASSET.id).toBe("sun");
    expect(SUN_ASSET.visualRole).toBe("central-sun");
    expect(CELESTIAL_BODIES).toHaveLength(REQUIRED_CELESTIAL_BODY_COUNT);
    expect(CELESTIAL_REGISTRY).toHaveLength(REQUIRED_CELESTIAL_BODY_COUNT + 1);
  });

  it("keeps Pluto as the symbolic ninth celestial body", () => {
    const pluto = CELESTIAL_BODIES.find((body) => body.id === "pluto");

    expect(pluto?.id).toBe("pluto");
    expect(pluto?.astronomicalType).toBe("dwarf-planet");
    expect(
      pluto && "symbolicNote" in pluto ? pluto.symbolicNote : "",
    ).toContain("symbolic ninth celestial body");
  });

  it("requires complete asset, orbit, accessibility, and provenance metadata", () => {
    const seenIds = new Set<string>();

    for (const body of CELESTIAL_BODIES) {
      expect(body.id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(seenIds.has(body.id)).toBe(false);
      seenIds.add(body.id);

      expect(body.displayName).not.toHaveLength(0);
      expect(body.visualRole).toBe("symbolic-celestial-body");
      expect(body.sources.avif).toBe(`/cosmic/${body.id}.avif`);
      expect(body.sources.webp).toBe(`/cosmic/${body.id}.webp`);
      expect(body.imageSrc).toBe(body.sources.webp);
      expect(body.altBehavior).toBe("decorative");

      expect(body.orbitRadiusFactor).toBeGreaterThan(0);
      expect(body.orbitRadiusFactor).toBeLessThanOrEqual(1.05);
      expect(body.orbitDurationSeconds).toBeGreaterThan(0);
      expect(body.initialPhaseRadians).toBeGreaterThanOrEqual(0);
      expect(body.initialPhaseRadians).toBeLessThan(Math.PI * 2);
      expect(body.zIndexTier).toBeGreaterThan(0);
      expect(Number.isInteger(body.zIndexTier)).toBe(true);
      expect(body.displayRadiusFactor).toBeGreaterThan(0);
      expect(body.opacity).toBeGreaterThan(0);
      expect(body.opacity).toBeLessThanOrEqual(1);

      expect(body.provenance.referenceId).toBe(`cosmic-source-${body.id}`);
      expect(body.provenance.credit).not.toHaveLength(0);
      expect(body.provenance.sourcePage).toMatch(/^https:/);
      expect(body.provenance.license).not.toHaveLength(0);
      expect(body.provenance.usageRightsStatus).toBe(
        "source-linked-review-required",
      );
      expect(body.provenance.sourceOriginalStatus).toBe("not-retained-in-repo");
      expect(body.provenance.replacementRequirement).toContain(
        "Retain the original high-resolution source",
      );
    }
  });
});
