export const REQUIRED_CELESTIAL_BODY_COUNT = 9;

export type CosmicAssetFormat = "avif" | "webp";
export type CosmicAssetPath = `/cosmic/${string}.${CosmicAssetFormat}`;
export type AstronomicalType = "star" | "planet" | "dwarf-planet";
export type VisualRole = "central-sun" | "symbolic-celestial-body";
export type AltBehavior = "decorative";
export type SourceOriginalStatus = "not-retained-in-repo";
export type UsageRightsStatus = "source-linked-review-required";

export type CelestialProvenance = {
  referenceId: string;
  credit: string;
  sourcePage: string;
  license: string;
  usageRightsStatus: UsageRightsStatus;
  sourceOriginalStatus: SourceOriginalStatus;
  replacementRequirement: string;
  dateChecked: "2026-06-30";
};

export type CelestialAsset = {
  id: string;
  displayName: string;
  astronomicalType: AstronomicalType;
  visualRole: VisualRole;
  imageSrc: CosmicAssetPath;
  sources: {
    avif: CosmicAssetPath;
    webp: CosmicAssetPath;
  };
  width: number;
  height: number;
  fileSizeBytes: {
    avif: number;
    webp: number;
  };
  hasAlpha: boolean;
  requiresTransparency: boolean;
  highDensitySuitable: boolean;
  altBehavior: AltBehavior;
  provenance: CelestialProvenance;
};

export type OrbitingCelestialBody = CelestialAsset & {
  visualRole: "symbolic-celestial-body";
  orbitRadiusFactor: number;
  orbitDurationSeconds: number;
  initialPhaseRadians: number;
  zIndexTier: number;
  displayRadiusFactor: number;
  inclination: number;
  opacity: number;
  symbolicNote?: string;
};

const COMMONS_LICENSE =
  "Wikimedia Commons source page; NASA imagery/public-domain terms apply as documented there.";

const SOURCE_ORIGINAL_REPLACEMENT =
  "Retain the original high-resolution source outside browser delivery before claiming 4K quality or redistributing these derivatives outside Shri AI.";

function provenance(input: {
  id: string;
  credit: string;
  sourcePage: string;
}): CelestialProvenance {
  return {
    referenceId: `cosmic-source-${input.id}`,
    credit: input.credit,
    sourcePage: input.sourcePage,
    license: COMMONS_LICENSE,
    usageRightsStatus: "source-linked-review-required",
    sourceOriginalStatus: "not-retained-in-repo",
    replacementRequirement: SOURCE_ORIGINAL_REPLACEMENT,
    dateChecked: "2026-06-30",
  };
}

export const SUN_ASSET: CelestialAsset = {
  id: "sun",
  displayName: "Sun",
  astronomicalType: "star",
  visualRole: "central-sun",
  imageSrc: "/cosmic/sun.webp",
  sources: {
    avif: "/cosmic/sun.avif",
    webp: "/cosmic/sun.webp",
  },
  width: 512,
  height: 512,
  fileSizeBytes: {
    avif: 62_715,
    webp: 58_062,
  },
  hasAlpha: true,
  requiresTransparency: true,
  highDensitySuitable: true,
  altBehavior: "decorative",
  provenance: provenance({
    id: "sun",
    credit: "NASA/SDO",
    sourcePage:
      "https://commons.wikimedia.org/wiki/File:The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg",
  }),
};

