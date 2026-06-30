/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { CosmicOrbitEngine } from "../src/app/_components/CosmicOrbitEngine";
import {
  CELESTIAL_BODIES,
  CELESTIAL_REGISTRY,
  REQUIRED_CELESTIAL_BODY_COUNT,
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
    save: () => {},
    restore: () => {},
    set globalAlpha(_value: number) {},
    set globalCompositeOperation(_value: string) {},
    set fillStyle(_value: string | CanvasGradient) {},
    set strokeStyle(_value: string | CanvasGradient) {},
    set lineWidth(_value: number) {},
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

  it("has exactly nine celestial bodies plus one sun", () => {
    const sun = CELESTIAL_REGISTRY.filter(
      (asset) => asset.visualRole === "central-sun",
    );
    const bodies = CELESTIAL_REGISTRY.filter(
      (asset) => asset.visualRole === "symbolic-celestial-body",
    );

    expect(sun.length).toBe(1);
    expect(bodies.length).toBe(REQUIRED_CELESTIAL_BODY_COUNT);
    expect(CELESTIAL_BODIES).toHaveLength(REQUIRED_CELESTIAL_BODY_COUNT);
    const pluto = CELESTIAL_BODIES.find((body) => body.id === "pluto");
    expect(
      pluto && "symbolicNote" in pluto ? pluto.symbolicNote : "",
    ).toContain("symbolic ninth celestial body");
  });

  it("all declared celestial asset files exist", () => {
    for (const asset of CELESTIAL_REGISTRY) {
      const imgPath = path.join(process.cwd(), "public", asset.imageSrc);
      expect(fs.existsSync(imgPath)).toBe(true);
      expect(asset.provenance.credit).toBeDefined();
      expect(asset.provenance.sourcePage).toMatch(/^https:/);
      expect(asset.provenance.license).not.toBe("");
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
    expect(canvas?.dataset.celestialBodyCount).toBe(
      String(REQUIRED_CELESTIAL_BODY_COUNT),
    );
  });

  it("renders stable reduced-motion state without scheduling animation", () => {
    render(<CosmicOrbitEngine reducedMotion />);
    expect(requestAnimationFrameSpy).not.toHaveBeenCalled();
  });

  it("renders paused state without scheduling animation", () => {
    const { container } = render(<CosmicOrbitEngine paused />);
    expect(requestAnimationFrameSpy).not.toHaveBeenCalled();
    expect(container.querySelector("canvas")?.dataset.cosmicMotion).toBe(
      "paused",
    );
  });
});
