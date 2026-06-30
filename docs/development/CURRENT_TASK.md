# Current Task: P1.0A Centered Cosmic System and Professional Landing

## Objective

Keep the central sun geometrically centered, preserve exactly nine celestial
bodies, prevent decorative orbit layers from interfering with hero controls, and
improve landing-page hierarchy without touching chat, auth, API, Prisma, package
scripts, workflows, or P0 work.

## Verified Current Flow

- Worktree: `/Users/manishh/Desktop/ShriAI-cosmic-landing`.
- Branch: `codex/p1-0a-centered-cosmic-landing`.
- Branch was created from `origin/main` at
  `85cad7b Merge pull request #9 from
manishsoni-dev/codex/p1-0a-cosmic-highdpi`.
- Initial `git status --short`: clean.
- Initial baseline checks:
  - `npm run format:check`: first failed before `npm ci` because Prettier was
    not installed in the fresh worktree; passed after `npm ci`.
  - `npm run lint`: first failed before `npm ci`; passed after `npm ci`.
  - `npm run typecheck`: first failed before Prisma Client generation; passed
    after `npm run prisma:generate`.
  - `npm run test`: passed, 55 files / 284 tests.
- Required pre-edit inspection:
  - `git status --short`: clean.
  - `git branch --show-current`: `codex/p1-0a-centered-cosmic-landing`.
  - `git log --oneline -10`: confirms current main includes P0.3B.2,
    source-archive safety, build-gate safe env, and P1.0A high-DPI cosmic work.
  - `git diff --stat`: no output before editing.
  - `git diff`: no output before editing.
- Existing runtime already had a typed central sun plus exactly nine celestial
  bodies in `src/lib/celestial-registry.ts`.
- Existing home cosmic background positioned the sun right of center on desktop
  (`centerXRatio = 0.72`) to avoid the hero copy. This conflicts with the new
  requirement that the sun remain geometrically centered.
- Local Next 16 docs inspected before editing:
  - `node_modules/next/dist/docs/03-architecture/accessibility.md`
  - `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`
  - `node_modules/next/dist/docs/01-app/01-getting-started/12-images.md`

## Scope

- Landing-page cosmic layout and hero hierarchy only.
- Preserve central sun and exactly nine celestial bodies.
- Keep decorative orbit layers pointer-inert.
- Improve pause/resume control labels and reduced-motion support.
- Point Start Guidance at the existing `/chat` route.
- Add lane-local design and decision records.

## Out-Of-Scope Work

- Do not modify `src/app/chat/**`.
- Do not modify Auth.js, Supabase, API routes, Prisma schema, migrations,
  package scripts, or GitHub workflows.
- Do not edit `docs/research/SHRI_AI_DECISION_LOG.md`; Lane A owns the
  canonical research log during Sprint 1.
- Do not remove the sun or any of the nine celestial bodies to solve overlap.

## Decisions

- Keep home cosmic center at normalized `0.50 / 0.50` and expose those values
  as canvas data attributes for tests.
- Use an overlay/safe-zone treatment and stronger hero contrast instead of
  moving the sun off center.
- Keep Start Guidance as the only primary CTA; demote persona exploration to a
  quieter secondary link.
- Keep lane decisions in `docs/research/records/P1_0A_COSMIC_DECISIONS.md`
  until Lane A merges and canonical-log append is allowed.

## Acceptance Criteria

- Central sun stays centered in the home cosmic stage.
- Exactly nine celestial bodies remain in code and documentation.
- Decorative orbit layers use `pointer-events: none`.
- Headline, CTA, navbar, forms, and focus rings remain above decorative orbits.
- Pause/resume control is accessible and no longer reads like a dev artifact.
- Reduced-motion mode remains supported.
- Start Guidance links to the existing `/chat` route.
- No forbidden Lane B files are modified.

## Files Expected To Change

- `docs/development/CURRENT_TASK.md`
- `docs/design/P1_0A_COSMIC_LANDING_AUDIT.md`
- `docs/research/records/P1_0A_COSMIC_DECISIONS.md`
- `src/app/_components/CosmicOrbitEngine.tsx`
- `src/app/_components/SharedCosmicBackground.tsx`
- `src/app/_components/devotional-shell.tsx`
- `src/app/globals.css`
- `src/app/page.tsx`
- `tests/cosmic-orbit.test.tsx`
- `tests/e2e/cosmic-orbit.spec.ts`

## Files That Must Remain Unchanged

- `src/app/chat/**`
- Auth and Supabase files.
- API routes.
- `prisma/**`
- `package.json`
- `.github/workflows/**`
- `docs/research/SHRI_AI_DECISION_LOG.md`

## Tests Required

- Home cosmic center data attributes are `0.50 / 0.50`.
- Exactly nine celestial bodies remain in the registry.
- Decorative canvas and backdrop remain pointer-inert.
- Pause/resume and reduced-motion behavior remain tested.
- Hero primary and secondary controls remain hit-target clear.

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

Fill this section at task completion.

### What Was Implemented

- Centered the home cosmic system at normalized `0.50 / 0.50`.
- Added canvas data attributes for centered geometry so unit and browser tests
  can certify the sun center.
- Kept exactly nine celestial bodies in the registry and orbit tests.
- Added home safe-zone overlay treatment while keeping decorative layers
  pointer-inert.
- Demoted persona exploration to a quieter secondary link and kept Start
  Guidance as the only primary CTA to `/chat`.
- Shortened the visible motion control labels to `Pause`, `Resume`, and
  `Motion reduced` while keeping descriptive ARIA labels.
- Added eager loading to above-fold Shri mark images to avoid dev-overlay LCP
  warnings during browser verification.
- Added lane-local design audit and decision records.

### Files Changed

- `docs/development/CURRENT_TASK.md`
- `docs/design/P1_0A_COSMIC_LANDING_AUDIT.md`
- `docs/research/records/P1_0A_COSMIC_DECISIONS.md`
- `src/app/_components/CosmicOrbitEngine.tsx`
- `src/app/_components/SharedCosmicBackground.tsx`
- `src/app/_components/devotional-shell.tsx`
- `src/app/globals.css`
- `src/app/page.tsx`
- `tests/cosmic-orbit.test.tsx`
- `tests/e2e/cosmic-orbit.spec.ts`

### Decisions Made

- Keep geometry centered and solve readability with layering, opacity, and
  contrast rather than moving the sun off center.
- Keep all nine celestial bodies in the registry and orbit system.
- Use lane-local research records instead of editing the canonical research log
  while Lane A owns it.

### Tests Run

- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test`: passed, 55 files / 285 tests.
- `npm run build`: passed.
- `PLAYWRIGHT_BASE_URL=http://localhost:3011 npm run e2e -- tests/e2e/cosmic-orbit.spec.ts`:
  passed, 6 tests.
- `git diff --check`: passed.

### Checks Passed

- All Lane B required local checks listed above.

### Checks Failed

- Initial fresh-worktree npm checks failed before dependency installation and
  Prisma generation. These were environment setup issues, not source failures.
- First Playwright attempts against port 3000/dev mode failed because they hit a
  stale or dev-overlay-intercepted server. The passing browser run used a
  production server on port 3011 with safe `.env.test` placeholders.

### Remaining Blockers

- Lane B decisions still need to be appended to the canonical research log
  after Lane A merges.
- This turn did not push, stage, commit, or open a PR.

### Recommended Next Task

- Review Lane A and Lane B separately before starting P2.0A, P1.1, or P0.3C.
