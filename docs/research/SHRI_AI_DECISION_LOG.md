# Shri AI Decision Log

This log records external-source-backed engineering decisions for staged
managed-service work. Date checked: 2026-06-29.

## A. Supabase SSR/Auth

| Field                | Entry                                                                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source organization  | Supabase                                                                                                                                             |
| Source title         | Creating a Supabase client for SSR                                                                                                                   |
| Source URL           | https://supabase.com/docs/guides/auth/server-side/creating-a-client                                                                                  |
| Date checked         | 2026-06-29                                                                                                                                           |
| Decision             | Use `@supabase/ssr` cookie-backed clients for server and browser boundaries.                                                                         |
| Rationale            | SSR auth stores session state in cookies, which fits Next.js server routes and avoids browser-only local-storage auth as the server source of truth. |
| Implementation phase | P0.3A/P0.3B staging foundation                                                                                                                       |
| Validation evidence  | `src/lib/supabase/server.ts`, `src/lib/supabase/browser.ts`, `src/lib/supabase/proxy.ts`, and boundary tests.                                        |
| Rollback condition   | Disable Supabase rollout flags and keep legacy Auth.js as the only active sign-in path.                                                              |

| Field                | Entry                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Source organization  | Supabase                                                                                                                                         |
| Source title         | JavaScript: getClaims                                                                                                                            |
| Source URL           | https://supabase.com/docs/reference/javascript/auth-getclaims                                                                                    |
| Date checked         | 2026-06-29                                                                                                                                       |
| Decision             | Validate server-side Supabase identity through verified Supabase Auth APIs before resolving a linked app user.                                   |
| Rationale            | Claims must be verified server-side before the app trusts `sub` as `User.supabaseAuthUserId`; browser-supplied identity fields are not accepted. |
| Implementation phase | P0.3B staging certification                                                                                                                      |
| Validation evidence  | `src/lib/auth/current-actor.ts`, `src/lib/auth/get-authenticated-user.ts`, and `tests/supabase-security.test.ts`.                                |
| Rollback condition   | Treat Supabase sessions as unavailable and fall back only to legacy Auth.js when rollout flags are disabled.                                     |

| Field                | Entry                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Source organization  | Shri AI                                                                                                                                     |
| Source title         | Linked identity model and legacy coexistence                                                                                                |
| Source URL           | Local architecture decision in this repository                                                                                              |
| Date checked         | 2026-06-29                                                                                                                                  |
| Decision             | Store Supabase subject UUID in `User.supabaseAuthUserId`; do not auto-link by email; allow legacy Auth.js during staging.                   |
| Rationale            | Email collision handling prevents account takeover and keeps existing users functional until cutover is certified.                          |
| Implementation phase | P0.3B staging certification                                                                                                                 |
| Validation evidence  | Callback tests cover confirmed signup, idempotence, and legacy-email collision; auth arbitration tests cover legacy fallback and conflicts. |
| Rollback condition   | Clear rollout flags and continue legacy Auth.js authentication only.                                                                        |

## B. Staging Rollout

| Field                | Entry                                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Source organization  | Supabase                                                                                                                                       |
| Source title         | Redirect URLs                                                                                                                                  |
| Source URL           | https://supabase.com/docs/guides/auth/redirect-urls                                                                                            |
| Date checked         | 2026-06-29                                                                                                                                     |
| Decision             | Use exact staging callback URLs and reject app-level arbitrary redirect parameters.                                                            |
| Rationale            | Supabase redirect URL configuration governs email confirmation and reset destinations; Shri AI must keep callback redirects server-controlled. |
| Implementation phase | P0.3B staging certification                                                                                                                    |
| Validation evidence  | `src/app/api/auth/supabase/callback/route.test.ts` checks fixed redirect behavior and arbitrary redirect rejection.                            |
| Rollback condition   | Remove Supabase callback URL from staging allowlist and disable rollout flags.                                                                 |