export const CELESTIAL_BODIES = [
  {
    id: "mercury",
    displayName: "Mercury",
    astronomicalType: "planet",
    visualRole: "symbolic-celestial-body",
    imageSrc: "/cosmic/mercury.webp",
    sources: {
      avif: "/cosmic/mercury.avif",
      webp: "/cosmic/mercury.webp",
    },
    width: 256,
    height: 256,
    fileSizeBytes: {
      avif: 9_583,
      webp: 10_180,
    },
    hasAlpha: true,
    requiresTransparency: true,
    highDensitySuitable: true,
    altBehavior: "decorative",
    provenance: provenance({
      id: "mercury",
      credit:
        "NASA/Johns Hopkins University Applied Physics Laboratory/Carnegie Institution of Washington",
      sourcePage:
        "https://commons.wikimedia.org/wiki/File:Mercury_in_true_color.jpg",
    }),
    orbitRadiusFactor: 0.12,
    orbitDurationSeconds: 7.85,
    initialPhaseRadians: 0.5,
    zIndexTier: 10,
    displayRadiusFactor: 0.012,
    inclination: 0.02,
    opacity: 0.82,
  },
  {
    id: "venus",
    displayName: "Venus",
    astronomicalType: "planet",
    visualRole: "symbolic-celestial-body",
    imageSrc: "/cosmic/venus.webp",
    sources: {
      avif: "/cosmic/venus.avif",
      webp: "/cosmic/venus.webp",
    },
    width: 256,
    height: 256,
    fileSizeBytes: {
      avif: 2_752,
      webp: 3_602,
    },
    hasAlpha: true,
    requiresTransparency: true,
    highDensitySuitable: true,
    altBehavior: "decorative",
    provenance: provenance({
      id: "venus",
      credit: "NASA/JPL-Caltech",
      sourcePage:
        "https://commons.wikimedia.org/wiki/File:Venus-real_color.jpg",
    }),
    orbitRadiusFactor: 0.18,
    orbitDurationSeconds: 10.47,
    initialPhaseRadians: 1.2,
    zIndexTier: 10,
    displayRadiusFactor: 0.02,
    inclination: 0.01,
    opacity: 0.86,
  },
  {
    id: "earth",
    displayName: "Earth",
    astronomicalType: "planet",
    visualRole: "symbolic-celestial-body",
    imageSrc: "/cosmic/earth.webp",
    sources: {
      avif: "/cosmic/earth.avif",
      webp: "/cosmic/earth.webp",
    },
    width: 256,
    height: 256,
    fileSizeBytes: {
      avif: 16_295,
      webp: 16_524,
    },
    hasAlpha: true,
    requiresTransparency: true,
    highDensitySuitable: true,
    altBehavior: "decorative",
    provenance: provenance({
      id: "earth",
      credit: "NASA",
      sourcePage:
        "https://commons.wikimedia.org/wiki/File:The_Earth_seen_from_Apollo_17.jpg",
    }),
    orbitRadiusFactor: 0.25,
    orbitDurationSeconds: 13.96,
    initialPhaseRadians: 3.14,
    zIndexTier: 20,
    displayRadiusFactor: 0.021,
    inclination: 0,
    opacity: 0.9,
  },
  {
    id: "mars",
    displayName: "Mars",
    astronomicalType: "planet",
    visualRole: "symbolic-celestial-body",
    imageSrc: "/cosmic/mars.webp",
    sources: {
      avif: "/cosmic/mars.avif",
      webp: "/cosmic/mars.webp",
    },
    width: 256,
    height: 256,
    fileSizeBytes: {
      avif: 4_351,
      webp: 4_800,
    },
    hasAlpha: true,
    requiresTransparency: true,
    highDensitySuitable: true,
    altBehavior: "decorative",
    provenance: provenance({
      id: "mars",
      credit: "NASA, ESA, and The Hubble Heritage Team (STScI/AURA)",
      sourcePage:
        "https://commons.wikimedia.org/wiki/File:Mars_-_August_30_2001_-_Hubble.jpg",
    }),
    orbitRadiusFactor: 0.32,
    orbitDurationSeconds: 17.95,
    initialPhaseRadians: 4.5,
    zIndexTier: 20,
    displayRadiusFactor: 0.015,
    inclination: -0.01,
    opacity: 0.82,
  },
  {
    id: "jupiter",
    displayName: "Jupiter",
    astronomicalType: "planet",
    visualRole: "symbolic-celestial-body",
    imageSrc: "/cosmic/jupiter.webp",
    sources: {
      avif: "/cosmic/jupiter.avif",
      webp: "/cosmic/jupiter.webp",
    },
    width: 384,
    height: 384,
    fileSizeBytes: {
      avif: 8_422,
      webp: 11_344,
    },
    hasAlpha: true,
    requiresTransparency: true,
    highDensitySuitable: true,
    altBehavior: "decorative",
    provenance: provenance({
      id: "jupiter",
      credit: "NASA, ESA, and A. Simon (Goddard Space Flight Center)",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Jupiter.jpg",
    }),
    orbitRadiusFactor: 0.48,
    orbitDurationSeconds: 31.42,
    initialPhaseRadians: 2.1,
    zIndexTier: 30,
    displayRadiusFactor: 0.04,
    inclination: 0.005,
    opacity: 0.92,
  },
  {
    id: "saturn",
    displayName: "Saturn",
    astronomicalType: "planet",
    visualRole: "symbolic-celestial-body",
    imageSrc: "/cosmic/saturn.webp",
    sources: {
      avif: "/cosmic/saturn.avif",
      webp: "/cosmic/saturn.webp",
    },
    width: 512,
    height: 512,
    fileSizeBytes: {
      avif: 8_269,
      webp: 11_320,
    },
    hasAlpha: true,
    requiresTransparency: true,
    highDensitySuitable: true,
    altBehavior: "decorative",
    provenance: provenance({
      id: "saturn",
      credit: "NASA/JPL/Space Science Institute",
      sourcePage:
        "https://commons.wikimedia.org/wiki/File:Saturn_during_Equinox.jpg",
    }),
    orbitRadiusFactor: 0.64,
    orbitDurationSeconds: 41.89,
    initialPhaseRadians: 5.5,
    zIndexTier: 30,
    displayRadiusFactor: 0.068,
    inclination: 0.015,
    opacity: 0.88,
  },
  {
    id: "uranus",
    displayName: "Uranus",
    astronomicalType: "planet",
    visualRole: "symbolic-celestial-body",
    imageSrc: "/cosmic/uranus.webp",
    sources: {
      avif: "/cosmic/uranus.avif",
      webp: "/cosmic/uranus.webp",
    },
    width: 256,
    height: 256,
    fileSizeBytes: {
      avif: 1_976,
      webp: 2_480,
    },
    hasAlpha: true,
    requiresTransparency: true,
    highDensitySuitable: true,
    altBehavior: "decorative",
    provenance: provenance({
      id: "uranus",
      credit: "NASA/JPL-Caltech",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Uranus2.jpg",
    }),
    orbitRadiusFactor: 0.8,
    orbitDurationSeconds: 62.83,
    initialPhaseRadians: 0.9,
    zIndexTier: 40,
    displayRadiusFactor: 0.024,
    inclination: -0.005,
    opacity: 0.76,
  },
  {
    id: "neptune",
    displayName: "Neptune",
    astronomicalType: "planet",
    visualRole: "symbolic-celestial-body",
    imageSrc: "/cosmic/neptune.webp",
    sources: {
      avif: "/cosmic/neptune.avif",
      webp: "/cosmic/neptune.webp",
    },
    width: 256,
    height: 256,
    fileSizeBytes: {
      avif: 2_436,
      webp: 3_070,
    },
    hasAlpha: true,
    requiresTransparency: true,
    highDensitySuitable: true,
    altBehavior: "decorative",
    provenance: provenance({
      id: "neptune",
      credit: "NASA/JPL-Caltech",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Neptune_Full.jpg",
    }),
    orbitRadiusFactor: 0.92,
    orbitDurationSeconds: 78.54,
    initialPhaseRadians: 3.8,
    zIndexTier: 40,
    displayRadiusFactor: 0.023,
    inclination: 0.01,
    opacity: 0.74,
  },
  {
    id: "pluto",
    displayName: "Pluto",
    astronomicalType: "dwarf-planet",
    visualRole: "symbolic-celestial-body",
    imageSrc: "/cosmic/pluto.webp",
    sources: {
      avif: "/cosmic/pluto.avif",
      webp: "/cosmic/pluto.webp",
    },
    width: 128,
    height: 128,
    fileSizeBytes: {
      avif: 2_671,
      webp: 2_688,
    },
    hasAlpha: true,
    requiresTransparency: true,
    highDensitySuitable: true,
    altBehavior: "decorative",
    provenance: provenance({
      id: "pluto",
      credit:
        "NASA/Johns Hopkins University Applied Physics Laboratory/Southwest Research Institute",
      sourcePage:
        "https://commons.wikimedia.org/wiki/File:Pluto_in_True_Color_-_High-Res.jpg",
    }),
    orbitRadiusFactor: 1.05,
    orbitDurationSeconds: 104.72,
    initialPhaseRadians: 6.1,
    zIndexTier: 40,
    displayRadiusFactor: 0.008,
    inclination: 0.06,
    opacity: 0.68,
    symbolicNote:
      "Pluto is intentionally retained as Shri AI's symbolic ninth celestial body and is astronomically classified as a dwarf planet.",
  },
] as const satisfies readonly OrbitingCelestialBody[];

export const CELESTIAL_REGISTRY = [
  SUN_ASSET,
  ...CELESTIAL_BODIES,
] as const satisfies readonly CelestialAsset[];
