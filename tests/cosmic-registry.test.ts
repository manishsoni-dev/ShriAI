import { describe, it, expect } from "vitest";
import {
  CELESTIAL_BODIES,
  CELESTIAL_REGISTRY,
} from "../src/lib/celestial-registry";

describe("Celestial Registry", () => {
  it("should contain exactly 1 star and 9 orbiting worlds", () => {
    const star = CELESTIAL_REGISTRY.filter((b) => b.classification === "star");
    const planets = CELESTIAL_REGISTRY.filter(
      (b) => b.classification === "planet",
    );
    const dwarfPlanets = CELESTIAL_REGISTRY.filter(
      (b) => b.classification === "dwarf-planet",
    );

    expect(star.length).toBe(1);
    expect(planets.length).toBe(8);
    expect(dwarfPlanets.length).toBe(1);
    expect(CELESTIAL_REGISTRY.length).toBe(10);
  });

  it("should have Pluto labeled as a dwarf planet", () => {
    const pluto = CELESTIAL_REGISTRY.find((b) => b.id === "pluto");
    expect(pluto).toBeDefined();
    expect(pluto?.classification).toBe("dwarf-planet");
    expect(CELESTIAL_BODIES.at(-1)?.symbolicNote).toContain("symbolic ninth");
  });

  it("should have stable radii and image paths", () => {
    for (const body of CELESTIAL_BODIES) {
      expect(body.orbitRadiusFactor).toBeGreaterThanOrEqual(0);
      expect(body.orbitRadiusFactor).toBeLessThanOrEqual(1.05);
      expect(body.imageSrc).toMatch(/^\/cosmic\/[a-z]+\.webp$/);
    }
  });
});