| Field                | Entry                                                                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Source organization  | Supabase                                                                                                                                 |
| Source title         | General configuration                                                                                                                    |
| Source URL           | https://supabase.com/docs/guides/auth/general-configuration                                                                              |
| Date checked         | 2026-06-29                                                                                                                               |
| Decision             | Keep new-account and linked-sign-in rollout flags disabled by default and use a staging-only Supabase project before production cutover. |
| Rationale            | Confirmed-email behavior and redirect configuration must be validated in staging without exposing production users to a partial cutover. |
| Implementation phase | P0.3B staging certification                                                                                                              |
| Validation evidence  | `src/lib/supabase/rollout.ts`, staging cutover checklist, and route/callback tests.                                                      |
| Rollback condition   | Disable server-side rollout flags; legacy Auth.js remains available.                                                                     |

## C. Future P0.3C Notifications

| Field                | Entry                                                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Source organization  | Supabase                                                                                                                                     |
| Source title         | Email Templates                                                                                                                              |
| Source URL           | https://supabase.com/docs/guides/auth/auth-email-templates                                                                                   |
| Date checked         | 2026-06-29                                                                                                                                   |
| Decision             | Supabase owns confirmation and reset emails through configured SMTP during auth staging.                                                     |
| Rationale            | Confirmation/reset links are part of Supabase Auth flows; Shri AI application email sending is deferred to P0.3C.                            |
| Implementation phase | P0.3B staging certification                                                                                                                  |
| Validation evidence  | Staging checklist requires Supabase Auth-owned SMTP evidence and static tests prevent active auth routes from importing Resend runtime code. |
| Rollback condition   | Disable Supabase rollout flags and revert to legacy Auth.js sign-in.                                                                         |

| Field                | Entry                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Source organization  | Resend                                                                                                                          |
| Source title         | Idempotency Keys                                                                                                                |
| Source URL           | https://resend.com/docs/dashboard/emails/idempotency-keys                                                                       |
| Date checked         | 2026-06-29                                                                                                                      |
| Decision             | In P0.3C, Resend idempotency keys may be a retry safety layer, but the database outbox remains the permanent dedupe authority.  |
| Rationale            | Provider idempotency helps repeated API requests, but durable product-level notification state must live in Shri AI's database. |
| Implementation phase | Future P0.3C                                                                                                                    |
| Validation evidence  | No Resend API email sending exists in P0.3B.2; future outbox tests must prove durable dedupe before activation.                 |
| Rollback condition   | Disable notification worker dispatch and leave unsent outbox rows for inspection/retry.                                         |

| Field                | Entry                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Source organization  | Inngest                                                                                                                        |
| Source title         | Error Handling & Retries in Inngest                                                                                            |
| Source URL           | https://www.inngest.com/docs/guides/error-handling                                                                             |
| Date checked         | 2026-06-29                                                                                                                     |
| Decision             | Future Inngest handlers must be idempotent because background function steps retry.                                            |
| Rationale            | Retry behavior can re-run failed steps; handlers must tolerate repeated delivery without duplicate emails or state corruption. |
| Implementation phase | Future P0.3C                                                                                                                   |
| Validation evidence  | P0.3B.2 does not activate Inngest jobs; future handler tests must prove idempotent replay.                                     |
| Rollback condition   | Disable Inngest event emission and process notification outbox manually.                                                       |

## D. P1.0A Cosmic Visual Fidelity

| Field                | Entry                                                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source organization  | Next.js                                                                                                                                                        |
| Source title         | Image Component and Image Optimization documentation                                                                                                           |
| Source URL           | Local `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`; local `node_modules/next/dist/docs/01-app/01-getting-started/12-images.md` |
| Date checked         | 2026-06-30                                                                                                                                                     |
| Decision             | Enable `images.formats: ["image/avif", "image/webp"]`, keep explicit `sizes`, and remove `unoptimized` from first-viewport Shri mark images.                   |
| Rationale            | The local Next 16 docs state responsive/fill images need `sizes`, and `formats` allows AVIF preference with WebP fallback through the image optimizer.         |
| Implementation phase | P1.0A Cosmic Preservation and High-DPI Visual Fidelity                                                                                                         |
| Validation evidence  | `next.config.ts`, `src/app/page.tsx`, `src/app/_components/devotional-shell.tsx`, `npm run build`, and viewport screenshots.                                   |
| Rollback condition   | Revert `images.formats` and restore prior image delivery if production image optimization causes deployment-specific failures.                                 |

