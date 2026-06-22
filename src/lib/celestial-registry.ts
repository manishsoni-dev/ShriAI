export type CelestialAsset = {
  id: string;
  displayName: string;
  classification: "star" | "planet" | "dwarf-planet";
  imageSrc: `/cosmic/${string}.webp`;
  credit: string;
  sourcePage: string;
  license: string;
};

export type OrbitingCelestialBody = CelestialAsset & {
  classification: "planet" | "dwarf-planet";
  orbitRadiusFactor: number;
  displayRadiusFactor: number;
  angularVelocity: number;
  initialAngle: number;
  inclination: number;
  opacity: number;
  symbolicNote?: string;
};

const COMMONS_LICENSE =
  "Wikimedia Commons source page; NASA imagery/public-domain terms apply as documented there.";

export const SUN_ASSET: CelestialAsset = {
  id: "sun",
  displayName: "Sun",
  classification: "star",
  imageSrc: "/cosmic/sun.webp",
  credit: "NASA/SDO",
  sourcePage:
    "https://commons.wikimedia.org/wiki/File:The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg",
  license: COMMONS_LICENSE,
};

/** Eight planets plus Pluto as Shri AI's intentionally symbolic ninth body. */
export const CELESTIAL_BODIES: OrbitingCelestialBody[] = [
  {
    id: "mercury",
    displayName: "Mercury",
    classification: "planet",
    imageSrc: "/cosmic/mercury.webp",
    credit:
      "NASA/Johns Hopkins University Applied Physics Laboratory/Carnegie Institution of Washington",
    sourcePage:
      "https://commons.wikimedia.org/wiki/File:Mercury_in_true_color.jpg",
    license: COMMONS_LICENSE,
    orbitRadiusFactor: 0.12,
    displayRadiusFactor: 0.012,
    angularVelocity: 0.8,
    initialAngle: 0.5,
    inclination: 0.02,
    opacity: 0.9,
  },
  {
    id: "venus",
    displayName: "Venus",
    classification: "planet",
    imageSrc: "/cosmic/venus.webp",
    credit: "NASA/JPL-Caltech",
    sourcePage: "https://commons.wikimedia.org/wiki/File:Venus-real_color.jpg",
    license: COMMONS_LICENSE,
    orbitRadiusFactor: 0.18,
    displayRadiusFactor: 0.02,
    angularVelocity: 0.6,
    initialAngle: 1.2,
    inclination: 0.01,
    opacity: 0.95,
  },
  {
    id: "earth",
    displayName: "Earth",
    classification: "planet",
    imageSrc: "/cosmic/earth.webp",
    credit: "NASA",
    sourcePage:
      "https://commons.wikimedia.org/wiki/File:The_Earth_seen_from_Apollo_17.jpg",
    license: COMMONS_LICENSE,
    orbitRadiusFactor: 0.25,
    displayRadiusFactor: 0.021,
    angularVelocity: 0.45,
    initialAngle: 3.14,
    inclination: 0,
    opacity: 1,
  },
  {
    id: "mars",
    displayName: "Mars",
    classification: "planet",
    imageSrc: "/cosmic/mars.webp",
    credit: "NASA, ESA, and The Hubble Heritage Team (STScI/AURA)",
    sourcePage:
      "https://commons.wikimedia.org/wiki/File:Mars_-_August_30_2001_-_Hubble.jpg",
    license: COMMONS_LICENSE,
    orbitRadiusFactor: 0.32,
    displayRadiusFactor: 0.015,
    angularVelocity: 0.35,
    initialAngle: 4.5,
    inclination: -0.01,
    opacity: 0.9,
  },
  {
    id: "jupiter",
    displayName: "Jupiter",
    classification: "planet",
    imageSrc: "/cosmic/jupiter.webp",
    credit: "NASA, ESA, and A. Simon (Goddard Space Flight Center)",
    sourcePage: "https://commons.wikimedia.org/wiki/File:Jupiter.jpg",
    license: COMMONS_LICENSE,
    orbitRadiusFactor: 0.48,
    displayRadiusFactor: 0.045,
    angularVelocity: 0.2,
    initialAngle: 2.1,
    inclination: 0.005,
    opacity: 1,
  },
  {
    id: "saturn",
    displayName: "Saturn",
    classification: "planet",
    imageSrc: "/cosmic/saturn.webp",
    credit: "NASA/JPL/Space Science Institute",
    sourcePage:
      "https://commons.wikimedia.org/wiki/File:Saturn_during_Equinox.jpg",
    license: COMMONS_LICENSE,
    orbitRadiusFactor: 0.64,
    displayRadiusFactor: 0.08,
    angularVelocity: 0.15,
    initialAngle: 5.5,
    inclination: 0.015,
    opacity: 1,
  },
  {
    id: "uranus",
    displayName: "Uranus",
    classification: "planet",
    imageSrc: "/cosmic/uranus.webp",
    credit: "NASA/JPL-Caltech",
    sourcePage: "https://commons.wikimedia.org/wiki/File:Uranus2.jpg",
    license: COMMONS_LICENSE,
    orbitRadiusFactor: 0.8,
    displayRadiusFactor: 0.028,
    angularVelocity: 0.1,
    initialAngle: 0.9,
    inclination: -0.005,
    opacity: 0.9,
  },
  {
    id: "neptune",
    displayName: "Neptune",
    classification: "planet",
    imageSrc: "/cosmic/neptune.webp",
    credit: "NASA/JPL-Caltech",
    sourcePage: "https://commons.wikimedia.org/wiki/File:Neptune_Full.jpg",
    license: COMMONS_LICENSE,
    orbitRadiusFactor: 0.92,
    displayRadiusFactor: 0.027,
    angularVelocity: 0.08,
    initialAngle: 3.8,
    inclination: 0.01,
    opacity: 0.9,
  },
  {
    id: "pluto",
    displayName: "Pluto",
    classification: "dwarf-planet",
    imageSrc: "/cosmic/pluto.webp",
    credit:
      "NASA/Johns Hopkins University Applied Physics Laboratory/Southwest Research Institute",
    sourcePage:
      "https://commons.wikimedia.org/wiki/File:Pluto_in_True_Color_-_High-Res.jpg",
    license: COMMONS_LICENSE,
    orbitRadiusFactor: 1.05,
    displayRadiusFactor: 0.008,
    angularVelocity: 0.06,
    initialAngle: 6.1,
    inclination: 0.06,
    opacity: 0.8,
    symbolicNote:
      "Intentionally retained as Shri AI's symbolic ninth celestial body; astronomically classified as a dwarf planet.",
  },
];

export const CELESTIAL_REGISTRY: CelestialAsset[] = [
  SUN_ASSET,
  ...CELESTIAL_BODIES,
];
