# Cosmic Asset Provenance

`src/lib/celestial-registry.ts` is the authoritative runtime and provenance
registry for every local celestial image. Each entry records its local path,
source page, credit, classification, and license note. Runtime code must not
load remote celestial assets.

The orbit contains the eight planets and Pluto. Pluto is intentionally retained
as Shri AI's symbolic ninth celestial body and remains correctly classified as
a dwarf planet in the registry.

The checked-in WebP files are derived from NASA imagery distributed through
their linked Wikimedia Commons source pages. Review the linked source page and
NASA media-usage guidance before redistributing assets outside this project.
