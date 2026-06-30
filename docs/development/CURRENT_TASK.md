# Current Task: P1.0A Cosmic Preservation and High-DPI Visual Fidelity

## Objective

Preserve Shri AI's central sun and exactly nine symbolic celestial bodies while
improving high-DPI asset fidelity, hero containment, reduced-motion behavior,
and accessibility for the cosmic presentation layer.

## Verified Current Flow

- Worktree: `/Users/manishh/Desktop/ShriAI-p0-baseline`.
- Branch: `codex/p1-0a-cosmic-highdpi`.
- Branch was created from `main` at
  `d5bbb28 Merge pull request #8 from
manishsoni-dev/codex/build-gate-safe-env`.
- Required pre-edit inspection:
  - `git status --short`: clean before branch creation.
  - `git diff --name-only`: no output before branch creation.
  - `git diff --stat`: no output before branch creation.
  - `git diff --check`: passed before branch creation.
- The cosmic presentation is currently a global fixed canvas from
  `src/app/_components/SharedCosmicBackground.tsx` and
  `src/app/_components/CosmicOrbitEngine.tsx`.
- `src/lib/celestial-registry.ts` currently declares `SUN_ASSET` plus
  `CELESTIAL_BODIES`; the body list contains Mercury, Venus, Earth, Mars,
  Jupiter, Saturn, Uranus, Neptune, and Pluto.
- Existing comments/tests use older astronomical grouping language; P1.0A
  requires "nine celestial bodies" wording instead.
- Current local cosmic assets are WebP files in `public/cosmic`:
  - `sun.webp`: 512x512, 58,062 bytes, alpha yes.
  - `mercury.webp`: 256x256, 10,180 bytes, alpha yes.
  - `venus.webp`: 256x256, 3,602 bytes, alpha yes.
  - `earth.webp`: 256x256, 16,524 bytes, alpha yes.
  - `mars.webp`: 256x256, 4,800 bytes, alpha yes.
  - `jupiter.webp`: 384x384, 11,344 bytes, alpha yes.
  - `saturn.webp`: 512x512, 6,452 bytes, alpha no; visual inspection shows a
    black rectangular background that must be fixed at the asset level.
  - `uranus.webp`: 256x256, 2,480 bytes, alpha yes.
  - `neptune.webp`: 256x256, 3,070 bytes, alpha yes.
  - `pluto.webp`: 128x128, 2,688 bytes, alpha yes.
- `docs/architecture/COSMIC_ASSETS.md` records existing provenance as linked
  Wikimedia Commons/NASA source pages, but no retained high-resolution original
  sources are present in the repo.
- `next.config.ts` currently has no `images` configuration.
- Local Next 16 docs confirm:
  - `sizes` is required for responsive/fill images to avoid oversized delivery.
  - `images.formats` can prefer AVIF and fall back to WebP based on `Accept`.
- Existing tests cover registry count, file existence, canvas mount, low-power
  mode, and pointer inertness. E2E coverage exists in
  `tests/e2e/cosmic-orbit.spec.ts`.
- Existing audio control renders the visible text `Paused`; P1.0A requires a
  polished accessible motion/pause state and no development-looking pause label.

## Scope

- Audit cosmic assets, provenance, dimensions, formats, transparency, and
  payload sizes.
- Improve the typed celestial registry and integrity tests for exactly nine
  symbolic celestial bodies.
- Add AVIF/WebP asset metadata and safe canvas asset selection where supported.
- Fix transparent asset defects at the source asset level.
- Adjust hero/cosmic composition so decorative orbit layers do not cover copy,
  CTAs, navigation, focus states, or controls.
- Add or refine motion pause/reduced-motion accessibility controls.
- Add focused tests and documented viewport/screenshot evidence.
- Update the research decision log.

## Out-Of-Scope Work

- Do not modify authentication, Supabase, Prisma, Pinecone, Inngest, Resend,
  PostHog, Sentry, RAG, API routes, database schema, or P0 security work.
- Do not add provider integrations, hosted LLMs, notification jobs, product
  features, or landing-page copy rewrites beyond accessibility labels.
- Do not use unlicensed, scraped, unclear, or unprovenanced imagery.
- Do not claim an image is 4K unless actual dimensions support that claim.
- Do not mark unknown asset provenance as approved.

## Decisions