| Field                | Entry                                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Source organization  | Shri AI                                                                                                                                         |
| Source title         | Nine symbolic celestial-body integrity rule                                                                                                     |
| Source URL           | Local product requirement and `docs/development/P1_0_HERO_CLARITY_COSMIC_CONTAINMENT.md`                                                        |
| Date checked         | 2026-06-30                                                                                                                                      |
| Decision             | Preserve the central sun and exactly nine symbolic celestial bodies; use "nine celestial bodies" language across code, tests, docs, and labels. |
| Rationale            | The product requirement treats the cosmic system as symbolic and requires preserving all nine celestial bodies without collapsing the system.   |
| Implementation phase | P1.0A Cosmic Preservation and High-DPI Visual Fidelity                                                                                          |
| Validation evidence  | `src/lib/celestial-registry.ts`, `tests/cosmic-registry.test.ts`, `tests/cosmic-orbit.test.tsx`, and Playwright canvas count checks.            |
| Rollback condition   | Revert the P1.0A branch if any body is removed or the central sun is no longer rendered.                                                        |

| Field                | Entry                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Source organization  | NASA and Wikimedia Commons                                                                                                                             |
| Source title         | Linked celestial source pages and NASA media-usage guidance                                                                                            |
| Source URL           | Registry source pages in `src/lib/celestial-registry.ts`; NASA Images and Media Guidelines at https://www.nasa.gov/nasa-brand-center/images-and-media/ |
| Date checked         | 2026-06-30                                                                                                                                             |
| Decision             | Keep current local assets only with source-linked review status; mark missing retained high-resolution originals as a blocker for any 4K claim.        |
| Rationale            | The repo has linked source pages but not retained source originals, so redistribution and high-DPI claims require an explicit future source audit.     |
| Implementation phase | P1.0A Cosmic Preservation and High-DPI Visual Fidelity                                                                                                 |
| Validation evidence  | `docs/design/COSMIC_VISUAL_AUDIT.md`, `docs/architecture/COSMIC_ASSETS.md`, and registry provenance metadata.                                          |
| Rollback condition   | Replace or remove any asset whose source page or NASA/Wikimedia status cannot be verified for project use.                                             |

| Field                | Entry                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Source organization  | Shri AI                                                                                                                                          |
| Source title         | Reduced-motion and pause behavior                                                                                                                |
| Source URL           | Local accessibility requirement in P1.0A brief                                                                                                   |
| Date checked         | 2026-06-30                                                                                                                                       |
| Decision             | Stop orbital animation immediately when `prefers-reduced-motion` is enabled and expose a keyboard-accessible pause/resume motion control.        |
| Rationale            | The cosmic layer is decorative; users who request reduced motion or manually pause motion should receive a stable centered composition.          |
| Implementation phase | P1.0A Cosmic Preservation and High-DPI Visual Fidelity                                                                                           |
| Validation evidence  | `src/app/_components/SharedCosmicBackground.tsx`, `src/app/_components/CosmicOrbitEngine.tsx`, unit tests, and Playwright reduced-motion checks. |
| Rollback condition   | Hide the motion control and force reduced/static mode if the control creates usability or accessibility regressions.                             |

| Field                | Entry                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Source organization  | Shri AI                                                                                                                   |
| Source title         | Cosmic performance budgets                                                                                                |
| Source URL           | Local P1.0A requirement and `docs/design/COSMIC_VISUAL_AUDIT.md`                                                          |
| Date checked         | 2026-06-30                                                                                                                |
| Decision             | Keep each non-critical celestial asset below 350 KB and keep initial hero visual payload target below 1.5 MB on desktop.  |
| Rationale            | The cosmic system must remain decorative and performant, especially on mobile and low-power devices.                      |
| Implementation phase | P1.0A Cosmic Preservation and High-DPI Visual Fidelity                                                                    |
| Validation evidence  | `tests/cosmic-assets.test.ts`, asset byte counts in `docs/design/COSMIC_VISUAL_AUDIT.md`, and Playwright viewport checks. |
| Rollback condition   | Revert new derivatives or reduce opacity/density further if payload or interaction budgets regress.                       |
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
