"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CosmicOrbitEngine } from "./CosmicOrbitEngine";

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(media.matches);

    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  return prefersReducedMotion;
}

function useViewportWidth() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const update = () => setWidth(window.innerWidth);

    update();
    window.addEventListener("resize", update);

    return () => window.removeEventListener("resize", update);
  }, []);

  return width;
}

export function SharedCosmicBackground() {
  const pathname = usePathname();
  const prefersReducedMotion = usePrefersReducedMotion();
  const viewportWidth = useViewportWidth();
  const [motionPaused, setMotionPaused] = useState(false);

  // Route-specific opacity controls
  let opacity = 0.64; // Default for home and others
  let centerXRatio = 0.5;
  let centerYRatio = 0.35;
  let showTrails = true;

  if (pathname === "/") {
    opacity = viewportWidth > 0 && viewportWidth < 768 ? 0.3 : 0.46;
    centerXRatio = viewportWidth >= 1024 ? 0.72 : 0.5;
    centerYRatio = viewportWidth >= 1024 ? 0.42 : 0.3;
    showTrails = viewportWidth >= 768;
  }

  if (pathname?.startsWith("/chat")) {
    opacity = 0.28;
    centerXRatio = 0.5;
    centerYRatio = 0.34;
    showTrails = false;
  }

  const motionStopped = prefersReducedMotion || motionPaused;
  const buttonLabel = prefersReducedMotion
    ? "Cosmic motion reduced by system setting"
    : motionPaused
      ? "Resume cosmic motion"
      : "Pause cosmic motion";

  return (
    <>
      <div className="cosmic-backdrop" aria-hidden="true">
        <CosmicOrbitEngine
          opacity={opacity}
          centerXRatio={centerXRatio}
          centerYRatio={centerYRatio}
          showTrails={showTrails}
          paused={motionPaused}
          reducedMotion={prefersReducedMotion}
        />
      </div>
      <div className="cosmic-motion-control">
        <button
          aria-label={buttonLabel}
          aria-pressed={motionStopped}
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-amber-200/18 bg-[#090604]/82 px-3 text-xs font-semibold text-amber-100/78 shadow-[0_14px_42px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:border-amber-200/34 hover:text-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200/80 disabled:cursor-not-allowed disabled:opacity-65"
          data-testid="cosmic-motion-toggle"
          disabled={prefersReducedMotion}
          onClick={() => setMotionPaused((current) => !current)}
          title={buttonLabel}
          type="button"
        >
          {prefersReducedMotion
            ? "Motion reduced"
            : motionPaused
              ? "Resume motion"
              : "Pause motion"}
        </button>
        <span className="sr-only" aria-live="polite">
          {motionStopped ? "Cosmic motion paused." : "Cosmic motion running."}
        </span>
      </div>
    </>
  );
}