- Preserve the central sun and all nine symbolic celestial bodies.
- Use "nine celestial bodies" for product/code/test/documentation language.
- Keep celestial bodies decorative for assistive technology; expose only the
  motion control.
- Prefer asset-level alpha repair over CSS masking.
- Keep the cosmic layer pointer-inert except for the explicit motion control.
- Use existing Playwright tooling for viewport evidence; do not add a new visual
  regression platform.

## Acceptance Criteria

- The central sun remains.
- Exactly nine symbolic celestial bodies remain in the registry and animation
  model.
- Registry tests fail for missing assets, invalid orbit values, missing
  provenance, or an incorrect celestial body count.
- Cosmic assets have documented dimensions, formats, file sizes, alpha support,
  visual role, source/provenance, rights status, replacement requirement, and
  high-density suitability.
- Decorative cosmic layers do not intercept input or visually cover hero copy,
  CTAs, navigation, focus states, or the motion control across required
  viewports.
- Reduced motion stops orbital animation and renders a stable composition.
- Pause/resume control is keyboard-accessible, labeled, and visually polished.
- No individual non-critical delivered celestial asset exceeds 350 KB.
- Desktop initial hero visual payload target remains below 1.5 MB.
- Required validation commands pass or blockers are documented.

## Files Expected To Change

- `docs/development/CURRENT_TASK.md`
- `docs/design/COSMIC_VISUAL_AUDIT.md`
- `docs/research/SHRI_AI_DECISION_LOG.md`
- `docs/architecture/COSMIC_ASSETS.md`
- `next.config.ts`
- `playwright.config.ts`
- `public/cosmic/*`
- `src/app/_components/AudioExperienceProvider.tsx`
- `src/app/_components/CosmicOrbitEngine.tsx`
- `src/app/_components/SharedCosmicBackground.tsx`
- `src/app/globals.css`
- `src/app/page.tsx`
- `src/lib/celestial-registry.ts`
- `tests/*cosmic*`
- `tests/e2e/cosmic-orbit.spec.ts`

## Files That Must Remain Unchanged

- Auth, Supabase, Prisma, Pinecone, Inngest, Resend, PostHog, Sentry, RAG, API
  routes, database schema, and P0 security files unless a test import path
  requires a harmless type-only adjustment.
- Real `.env`, `.env.local`, `.env.production`, and `.env.development` files.

## Tests Required

- Registry has exactly nine symbolic celestial bodies plus the central sun.
- Each celestial body has a stable ID, asset reference, orbit radius, orbit
  duration, initial phase, z-index tier, decorative alt behavior, and provenance.
- All referenced assets exist and meet size/format/transparency expectations.
- Reduced-motion mode disables animation scheduling and renders stable state.
- Pause/resume state works and has accessible labels.
- Decorative orbit layer is pointer-inert and cannot block CTA hit areas.
- Desktop 3840x2160, laptop 1440x900, tablet 768x1024, and mobile 390x844 have
  no horizontal overflow and keep text, CTAs, nav, and motion control usable.

