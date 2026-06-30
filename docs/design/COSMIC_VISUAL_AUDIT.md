# Cosmic Visual Audit

Date checked: 2026-06-30  
Task: P1.0A Cosmic Preservation and High-DPI Visual Fidelity

## Summary

- The central sun remains in the runtime registry.
- Exactly nine symbolic celestial bodies remain in the runtime registry:
  Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto.
- Pluto is intentionally retained as Shri AI's symbolic ninth celestial body
  and is astronomically typed as a dwarf planet.
- The checked-in browser-delivered assets are local files under
  `public/cosmic`.
- AVIF derivatives were added for every cosmic asset, with WebP retained as the
  fallback format.
- `saturn.webp` had a visible rectangular black background and no alpha channel
  before this task. It was repaired at the asset level and regenerated with
  decoded alpha in both WebP and AVIF.
- No source image is 4K in this repo. Do not claim 4K source quality.
- Original high-resolution source files are not retained outside browser
  delivery in this repo. That remains a provenance/asset-pipeline blocker.

## Measurement Method

- Dimensions and alpha were checked with `sips`, `file`, and `sharp`.
- Decoded corner transparency was checked with `sharp().ensureAlpha().raw()`.
- File size was checked from filesystem byte counts.
- Visual transparency for Saturn was checked by compositing the repaired asset
  over a light background.

## Asset Records

