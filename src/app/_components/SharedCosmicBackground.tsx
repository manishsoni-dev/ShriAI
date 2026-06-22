"use client";

import { usePathname } from "next/navigation";
import { CosmicOrbitEngine } from "./CosmicOrbitEngine";

export function SharedCosmicBackground() {
  const pathname = usePathname();

  // Route-specific opacity controls
  let opacity = 0.64; // Default for home and others
  let centerYRatio = 0.35;
  let showTrails = true;

  if (pathname?.startsWith("/chat")) {
    opacity = 0.28;
    centerYRatio = 0.34;
    showTrails = false;
  }

  return (
    <div className="cosmic-backdrop" aria-hidden="true">
      <CosmicOrbitEngine
        opacity={opacity}
        centerYRatio={centerYRatio}
        showTrails={showTrails}
      />
    </div>
  );
}
