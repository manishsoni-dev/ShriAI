"use client";

import { useEffect, useRef } from "react";

type OrbitalBody = {
  semiMajorAxis: number;
  semiMinorAxis: number;
  orbitalPeriod: number;
  phase: number;
  radiusRatio: number;
  minRadius: number;
  surfaceColor: string;
  highlightColor: string;
  shadowColor: string;
  atmosphereColor: string;
  opacity: number;
  trailOpacity: number;
  obliquity: number;
  seed: number;
  bands?: {
    color: string;
    opacity: number;
    offset: number;
    width: number;
  }[];
  craters?: number;
  ring?: {
    color: string;
    innerRadius: number;
    outerRadius: number;
    opacity: number;
    tilt: number;
  };
};

type Star = {
  x: number;
  y: number;
  size: number;
  alpha: number;
  twinkle: number;
  tint: string;
};

type RenderedBody = {
  body: OrbitalBody;
  depth: number;
  eclipseIntensity: number;
  radius: number;
  x: number;
  y: number;
};

type CosmicOrbitEngineProps = {
  className?: string;
  opacity?: number;
  centerXRatio?: number;
  centerYRatio?: number;
  showTrails?: boolean;
  reducedMotionFrameTime?: number;
};

const BODIES: OrbitalBody[] = [
  {
    semiMajorAxis: 0.25,
    semiMinorAxis: 0.1,
    orbitalPeriod: 19,
    phase: 0.3,
    radiusRatio: 0.017,
    minRadius: 9,
    surfaceColor: "#c7773a",
    highlightColor: "#ffd6a3",
    shadowColor: "#3b170e",
    atmosphereColor: "#f4a261",
    opacity: 0.9,
    trailOpacity: 0.045,
    obliquity: -0.22,
    seed: 7,
    craters: 6,
  },
  {
    semiMajorAxis: 0.38,
    semiMinorAxis: 0.17,
    orbitalPeriod: 31,
    phase: 1.35,
    radiusRatio: 0.019,
    minRadius: 10,
    surfaceColor: "#2e74a7",
    highlightColor: "#b7ecff",
    shadowColor: "#07192b",
    atmosphereColor: "#66c7ff",
    opacity: 0.86,
    trailOpacity: 0.04,
    obliquity: 0.38,
    seed: 19,
    bands: [
      { color: "#7dd3fc", opacity: 0.2, offset: -0.42, width: 0.14 },
      { color: "#f5fbff", opacity: 0.22, offset: -0.08, width: 0.1 },
      { color: "#164e63", opacity: 0.18, offset: 0.3, width: 0.16 },
    ],
  },
  {
    semiMajorAxis: 0.47,
    semiMinorAxis: 0.24,
    orbitalPeriod: 48,
    phase: 2.55,
    radiusRatio: 0.031,
    minRadius: 17,
    surfaceColor: "#b67d38",
    highlightColor: "#ffe0a3",
    shadowColor: "#251006",
    atmosphereColor: "#ffbd6d",
    opacity: 0.78,
    trailOpacity: 0.035,
    obliquity: -0.14,
    seed: 31,
    bands: [
      { color: "#f7c56c", opacity: 0.24, offset: -0.54, width: 0.12 },
      { color: "#6f3414", opacity: 0.2, offset: -0.26, width: 0.18 },
      { color: "#fff0bd", opacity: 0.16, offset: 0.02, width: 0.12 },
      { color: "#8b451a", opacity: 0.18, offset: 0.33, width: 0.16 },
    ],
    ring: {
      color: "#f6c98b",
      innerRadius: 1.42,
      outerRadius: 2.08,
      opacity: 0.32,
      tilt: -0.3,
    },
  },
  {
    semiMajorAxis: 0.3,
    semiMinorAxis: 0.19,
    orbitalPeriod: 25,
    phase: 3.8,
    radiusRatio: 0.013,
    minRadius: 7,
    surfaceColor: "#9f4a36",
    highlightColor: "#ffc09a",
    shadowColor: "#2a0e0a",
    atmosphereColor: "#ff8a3d",
    opacity: 0.82,
    trailOpacity: 0.035,
    obliquity: 0.14,
    seed: 43,
    craters: 8,
  },
  {
    semiMajorAxis: 0.18,
    semiMinorAxis: 0.12,
    orbitalPeriod: 13,
    phase: 5.1,
    radiusRatio: 0.011,
    minRadius: 6,
    surfaceColor: "#d6c4ad",
    highlightColor: "#fff7df",
    shadowColor: "#3f3429",
    atmosphereColor: "#f5e8d6",
    opacity: 0.78,
    trailOpacity: 0.03,
    obliquity: 0.02,
    seed: 61,
    craters: 7,
  },
  {
    semiMajorAxis: 0.42,
    semiMinorAxis: 0.13,
    orbitalPeriod: 39,
    phase: 4.7,
    radiusRatio: 0.015,
    minRadius: 8,
    surfaceColor: "#8ea1bd",
    highlightColor: "#eef7ff",
    shadowColor: "#111827",
    atmosphereColor: "#c7d2fe",
    opacity: 0.66,
    trailOpacity: 0.03,
    obliquity: 0.52,
    seed: 83,
    bands: [
      { color: "#e0f2fe", opacity: 0.16, offset: -0.2, width: 0.14 },
      { color: "#475569", opacity: 0.18, offset: 0.26, width: 0.18 },
    ],
  },
  {
    semiMajorAxis: 0.55,
    semiMinorAxis: 0.28,
    orbitalPeriod: 58,
    phase: 0.05,
    radiusRatio: 0.012,
    minRadius: 7,
    surfaceColor: "#4e7897",
    highlightColor: "#d7f3ff",
    shadowColor: "#081523",
    atmosphereColor: "#8bd3ff",
    opacity: 0.62,
    trailOpacity: 0.025,
    obliquity: -0.46,
    seed: 97,
    bands: [
      { color: "#bae6fd", opacity: 0.16, offset: -0.36, width: 0.12 },
      { color: "#1e3a5f", opacity: 0.16, offset: 0.18, width: 0.14 },
    ],
  },
  {
    semiMajorAxis: 0.52,
    semiMinorAxis: 0.21,
    orbitalPeriod: 53,
    phase: 2.95,
    radiusRatio: 0.01,
    minRadius: 6,
    surfaceColor: "#946049",
    highlightColor: "#ffd1b0",
    shadowColor: "#1f0b08",
    atmosphereColor: "#ff9f7a",
    opacity: 0.66,
    trailOpacity: 0.024,
    obliquity: 0.26,
    seed: 113,
    craters: 5,
  },
  {
    semiMajorAxis: 0.61,
    semiMinorAxis: 0.18,
    orbitalPeriod: 67,
    phase: 4.05,
    radiusRatio: 0.009,
    minRadius: 5.5,
    surfaceColor: "#7b6f9d",
    highlightColor: "#e9ddff",
    shadowColor: "#151025",
    atmosphereColor: "#c4b5fd",
    opacity: 0.58,
    trailOpacity: 0.022,
    obliquity: -0.1,
    seed: 131,
    craters: 4,
  },
  {
    semiMajorAxis: 0.58,
    semiMinorAxis: 0.32,
    orbitalPeriod: 73,
    phase: 5.7,
    radiusRatio: 0.014,
    minRadius: 8,
    surfaceColor: "#476d5a",
    highlightColor: "#d9ffe9",
    shadowColor: "#071a12",
    atmosphereColor: "#86efac",
    opacity: 0.54,
    trailOpacity: 0.021,
    obliquity: 0.58,
    seed: 149,
    bands: [
      { color: "#bbf7d0", opacity: 0.14, offset: -0.24, width: 0.13 },
      { color: "#14532d", opacity: 0.15, offset: 0.28, width: 0.16 },
    ],
  },
];

