# P1.0A Cosmic Landing Audit

Date checked: 2026-06-30  
Branch: `codex/p1-0a-centered-cosmic-landing`

## Scope

This audit covers the landing-page cosmic system only. It does not certify chat,
auth, Supabase, API routes, Prisma, package scripts, or GitHub workflows.

## Centered Cosmic Stage

- The home cosmic stage now renders with `centerXRatio = 0.5` and
  `centerYRatio = 0.5`.
- `CosmicOrbitEngine` writes `data-cosmic-center-x="0.50"` and
  `data-cosmic-center-y="0.50"` onto the canvas during render.
- Tests assert the centered values in unit and Playwright coverage.
- The sun is centered by geometry; the hero copy is protected by contrast and
  safe-zone treatment rather than moving the sun off center.

## Nine Celestial Bodies

The runtime registry still contains exactly nine celestial bodies:

1. Mercury
2. Venus
3. Earth
4. Mars
5. Jupiter
6. Saturn
7. Uranus
8. Neptune
9. Pluto

Pluto remains the symbolic ninth celestial body and is typed as a dwarf planet.
No body was removed or hidden from the registry or orbit system.

## Hero Safe Zones

- The decorative cosmic canvas remains `pointer-events: none`.
- The home backdrop adds a non-interactive safe-zone overlay under hero copy,
  CTA controls, and viewport edges.
- Hero copy keeps an opaque local contrast surface so orbit bodies cannot reduce
  text or CTA contrast.
- Page content and navigation remain in higher stacking layers than the
  decorative background.

## Landing Hierarchy

- `Start Guidance` is the only primary CTA and links to `/chat`.
- Persona exploration is a quieter secondary link.
- The hero copy states that guidance is grounded when sources are available and
  reflective when sources are not, avoiding fabricated citation promises.
- Trust signals focus on grounded guidance, source boundaries, and local-first
  architecture.

## Motion and Accessibility

- Reduced motion still stops orbital animation.
- Manual pause/resume remains keyboard-accessible with `aria-pressed`.
- Visible control text is `Pause`, `Resume`, or `Motion reduced`; the prior
  development-looking paused language is not used.
- The route announcer guidance from the local Next accessibility docs was
  considered by keeping the landing page heading clear and unique.

## Validation Evidence

- `tests/cosmic-orbit.test.tsx` checks centered home geometry and body count.
- `tests/e2e/cosmic-orbit.spec.ts` checks centered geometry, CTA hit targets,
  pointer safety, pause/resume, reduced motion, and viewport screenshots.
- Full verification is recorded in `docs/development/CURRENT_TASK.md`.
