"use client";

import { useEffect, useRef, useState } from "react";

import {
  CELESTIAL_BODIES,
  REQUIRED_CELESTIAL_BODY_COUNT,
  SUN_ASSET,
  type CelestialAsset,
} from "@/lib/celestial-registry";

const BODIES = CELESTIAL_BODIES;
const TAU = Math.PI * 2;
const AVIF_TEST_IMAGE =
  "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZgAAAPBtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAAHmlsb2MAAAAABEAAAQABAAAAAAABAAAAFwAAABQAAABKaWluZgAAAAAAAwAAABppbmZlAgAAAAABAABhdjAxAAAAAAAUaW5mZQIAAAAAAgAAaXZhcwAAAAAAFGluZmUCAAAAAAMAAHBpeGkAAAAAAABCaXBycAAAABRpcGNvAAAAEGlzcGUAAAAAAAAAAQAAAAEAAAAQcGl4aQAAAAADCAgIAAAAF2F2MUMBAA0ACggYAAYICGgAAABQaXBtYQAAAAAAAAEAAQGDBAAAABttZGF0EgAKBzgABogQEAwgMg8f8D///8WfhwB8+ErK";

type Star = {
  x: number;
  y: number;
  size: number;
  alpha: number;
  twinkle: number;
  tint: string;
};

const STAR_FIELD: Star[] = Array.from({ length: 115 }, (_, index) => {
  const seed = index + 1;
  const tint =
    seed % 7 === 0 ? "#ffdca8" : seed % 5 === 0 ? "#b9d8ff" : "#fff8e8";

  return {
    x: fract(Math.sin(seed * 12.9898) * 43758.5453),
    y: fract(Math.sin(seed * 78.233) * 24634.6345),
    size: 0.35 + fract(Math.sin(seed * 31.415) * 124.532) * 1.15,
    alpha: 0.22 + fract(Math.sin(seed * 17.17) * 97.11) * 0.56,
    twinkle: 0.35 + fract(Math.sin(seed * 7.77) * 74.31) * 0.8,
    tint,
  };
});

function fract(value: number) {
  return value - Math.floor(value);
}

const assetCache = new Map<string, HTMLImageElement | ImageBitmap>();
let loadingPromise: Promise<boolean> | null = null; // Returns true if all passed
let avifSupportPromise: Promise<boolean> | null = null;

function supportsAvif() {
  if (avifSupportPromise) return avifSupportPromise;

  avifSupportPromise = new Promise<boolean>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.width === 1 && image.height === 1);
    image.onerror = () => resolve(false);
    image.src = AVIF_TEST_IMAGE;
  });

  return avifSupportPromise;
}

async function loadAsset(asset: CelestialAsset, prefersAvif: boolean) {
  if (assetCache.has(asset.id)) return true;

  const sources = prefersAvif
    ? [asset.sources.avif, asset.sources.webp]
    : [asset.sources.webp];

  for (const source of sources) {
    try {
      const res = await fetch(source);
      if (!res.ok) throw new Error("Failed to fetch");
      const blob = await res.blob();
      const bmp = await createImageBitmap(blob);
      if (bmp.width <= 1 || bmp.height <= 1) {
        throw new Error("Invalid asset dimensions");
      }
      assetCache.set(asset.id, bmp);
      return true;
    } catch {
      const loaded = await new Promise<boolean>((resolve) => {
        const img = new Image();
        img.src = source;
        img.onload = () => {
          if (img.width > 1 && img.height > 1) {
            assetCache.set(asset.id, img);
            resolve(true);
            return;
          }
          resolve(false);
        };
        img.onerror = () => resolve(false);
      });

      if (loaded) return true;
    }
  }

  return false;
}

async function preloadAssets() {
  if (loadingPromise) return loadingPromise;

  loadingPromise = supportsAvif().then(async (prefersAvif) => {
    const results = await Promise.all(
      [SUN_ASSET, ...BODIES].map((asset) => loadAsset(asset, prefersAvif)),
    );
    return results.every(Boolean);
  });

  return loadingPromise;
}

const TARGET_FRAME_MS = 1000 / 30;
const LOW_POWER_FRAME_MS = 1000 / 15;
const MAX_DPR = 1.5;