const CENTRAL_GLOW_RADIUS = 30;
const ECLIPSE_THRESHOLD_MULTIPLIER = 1.35;
const MAX_DPR = 2;
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

function rgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(1, alpha))})`;
}

function drawStarfield(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  elapsed: number,
) {
  ctx.save();

  for (const star of STAR_FIELD) {
    const drift = elapsed * 0.0018 * (1 + star.size);
    const x = ((star.x + drift) % 1) * w;
    const y = ((star.y + drift * 0.28) % 1) * h;
    const twinkle =
      0.72 + Math.sin(elapsed * star.twinkle + star.x * 12) * 0.28;

    ctx.globalAlpha = star.alpha * twinkle;
    ctx.fillStyle = star.tint;
    ctx.beginPath();
    ctx.arc(x, y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawCentralGlow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  intensity: number,
) {
  const gradient = ctx.createRadialGradient(
    cx,
    cy,
    0,
    cx,
    cy,
    CENTRAL_GLOW_RADIUS * intensity,
  );
  gradient.addColorStop(0, `rgba(255, 226, 161, ${0.72 * intensity})`);
  gradient.addColorStop(0.26, `rgba(246, 180, 75, ${0.28 * intensity})`);
  gradient.addColorStop(0.55, `rgba(241, 128, 54, ${0.1 * intensity})`);
  gradient.addColorStop(1, "rgba(246, 180, 75, 0)");
  ctx.beginPath();
  ctx.arc(cx, cy, CENTRAL_GLOW_RADIUS * intensity, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.globalAlpha = 0.42 * intensity;
  ctx.fillStyle = "#fff2c6";
  ctx.shadowBlur = 24;
  ctx.shadowColor = "#f6b44b";
  ctx.beginPath();
  ctx.arc(cx, cy, 5.5 * intensity, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawOrbitalTrail(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  body: OrbitalBody,
  w: number,
  h: number,
  elapsed: number,
) {
  const aX = body.semiMajorAxis * Math.min(w, h) * 0.5;
  const aY = body.semiMinorAxis * Math.min(w, h) * 0.5;
  const drift = (elapsed / body.orbitalPeriod) * Math.PI * 2;
  const startAngle = body.phase + drift - Math.PI * 0.18;
  const endAngle = startAngle + Math.PI * 1.12;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = `rgba(201, 220, 255, ${body.trailOpacity})`;
  ctx.lineWidth = 0.65;
  ctx.beginPath();
  ctx.ellipse(0, 0, aX, aY, 0, startAngle, endAngle);
  ctx.stroke();
  ctx.restore();
}

function drawPlanetRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  body: OrbitalBody,
  frontHalf: boolean,
) {
  if (!body.ring) return;

  const ring = body.ring;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ring.tilt);
  ctx.scale(1, 0.36);
  ctx.globalAlpha = body.opacity * ring.opacity * (frontHalf ? 1.25 : 0.74);
  ctx.shadowBlur = frontHalf ? 8 : 4;
  ctx.shadowColor = ring.color;
  ctx.strokeStyle = rgba(ring.color, 0.95);
  ctx.lineWidth = radius * (ring.outerRadius - ring.innerRadius);
  ctx.beginPath();

  if (frontHalf) {
    ctx.ellipse(
      0,
      0,
      radius * ring.outerRadius,
      radius * ring.outerRadius,
      0,
      0,
      Math.PI,
    );
  } else {
    ctx.ellipse(
      0,
      0,
      radius * ring.outerRadius,
      radius * ring.outerRadius,
      0,
      0,
      Math.PI * 2,
    );
  }

  ctx.stroke();
  ctx.restore();
}

function drawSurfaceBands(
  ctx: CanvasRenderingContext2D,
  body: OrbitalBody,
  x: number,
  y: number,
  radius: number,
  elapsed: number,
) {
  if (!body.bands?.length) return;

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate(body.obliquity);

  const drift = (elapsed * 0.08 + body.seed * 0.13) % (radius * 0.32);

  for (const band of body.bands) {
    const bandY = band.offset * radius;
    const bandHeight = Math.max(1.5, band.width * radius);
    const wave =
      Math.sin(elapsed * 0.35 + body.seed + band.offset * 5) * radius * 0.04;

    ctx.globalAlpha = band.opacity * body.opacity;
    ctx.fillStyle = band.color;
    ctx.beginPath();
    ctx.ellipse(
      wave + drift - radius * 0.15,
      bandY,
      radius * 1.32,
      bandHeight,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  ctx.restore();
}

function drawCraters(
  ctx: CanvasRenderingContext2D,
  body: OrbitalBody,
  x: number,
  y: number,
  radius: number,
) {
  if (!body.craters) return;

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();

  for (let index = 0; index < body.craters; index++) {
    const seed = body.seed + index * 13;
    const angle = fract(Math.sin(seed * 2.11) * 97.17) * Math.PI * 2;
    const distance =
      Math.sqrt(fract(Math.sin(seed * 5.31) * 42.91)) * radius * 0.72;
    const craterX = x + Math.cos(angle) * distance;
    const craterY = y + Math.sin(angle) * distance;
    const craterRadius =
      radius * (0.055 + fract(Math.sin(seed * 9.17) * 12.4) * 0.075);

    ctx.globalAlpha = 0.15 * body.opacity;
    ctx.fillStyle = body.shadowColor;
    ctx.beginPath();
    ctx.arc(craterX, craterY, craterRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.12 * body.opacity;
    ctx.strokeStyle = body.highlightColor;
    ctx.lineWidth = Math.max(0.45, craterRadius * 0.16);
    ctx.beginPath();
    ctx.arc(
      craterX - craterRadius * 0.18,
      craterY - craterRadius * 0.18,
      craterRadius,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }

  ctx.restore();
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  rendered: RenderedBody,
  cx: number,
  cy: number,
  elapsed: number,
) {
  const { body, eclipseIntensity, radius, x, y } = rendered;
  const lightVectorX = cx - x;
  const lightVectorY = cy - y;
  const lightDistance = Math.hypot(lightVectorX, lightVectorY) || 1;
  const lightX = lightVectorX / lightDistance;
  const lightY = lightVectorY / lightDistance;
  const glowRadius = radius * (2.2 + eclipseIntensity * 2.6);

  drawPlanetRing(ctx, x, y, radius, body, false);

  ctx.save();
  ctx.globalAlpha = body.opacity;

  const halo = ctx.createRadialGradient(x, y, radius * 0.5, x, y, glowRadius);
  halo.addColorStop(
    0,
    rgba(body.atmosphereColor, 0.22 + eclipseIntensity * 0.18),
  );
  halo.addColorStop(1, rgba(body.atmosphereColor, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  const litSurface = ctx.createRadialGradient(
    x + lightX * radius * 0.38,
    y + lightY * radius * 0.38,
    radius * 0.08,
    x - lightX * radius * 0.18,
    y - lightY * radius * 0.18,
    radius * 1.26,
  );
  litSurface.addColorStop(0, body.highlightColor);
  litSurface.addColorStop(0.36, body.surfaceColor);
  litSurface.addColorStop(0.78, body.shadowColor);
  litSurface.addColorStop(1, "#020407");

  ctx.shadowBlur = 8 + eclipseIntensity * 14;
  ctx.shadowColor = body.atmosphereColor;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = litSurface;
  ctx.fill();

  drawSurfaceBands(ctx, body, x, y, radius, elapsed);
  drawCraters(ctx, body, x, y, radius);

  const terminator = ctx.createRadialGradient(
    x - lightX * radius * 0.7,
    y - lightY * radius * 0.7,
    radius * 0.1,
    x - lightX * radius * 0.44,
    y - lightY * radius * 0.44,
    radius * 1.22,
  );
  terminator.addColorStop(0, rgba("#020407", 0.72));
  terminator.addColorStop(0.54, rgba("#020407", 0.25));
  terminator.addColorStop(1, rgba("#020407", 0));
  ctx.fillStyle = terminator;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  const rim = ctx.createRadialGradient(
    x,
    y,
    radius * 0.82,
    x,
    y,
    radius * 1.18,
  );
  rim.addColorStop(0, rgba(body.atmosphereColor, 0));
  rim.addColorStop(0.74, rgba(body.atmosphereColor, 0.16));
  rim.addColorStop(1, rgba(body.atmosphereColor, 0));
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.18, 0, Math.PI * 2);
  ctx.fill();

  if (eclipseIntensity > 0.15) {
    ctx.globalAlpha = eclipseIntensity * 0.55;
    ctx.shadowBlur = 18;
    ctx.shadowColor = body.atmosphereColor;
    ctx.strokeStyle = body.atmosphereColor;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.9 + eclipseIntensity * 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
  drawPlanetRing(ctx, x, y, radius, body, true);
}

function drawEclipsePulse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  pulseRadius: number,
  intensity: number,
) {
  if (intensity < 0.05) return;
  ctx.save();
  ctx.globalAlpha = intensity * 0.18;
  ctx.strokeStyle = "#f6b44b";
  ctx.lineWidth = 1;
  ctx.shadowBlur = 24;
  ctx.shadowColor = "#f6b44b";
  ctx.beginPath();
  ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function CosmicOrbitEngine({
  className = "pointer-events-none absolute inset-0 h-full w-full",
  opacity = 0.64,
  centerXRatio = 0.5,
  centerYRatio = 0.35,
  showTrails = true,
  reducedMotionFrameTime = 18,
}: CosmicOrbitEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasElement = canvas;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const context = ctx;

    let animationId: number | null = null;
    let startTime: number | null = null;
    let width = 0;
    let height = 0;
    const pulseStates: { radius: number; alpha: number }[] = BODIES.map(() => ({
      radius: 0,
      alpha: 0,
    }));

    function resize() {
      const rect = canvasElement.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.floor(rect.width));
      const nextHeight = Math.max(1, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

      width = nextWidth;
      height = nextHeight;
      canvasElement.width = Math.floor(nextWidth * dpr);
      canvasElement.height = Math.floor(nextHeight * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (prefersReduced) {
        render(reducedMotionFrameTime * 1000);
      }
    }

    function schedule() {
      if (prefersReduced || document.visibilityState === "hidden") return;
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

      if (startTime === null) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;

      const cx = width * centerXRatio;
      const cy = height * centerYRatio;
      const scale = Math.min(width, height);

      context.clearRect(0, 0, width, height);
      drawStarfield(context, width, height, elapsed);

      if (showTrails) {
        for (const body of BODIES) {
          drawOrbitalTrail(context, cx, cy, body, width, height, elapsed);
        }
      }

      drawCentralGlow(context, cx, cy, 1.0);

      const renderedBodies = BODIES.map((body, index) => {
        const theta = elapsed / body.orbitalPeriod;
        const angle = theta * Math.PI * 2 + body.phase;
        const aX = body.semiMajorAxis * scale * 0.5;
        const aY = body.semiMinorAxis * scale * 0.5;
        const bx = cx + Math.cos(angle) * aX;
        const by = cy + Math.sin(angle) * aY;
        const radius = Math.max(body.minRadius, scale * body.radiusRatio);

        const dist = Math.sqrt((bx - cx) ** 2 + (by - cy) ** 2);
        const eclipseThreshold =
          (radius + CENTRAL_GLOW_RADIUS) * ECLIPSE_THRESHOLD_MULTIPLIER;
        const rawEclipse = Math.max(0, 1 - dist / eclipseThreshold);
        const eclipseIntensity = rawEclipse * rawEclipse;

        const pulse = pulseStates[index]!;
        if (eclipseIntensity > 0.68 && pulse.alpha <= 0) {
          pulse.radius = CENTRAL_GLOW_RADIUS * 1.2;
          pulse.alpha = 0.48;
        }

        if (pulse.alpha > 0) {
          drawEclipsePulse(context, cx, cy, pulse.radius, pulse.alpha);
          pulse.radius += 0.62;
          pulse.alpha -= 0.006;
        }

        return {
          body,
          depth: Math.sin(angle),
          eclipseIntensity,
          radius,
          x: bx,
          y: by,
        };
      }).sort((a, b) => a.depth - b.depth || a.y - b.y);

      for (const renderedBody of renderedBodies) {
        drawBody(context, renderedBody, cx, cy, elapsed);
      }

      schedule();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        cancel();
      } else {
        startTime = null;
        schedule();
      }
    }

    const resizeObserver = new ResizeObserver(resize);
    resize();
    resizeObserver.observe(canvasElement);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (prefersReduced) {
      render(reducedMotionFrameTime * 1000);
    } else {
      schedule();
    }

    return () => {
      cancel();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [centerXRatio, centerYRatio, reducedMotionFrameTime, showTrails]);

  return (
    <canvas
      aria-hidden="true"
      className={className}
      ref={canvasRef}
      style={{
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}
