# Cosmic Asset Provenance

`src/lib/celestial-registry.ts` is the authoritative runtime and provenance
registry for every local celestial image. Each entry records its local AVIF and
WebP paths, measured dimensions, file sizes, source page, credit, astronomical
type, and license note. Runtime code must not load remote celestial assets.

The orbit contains exactly nine symbolic celestial bodies. Pluto is
intentionally retained as Shri AI's symbolic ninth celestial body and remains
astronomically typed as a dwarf planet in the registry.

The checked-in WebP files are derived from NASA imagery distributed through
their linked Wikimedia Commons source pages. Review the linked source page and
NASA media-usage guidance before redistributing assets outside this project.
Original high-resolution source files are not retained in this repository; do
not claim 4K source quality until those originals are retained and audited.
