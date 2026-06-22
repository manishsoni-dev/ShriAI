import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { CELESTIAL_REGISTRY } from "../src/lib/celestial-registry";

describe("Cosmic Assets", () => {
  const assetsDir = path.join(process.cwd(), "public", "cosmic");

  it("uses the authoritative code registry", () => {
    expect(CELESTIAL_REGISTRY).toHaveLength(10);
    expect(
      CELESTIAL_REGISTRY.every((asset) =>
        asset.imageSrc.startsWith("/cosmic/"),
      ),
    ).toBe(true);
  });

  it("should contain all necessary local webp assets", () => {
    const requiredAssets = [
      "sun.webp",
      "mercury.webp",
      "venus.webp",
      "earth.webp",
      "mars.webp",
      "jupiter.webp",
      "saturn.webp",
      "uranus.webp",
      "neptune.webp",
      "pluto.webp",
    ];

    for (const file of requiredAssets) {
      const filePath = path.join(assetsDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });
});
