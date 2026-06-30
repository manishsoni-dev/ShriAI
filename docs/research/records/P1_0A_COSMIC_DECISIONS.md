# P1.0A Cosmic Decisions

These decisions are lane-local during Sprint 1. Do not copy them into the
canonical `docs/research/SHRI_AI_DECISION_LOG.md` until Lane A merges and the
research-log ownership conflict is cleared.

| Field                 | Entry                                                                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Source organization   | Next.js                                                                                                                                      |
| Source title / link   | Local `node_modules/next/dist/docs/03-architecture/accessibility.md`                                                                         |
| Date checked          | 2026-06-30                                                                                                                                   |
| Decision              | Keep the motion control keyboard-accessible and preserve reduced-motion behavior.                                                            |
| Rationale             | The local Next accessibility docs call out route announcement, linting, contrast, and reduced-motion expectations for accessible interfaces. |
| Security/product risk | A decorative motion layer can impair readability or vestibular comfort if pause and reduced-motion behavior regress.                         |
| Validation evidence   | `src/app/_components/SharedCosmicBackground.tsx`, `tests/cosmic-orbit.test.tsx`, and `tests/e2e/cosmic-orbit.spec.ts`.                       |
| Rollback trigger      | Disable animated orbits and force reduced/static mode if the motion control blocks controls or fails keyboard/reduced-motion checks.         |

| Field                 | Entry                                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source organization   | Shri AI                                                                                                                                            |
| Source title / link   | P1.0A centered cosmic landing requirement                                                                                                          |
| Date checked          | 2026-06-30                                                                                                                                         |
| Decision              | Keep the home sun geometrically centered at normalized `0.50 / 0.50` and protect copy with safe-zone layering instead of offsetting the sun.       |
| Rationale             | The product direction requires a centered cosmic system while keeping headline, CTAs, navbar, forms, and focus states visually dominant.           |
| Security/product risk | Moving the sun off center weakens the visual system; letting bodies pass over copy weakens CTA clarity and accessibility.                          |
| Validation evidence   | Canvas `data-cosmic-center-x/y`, `tests/cosmic-orbit.test.tsx`, `tests/e2e/cosmic-orbit.spec.ts`, and `docs/design/P1_0A_COSMIC_LANDING_AUDIT.md`. |
| Rollback trigger      | Revert the centered landing patch if viewport screenshots show celestial bodies obscuring copy or controls.                                        |

| Field                 | Entry                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| Source organization   | Shri AI                                                                                                         |
| Source title / link   | Nine celestial bodies integrity rule                                                                            |
| Date checked          | 2026-06-30                                                                                                      |
| Decision              | Preserve exactly nine celestial bodies in the registry and orbit system; do not remove bodies to solve overlap. |
| Rationale             | The cosmic system is a core symbolic product element and must retain its complete structure.                    |
| Security/product risk | Removing a body can hide layout flaws and break visual/product continuity across docs, tests, and runtime.      |
| Validation evidence   | `src/lib/celestial-registry.ts`, `tests/cosmic-registry.test.ts`, and `tests/cosmic-orbit.test.tsx`.            |
| Rollback trigger      | Block merge if `REQUIRED_CELESTIAL_BODY_COUNT` changes or any body is removed from `CELESTIAL_BODIES`.          |