## Verification Commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
git status --short
```

Task-specific:

```bash
npm run e2e -- tests/e2e/cosmic-orbit.spec.ts
```

## Implementation Log

### What Was Implemented

- Rebuilt the celestial registry as a typed manifest for the central sun plus
  exactly nine symbolic celestial bodies.
- Added AVIF derivatives for every cosmic asset and retained WebP fallbacks.
- Repaired `saturn.webp` alpha at the asset level; the black rectangular
  background is no longer decoded as opaque.
- Added `docs/design/COSMIC_VISUAL_AUDIT.md` with asset dimensions, sizes,
  formats, transparency, provenance status, replacement requirements, and
  high-density suitability.
- Enabled Next image AVIF/WebP optimization and removed unoptimized delivery for
  the Shri mark images.
- Added route/viewport-aware cosmic placement, lower mobile density, and a
  text-safe hero layer so decorative bodies do not cover hero copy or CTAs.
- Added an accessible cosmic motion pause/resume control and wired
  `prefers-reduced-motion` into stable, non-animated rendering.
- Replaced the visible ambient audio `Paused` label with `OM off` and compacted
  the audio control on mobile so it does not cover hero CTAs.
- Strengthened unit and Playwright tests for body count, provenance, asset
  integrity, transparency, reduced motion, pause/resume, CTA hit areas, viewport
  overflow, and screenshot evidence.
- Updated `docs/research/SHRI_AI_DECISION_LOG.md` and
  `docs/architecture/COSMIC_ASSETS.md`.

### Files Changed

- `docs/architecture/COSMIC_ASSETS.md`
- `docs/design/COSMIC_VISUAL_AUDIT.md`
- `docs/development/CURRENT_TASK.md`
- `docs/research/SHRI_AI_DECISION_LOG.md`
- `next.config.ts`
- `playwright.config.ts`
- `public/cosmic/*.avif`
- `public/cosmic/saturn.webp`
- `src/app/_components/AudioExperienceProvider.tsx`
- `src/app/_components/CosmicOrbitEngine.tsx`
- `src/app/_components/SharedCosmicBackground.tsx`
- `src/app/_components/devotional-shell.tsx`
- `src/app/globals.css`
- `src/app/page.tsx`
- `src/lib/celestial-registry.ts`
- `tests/cosmic-assets.test.ts`
- `tests/cosmic-orbit.test.tsx`
- `tests/cosmic-registry.test.ts`
- `tests/e2e/cosmic-orbit.spec.ts`

### Decisions Made

- Keep the central sun and exactly nine symbolic celestial bodies.
- Use "nine celestial bodies" wording in new code, tests, docs, and labels.
- Preserve Pluto as the symbolic ninth celestial body while typing it
  astronomically as a dwarf planet.
- Treat the celestial bodies as decorative for assistive technology and expose
  only the motion control.
- Prefer AVIF when supported, fall back to WebP, and keep direct public asset
  loading for the canvas.
- Use Next image optimization for the Shri mark instead of delivering the full
  1.24 MB PNG unoptimized.
- Keep source-linked usage rights as review-required and mark missing retained
  source originals as a blocker for 4K/source-quality claims.

### Tests Run

- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test -- tests/cosmic-registry.test.ts tests/cosmic-assets.test.ts tests/cosmic-orbit.test.tsx tests/CosmicOrbitEngine.test.tsx src/app/_components/AudioExperienceProvider.test.ts`:
  passed, 5 files / 16 tests.
- `npm run test`: passed, 55 files / 284 tests.
- `npm run build`: passed.
- `PLAYWRIGHT_BASE_URL=http://localhost:3001 npm run e2e -- tests/e2e/cosmic-orbit.spec.ts`:
  passed, 6 tests.
- `git diff --check`: passed.
- `git status --short`: showed only intended P1.0A files and new AVIF/audit
  files.

### Checks Passed

- Central sun remains in `SUN_ASSET` and the canvas renderer.
- Exactly nine symbolic celestial bodies remain in `CELESTIAL_BODIES`.
- Registry tests enforce asset references, orbit radius, duration, initial
  phase, z-index tier, decorative alt behavior, and provenance.
- All cosmic assets are under 350 KB; total checked-in WebP payload is 124,070
  bytes, total AVIF payload is 119,470 bytes, combined is 243,540 bytes.
- Playwright screenshots generated:
  - `test-results/cosmic-4k.png` at 3840x2160, 1.1 MB.
  - `test-results/cosmic-laptop.png` at 1440x900, 564 KB.
  - `test-results/cosmic-tablet.png` at 768x1024, 500 KB.
  - `test-results/cosmic-mobile.png` at 390x844, 124 KB.
- Playwright verified no horizontal overflow and clear hit targets for primary
  CTA, secondary CTA, and motion control.
- Playwright verified pause/resume state and reduced-motion state.

### Checks Failed

- No final required checks failed.
- During development, an early Playwright run exposed delayed idle asset loading
  and debug-HUD screenshot contamination; both were fixed before final
  validation.
- Mobile visual inspection exposed the ambient audio control overlapping CTA
  space; it was made compact before final validation.

### Remaining Blockers

- Original high-resolution source files are still not retained outside browser
  delivery in this repo. This is documented as a provenance blocker and prevents
  any 4K/source-quality claim.
- AVIF derivatives were generated from the existing WebP assets. Future asset
  hardening should regenerate browser derivatives from retained source originals.

### Recommended Next Task

- Add retained source-original assets or an external source-original retention
  record, then regenerate cosmic derivatives from those originals.