function shouldUseLowPowerMode() {
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;
  return (
    window.innerWidth < 768 ||
    navigator.hardwareConcurrency <= 4 ||
    (deviceMemory !== undefined && deviceMemory <= 4)
  );
}

export type CosmicOrbitEngineProps = {
  className?: string;
  opacity?: number;
  centerXRatio?: number;
  centerYRatio?: number;
  showTrails?: boolean;
  paused?: boolean;
  reducedMotion?: boolean;
  reducedMotionFrameTime?: number;
};

export function CosmicOrbitEngine({
  className = "pointer-events-none fixed inset-0 h-full w-full",
  opacity = 0.64,
  centerXRatio = 0.5,
  centerYRatio = 0.35,
  showTrails = true,
  paused = false,
  reducedMotion,
  reducedMotionFrameTime = 18,
}: CosmicOrbitEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Diagnostic state
  const [isDebug, setIsDebug] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "degraded">(
    "loading",
  );
  const [stats, setStats] = useState({
    fps: 0,
    width: 0,
    height: 0,
    dpr: 1,
    entities: BODIES.length + 1,
    loadedAssets: 0,
  });

  useEffect(() => {
    // Check for diagnostic mode
    if (
      typeof window !== "undefined" &&
      window.location.search.includes("cosmicDebug=1")
    ) {
      const timer = setTimeout(() => setIsDebug(true), 0);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasElement = canvas;

    const prefersReduced =
      reducedMotion ??
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motionDisabled = prefersReduced || paused;
    const lowPower = shouldUseLowPowerMode();
    const targetFrameMs = lowPower ? LOW_POWER_FRAME_MS : TARGET_FRAME_MS;
    const trailsEnabled = showTrails && !lowPower && !motionDisabled;
    canvasElement.dataset.cosmicPower = lowPower ? "low" : "standard";
    canvasElement.dataset.cosmicMotion = prefersReduced
      ? "reduced"
      : paused
        ? "paused"
        : "running";
    canvasElement.dataset.celestialBodyCount = String(
      REQUIRED_CELESTIAL_BODY_COUNT,
    );

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const context = ctx;

    let animationId: number | null = null;
    let startTime: number | null = null;
    let lastFrameTime = 0;
    let width = 0;
    let height = 0;
    let currentDpr = 1;

    let fpsFrames = 0;
    let fpsLastTime = performance.now();

    let disposed = false;
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const loadAssets = () => {
      void preloadAssets()
        .then((allSuccess) => {
          if (!disposed) setStatus(allSuccess ? "ready" : "degraded");
        })
        .catch(() => {
          if (!disposed) setStatus("degraded");
        });
    };
    const idleHandle = idleWindow.requestIdleCallback?.(loadAssets);
    const loadTimer = window.setTimeout(loadAssets, 250);

    function resize() {
      const rect = canvasElement.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.floor(rect.width));
      const nextHeight = Math.max(1, Math.floor(rect.height));
      const dpr = lowPower
        ? 1
        : Math.min(window.devicePixelRatio || 1, MAX_DPR);

      width = nextWidth;
      height = nextHeight;
      currentDpr = dpr;

      canvasElement.width = Math.floor(nextWidth * dpr);
      canvasElement.height = Math.floor(nextHeight * dpr);

      if (motionDisabled) {
        render(reducedMotionFrameTime * 1000);
      }
    }

    function schedule() {
      if (document.visibilityState === "hidden") return;
      if (animationId === null) {
        animationId = requestAnimationFrame(render);
      }
    }

    function cancel() {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    }

    function render(timestamp: number) {
      animationId = null;
      if (!width || !height) return;

      if (!motionDisabled && timestamp - lastFrameTime < targetFrameMs) {
        schedule();
        return;
      }

      lastFrameTime = timestamp;
      if (startTime === null) startTime = timestamp;
      let elapsed = (timestamp - startTime) / 1000;
      if (motionDisabled) {
        elapsed = reducedMotionFrameTime;
      }

      // FPS tracking for debug
      fpsFrames++;
      if (timestamp - fpsLastTime >= 1000) {
        if (isDebug) {
          setStats((prev) => ({
            ...prev,
            fps: fpsFrames,
            width,
            height,
            dpr: currentDpr,
            loadedAssets: assetCache.size,
          }));
        }
        fpsFrames = 0;
        fpsLastTime = timestamp;
      }

      const cx = width * centerXRatio;
      const cy = height * centerYRatio;
      const scale = Math.min(width, height) * 0.9;

      const maxOrbitRadius = Math.min(width * 0.42, height * 0.42, 520);

      // Restore baseline state
      context.save();
      context.setTransform(currentDpr, 0, 0, currentDpr, 0, 0);
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      context.clearRect(0, 0, width, height);
      canvasElement.dataset.cosmicCenterX = centerXRatio.toFixed(2);
      canvasElement.dataset.cosmicCenterY = centerYRatio.toFixed(2);

      // Draw Stars
      for (const star of STAR_FIELD) {
        const drift = elapsed * 0.0018 * (1 + star.size);
        const x = ((star.x + drift) % 1) * width;
        const y = ((star.y + drift * 0.28) % 1) * height;
        const twinkle = prefersReduced
          ? 1
          : 0.72 + Math.sin(elapsed * star.twinkle + star.x * 12) * 0.28;

        context.globalAlpha = star.alpha * twinkle * opacity;
        context.fillStyle = star.tint;
        context.beginPath();
        context.arc(x, y, star.size, 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = opacity;

      // Calculate positions
      const renderedBodies = BODIES.map((body) => {
        const angle =
          body.initialPhaseRadians +
          elapsed * (TAU / body.orbitDurationSeconds);
        const aX = body.orbitRadiusFactor * maxOrbitRadius;
        const aY = body.orbitRadiusFactor * maxOrbitRadius * 0.44; // Squashed ellipse

        const bx = cx + Math.cos(angle) * aX;
        const by =
          cy +
          Math.sin(angle) * aY +
          Math.sin(angle) * body.inclination * scale;

        const radius = Math.max(4, scale * body.displayRadiusFactor);

        return {
          body,
          depth: Math.sin(angle), // 1 is front, -1 is back
          angle,
          radius,
          x: bx,
          y: by,
          aX,
          aY,
        };
      });

      // Split into back and front
      const backBodies = renderedBodies
        .filter((b) => b.depth <= 0)
        .sort((a, b) => a.depth - b.depth);
      const frontBodies = renderedBodies
        .filter((b) => b.depth > 0)
        .sort((a, b) => a.depth - b.depth);

      function drawTrails(bodies: typeof renderedBodies, opacityMult: number) {
        if (!trailsEnabled) return;
        context.lineWidth = 0.65;
        for (const b of bodies) {
          context.strokeStyle = `rgba(201, 220, 255, ${0.04 * opacityMult * opacity})`;
          context.beginPath();
          context.ellipse(
            cx,
            cy + Math.sin(b.angle) * b.body.inclination * scale * 0.5,
            b.aX,
            b.aY,
            0,
            0,
            Math.PI * 2,
          );
          context.stroke();
        }
      }

      function drawPlanet(b: (typeof renderedBodies)[0]) {
        const img = assetCache.get(b.body.id);
        if (!img) {
          // Fallback circle
          context.globalAlpha =
            b.body.opacity * opacity * (b.depth < 0 ? 0.6 : 1);
          context.fillStyle = "#555";
          context.beginPath();
          context.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          context.fill();
          return;
        }

        context.globalAlpha =
          b.body.opacity * opacity * (b.depth < 0 ? 0.7 : 1);

        // Draw the image
        // Scale for depth
        const depthScale = 1 + b.depth * 0.15;
        const r = b.radius * depthScale;

        context.drawImage(img, b.x - r, b.y - r, r * 2, r * 2);

        // Subtle shading
        const lightVectorX = cx - b.x;
        const lightVectorY = cy - b.y;
        const lightDistance = Math.hypot(lightVectorX, lightVectorY) || 1;
        const lightX = lightVectorX / lightDistance;
        const lightY = lightVectorY / lightDistance;

        const terminator = context.createRadialGradient(
          b.x - lightX * r * 0.7,
          b.y - lightY * r * 0.7,
          r * 0.1,
          b.x - lightX * r * 0.44,
          b.y - lightY * r * 0.44,
          r * 1.22,
        );
        terminator.addColorStop(
          0,
          `rgba(2, 4, 7, ${b.depth < 0 ? 0.85 : 0.65})`,
        );
        terminator.addColorStop(
          0.54,
          `rgba(2, 4, 7, ${b.depth < 0 ? 0.4 : 0.2})`,
        );
        terminator.addColorStop(1, "rgba(2, 4, 7, 0)");
        context.fillStyle = terminator;
        context.beginPath();
        context.arc(b.x, b.y, r, 0, Math.PI * 2);
        context.fill();
      }

      drawTrails(backBodies, 0.4);
      for (const b of backBodies) drawPlanet(b);

      // Draw Sun
      const sunImg = assetCache.get(SUN_ASSET.id);
      const sunRadius = scale * 0.08;

      // Sun Glow
      const glowGradient = context.createRadialGradient(
        cx,
        cy,
        sunRadius * 0.5,
        cx,
        cy,
        sunRadius * 3,
      );
      glowGradient.addColorStop(0, `rgba(255, 226, 161, ${0.4 * opacity})`);
      glowGradient.addColorStop(0.3, `rgba(246, 180, 75, ${0.15 * opacity})`);
      glowGradient.addColorStop(1, "rgba(246, 180, 75, 0)");
      context.globalAlpha = 1;
      context.fillStyle = glowGradient;
      context.beginPath();
      context.arc(cx, cy, sunRadius * 3, 0, Math.PI * 2);
      context.fill();

      context.globalAlpha = opacity;
      if (sunImg) {
        context.drawImage(
          sunImg,
          cx - sunRadius,
          cy - sunRadius,
          sunRadius * 2,
          sunRadius * 2,
        );
      } else {
        context.fillStyle = "#fff2c6";
        context.beginPath();
        context.arc(cx, cy, sunRadius, 0, Math.PI * 2);
        context.fill();
      }

      drawTrails(frontBodies, 1.0);
      for (const b of frontBodies) drawPlanet(b);

      context.restore(); // Ensure we pop the initial save state

      if (!motionDisabled) {
        schedule();
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        cancel();
      } else {
        startTime = null;
        if (!motionDisabled) schedule();
      }
    }

    const resizeObserver = new ResizeObserver(resize);
    resize();
    resizeObserver.observe(canvasElement);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (motionDisabled) {
      render(reducedMotionFrameTime * 1000);
    } else {
      schedule();
    }

    return () => {
      disposed = true;
      if (idleHandle !== undefined) {
        idleWindow.cancelIdleCallback?.(idleHandle);
      }
      window.clearTimeout(loadTimer);
      cancel();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    centerXRatio,
    centerYRatio,
    paused,
    reducedMotion,
    reducedMotionFrameTime,
    showTrails,
    opacity,
    isDebug,
  ]);

  return (
    <>
      <canvas
        aria-hidden="true"
        className={className}
        ref={canvasRef}
        data-cosmic-status={status}
        data-cosmic-center-x={centerXRatio.toFixed(2)}
        data-cosmic-center-y={centerYRatio.toFixed(2)}
        data-celestial-body-count={REQUIRED_CELESTIAL_BODY_COUNT}
      />
      {isDebug && (
        <div className="fixed bottom-4 left-4 z-[9999] rounded bg-black/80 p-4 text-xs font-mono text-green-400 backdrop-blur">
          <p className="mb-2 font-bold text-white">COSMIC ORBIT HUD</p>
          <p>Status: {status}</p>
          <p>FPS: {stats.fps}</p>
          <p>
            CSS Size: {stats.width}x{stats.height}
          </p>
          <p>DPR: {stats.dpr}</p>
          <p>
            Backing Store: {Math.floor(stats.width * stats.dpr)}x
            {Math.floor(stats.height * stats.dpr)}
          </p>
          <p>
            Assets Loaded: {stats.loadedAssets} / {stats.entities}
          </p>
        </div>
      )}
    </>
  );
}