| Asset filename | Actual dimensions | Format | Current file size |    Before size | Alpha / transparency                                   | Visual role             | Source / provenance                                                           | Usage-rights status                                  | Replacement requirement                                                                                             | High-density suitability                   |
| -------------- | ----------------: | ------ | ----------------: | -------------: | ------------------------------------------------------ | ----------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `sun.webp`     |           512x512 | WebP   |      58,062 bytes |   58,062 bytes | Alpha yes                                              | Central sun             | NASA/SDO via linked Wikimedia Commons page in `src/lib/celestial-registry.ts` | Source linked; review required before redistribution | Retain original high-resolution source outside browser delivery                                                     | Suitable for current rendered size; not 4K |
| `sun.avif`     |           512x512 | AVIF   |      62,715 bytes | New derivative | Alpha yes                                              | Central sun             | Derived from `sun.webp`                                                       | Source linked; review required before redistribution | Regenerate from retained original when source-original pipeline exists                                              | Suitable for current rendered size; not 4K |
| `mercury.webp` |           256x256 | WebP   |      10,180 bytes |   10,180 bytes | Alpha yes                                              | Symbolic celestial body | NASA/APL/Carnegie via linked Wikimedia Commons page                           | Source linked; review required before redistribution | Retain original high-resolution source outside browser delivery                                                     | Suitable for current rendered size; not 4K |
| `mercury.avif` |           256x256 | AVIF   |       9,583 bytes | New derivative | Alpha yes                                              | Symbolic celestial body | Derived from `mercury.webp`                                                   | Source linked; review required before redistribution | Regenerate from retained original when source-original pipeline exists                                              | Suitable for current rendered size; not 4K |
| `venus.webp`   |           256x256 | WebP   |       3,602 bytes |    3,602 bytes | Alpha yes                                              | Symbolic celestial body | NASA/JPL-Caltech via linked Wikimedia Commons page                            | Source linked; review required before redistribution | Retain original high-resolution source outside browser delivery                                                     | Suitable for current rendered size; not 4K |
| `venus.avif`   |           256x256 | AVIF   |       2,752 bytes | New derivative | Alpha yes                                              | Symbolic celestial body | Derived from `venus.webp`                                                     | Source linked; review required before redistribution | Regenerate from retained original when source-original pipeline exists                                              | Suitable for current rendered size; not 4K |
| `earth.webp`   |           256x256 | WebP   |      16,524 bytes |   16,524 bytes | Alpha yes                                              | Symbolic celestial body | NASA via linked Wikimedia Commons page                                        | Source linked; review required before redistribution | Retain original high-resolution source outside browser delivery                                                     | Suitable for current rendered size; not 4K |
| `earth.avif`   |           256x256 | AVIF   |      16,295 bytes | New derivative | Alpha yes                                              | Symbolic celestial body | Derived from `earth.webp`                                                     | Source linked; review required before redistribution | Regenerate from retained original when source-original pipeline exists                                              | Suitable for current rendered size; not 4K |
| `mars.webp`    |           256x256 | WebP   |       4,800 bytes |    4,800 bytes | Alpha yes                                              | Symbolic celestial body | NASA/ESA/Hubble Heritage via linked Wikimedia Commons page                    | Source linked; review required before redistribution | Retain original high-resolution source outside browser delivery                                                     | Suitable for current rendered size; not 4K |
| `mars.avif`    |           256x256 | AVIF   |       4,351 bytes | New derivative | Alpha yes                                              | Symbolic celestial body | Derived from `mars.webp`                                                      | Source linked; review required before redistribution | Regenerate from retained original when source-original pipeline exists                                              | Suitable for current rendered size; not 4K |
| `jupiter.webp` |           384x384 | WebP   |      11,344 bytes |   11,344 bytes | Alpha yes                                              | Symbolic celestial body | NASA/ESA/A. Simon via linked Wikimedia Commons page                           | Source linked; review required before redistribution | Retain original high-resolution source outside browser delivery                                                     | Suitable for current rendered size; not 4K |
| `jupiter.avif` |           384x384 | AVIF   |       8,422 bytes | New derivative | Alpha yes                                              | Symbolic celestial body | Derived from `jupiter.webp`                                                   | Source linked; review required before redistribution | Regenerate from retained original when source-original pipeline exists                                              | Suitable for current rendered size; not 4K |
| `saturn.webp`  |           512x512 | WebP   |      11,320 bytes |    6,452 bytes | Alpha yes after repair; rectangular background removed | Symbolic celestial body | NASA/JPL/Space Science Institute via linked Wikimedia Commons page            | Source linked; review required before redistribution | Retain original high-resolution source outside browser delivery; replace from original source for cleaner ring edge | Suitable for current rendered size; not 4K |
| `saturn.avif`  |           512x512 | AVIF   |       8,269 bytes | New derivative | Alpha yes                                              | Symbolic celestial body | Derived from repaired `saturn.webp`                                           | Source linked; review required before redistribution | Regenerate from retained original when source-original pipeline exists                                              | Suitable for current rendered size; not 4K |
| `uranus.webp`  |           256x256 | WebP   |       2,480 bytes |    2,480 bytes | Alpha yes                                              | Symbolic celestial body | NASA/JPL-Caltech via linked Wikimedia Commons page                            | Source linked; review required before redistribution | Retain original high-resolution source outside browser delivery                                                     | Suitable for current rendered size; not 4K |
| `uranus.avif`  |           256x256 | AVIF   |       1,976 bytes | New derivative | Alpha yes                                              | Symbolic celestial body | Derived from `uranus.webp`                                                    | Source linked; review required before redistribution | Regenerate from retained original when source-original pipeline exists                                              | Suitable for current rendered size; not 4K |
| `neptune.webp` |           256x256 | WebP   |       3,070 bytes |    3,070 bytes | Alpha yes                                              | Symbolic celestial body | NASA/JPL-Caltech via linked Wikimedia Commons page                            | Source linked; review required before redistribution | Retain original high-resolution source outside browser delivery                                                     | Suitable for current rendered size; not 4K |
| `neptune.avif` |           256x256 | AVIF   |       2,436 bytes | New derivative | Alpha yes                                              | Symbolic celestial body | Derived from `neptune.webp`                                                   | Source linked; review required before redistribution | Regenerate from retained original when source-original pipeline exists                                              | Suitable for current rendered size; not 4K |
| `pluto.webp`   |           128x128 | WebP   |       2,688 bytes |    2,688 bytes | Alpha yes                                              | Symbolic celestial body | NASA/APL/SwRI via linked Wikimedia Commons page                               | Source linked; review required before redistribution | Retain original high-resolution source outside browser delivery                                                     | Suitable for current rendered size; not 4K |
| `pluto.avif`   |           128x128 | AVIF   |       2,671 bytes | New derivative | Alpha yes                                              | Symbolic celestial body | Derived from `pluto.webp`                                                     | Source linked; review required before redistribution | Regenerate from retained original when source-original pipeline exists                                              | Suitable for current rendered size; not 4K |

## Payload Budget

- Largest non-critical celestial asset: `sun.avif` at 62,715 bytes.
- Largest orbiting celestial body asset: `earth.webp` at 16,524 bytes.
- No individual non-critical celestial asset exceeds the 350 KB budget.
- Total checked-in WebP cosmic payload after repair: 124,070 bytes.
- Total checked-in AVIF cosmic payload: 119,470 bytes.
- Combined checked-in browser-deliverable cosmic payload: 243,540 bytes.
- Initial hero visual payload target remains below 1.5 MB after moving
  `shri-mark.png` behind Next Image optimization and adding AVIF/WebP formats.

## Provenance Blockers

- The repo records linked Wikimedia Commons/NASA source pages, but does not
  retain original high-resolution source files outside browser delivery.
- AVIF derivatives were generated from the existing WebP assets, not from
  retained original source files.
- Saturn's repaired alpha is acceptable for the current rendered size, but a
  cleaner future replacement should be regenerated from the retained original.
- Until retained originals are added and audited, the project must not claim
  these assets are 4K source assets.
