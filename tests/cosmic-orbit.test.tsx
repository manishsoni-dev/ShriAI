/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { CosmicOrbitEngine } from "../src/app/_components/CosmicOrbitEngine";
import {
  CELESTIAL_BODIES,
  CELESTIAL_REGISTRY,
} from "../src/lib/celestial-registry";
import fs from "fs";
import path from "path";

// Mock APIs
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

HTMLCanvasElement.prototype.getContext = () => {
  return {
    setTransform: () => {},
    clearRect: () => {},
    fillRect: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    ellipse: () => {},
    stroke: () => {},
    drawImage: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} }),
  } as any;
};

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe("CosmicOrbitEngine", () => {
  let requestAnimationFrameSpy: any;
  let cancelAnimationFrameSpy: any;

  beforeEach(() => {
    requestAnimationFrameSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb) => 123);
    cancelAnimationFrameSpy = vi.spyOn(window, "cancelAnimationFrame");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("schedules one animation frame on mount and cancels it on unmount", () => {
    const { unmount } = render(<CosmicOrbitEngine />);
    expect(requestAnimationFrameSpy).toHaveBeenCalled();
    unmount();
    expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(123);
  });

  it("has exactly nine orbiting bodies plus one sun", () => {
    const planets = CELESTIAL_REGISTRY.filter(
      (asset) => asset.classification === "planet",
    );
    const dwarf = CELESTIAL_REGISTRY.filter(
      (asset) => asset.classification === "dwarf-planet",
    );
    const star = CELESTIAL_REGISTRY.filter(
      (asset) => asset.classification === "star",
    );

    expect(planets.length).toBe(8);
    expect(dwarf.length).toBe(1);
    expect(star.length).toBe(1);

    const pluto = dwarf[0];
    expect(pluto.id).toBe("pluto");
    expect(CELESTIAL_BODIES).toHaveLength(9);
    expect(CELESTIAL_BODIES.at(-1)?.symbolicNote).toContain("symbolic ninth");
  });

  it("all declared local files exist", () => {
    for (const asset of CELESTIAL_REGISTRY) {
      const imgPath = path.join(process.cwd(), "public", asset.imageSrc);
      expect(fs.existsSync(imgPath)).toBe(true);
      expect(asset.credit).toBeDefined();
      expect(asset.sourcePage).toMatch(/^https:/);
      expect(asset.license).not.toBe("");
    }
  });

  it("uses low-power mode on small screens", () => {
    vi.stubGlobal("innerWidth", 600);
    const { container } = render(<CosmicOrbitEngine />);
    expect(container.querySelector("canvas")?.dataset.cosmicPower).toBe("low");
  });

  it("backdrop is pointer-inert and aria-hidden", () => {
    const { container } = render(<CosmicOrbitEngine />);
    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(canvas?.getAttribute("aria-hidden")).toBe("true");
    expect(canvas?.className).toContain("pointer-events-none");
  });
});
