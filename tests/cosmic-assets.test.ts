import fs from "node:fs";
import path from "node:path";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { CELESTIAL_REGISTRY } from "../src/lib/celestial-registry";

describe("Cosmic Assets", () => {
  it("has WebP and AVIF files for every registry asset", () => {
    for (const asset of CELESTIAL_REGISTRY) {
      for (const source of [asset.sources.avif, asset.sources.webp]) {
        const filePath = path.join(process.cwd(), "public", source);
        expect(fs.existsSync(filePath), `${source} should exist`).toBe(true);
      }
    }
  });

  it("matches registry dimensions, alpha requirements, and file-size budgets", async () => {
    for (const asset of CELESTIAL_REGISTRY) {
      for (const [format, source] of Object.entries(asset.sources)) {
        const filePath = path.join(process.cwd(), "public", source);
        const metadata = await sharp(filePath).metadata();
        const stat = fs.statSync(filePath);

        expect(metadata.width, `${source} width`).toBe(asset.width);
        expect(metadata.height, `${source} height`).toBe(asset.height);
        expect(stat.size, `${source} byte size`).toBe(
          asset.fileSizeBytes[format as "avif" | "webp"],
        );
        expect(stat.size, `${source} should stay under budget`).toBeLessThan(
          350_000,
        );
        expect(Boolean(metadata.hasAlpha), `${source} alpha support`).toBe(
          asset.hasAlpha,
        );
      }
    }
  });

  it("keeps transparent assets free of opaque rectangular corners", async () => {
    for (const asset of CELESTIAL_REGISTRY) {
      if (!asset.requiresTransparency) continue;

      for (const source of [asset.sources.avif, asset.sources.webp]) {
        const { data, info } = await sharp(path.join("public", source))
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        const corners = [
          3,
          (info.width - 1) * info.channels + 3,
          info.width * (info.height - 1) * info.channels + 3,
          (info.width * info.height - 1) * info.channels + 3,
        ];

        for (const alphaOffset of corners) {
          expect(data[alphaOffset], `${source} corner alpha`).toBeLessThan(12);
        }
      }
    }
  });
});
