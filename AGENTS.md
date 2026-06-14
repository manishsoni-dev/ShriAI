<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Shri AI Operating Rules

These rules are repository instructions. Follow them before any product,
backend, frontend, data, CI, or documentation task.

## Context Collapse Protection

Do not depend on chat history, prior AI summaries, or agent memory as source of
truth. Repository state overrides all previous reports.

Every bounded task must update `docs/development/CURRENT_TASK.md`.

At task start, record:

- Objective.
- Verified current flow.
- Scope.
- Out-of-scope work.
- Decisions.
- Acceptance criteria.
- Files expected to change.
- Tests required.
- Verification commands.

At task completion, record:

- What was implemented.
- Files changed.
- Decisions made.
- Tests run.
- Checks passed.
- Checks failed.
- Remaining blockers.
- Recommended next task.

Use `docs/development/CURRENT_TASK_TEMPLATE.md` as the required structure.

## Mandatory Inspection Before Editing

Before editing, inspect and compare actual repository state:

```bash
git status --short
git branch --show-current
git log --oneline -10
git diff --stat
git diff
```

Then compare:

- Documented behavior versus actual behavior.
- Requested behavior versus actual behavior.
- Committed code versus uncommitted changes.
- Codex changes versus Antigravity changes when both are present.
- Production paths versus scripts, mocks, and prototypes.
- Existing implementation versus intended architecture.

Do not start implementation until this inspection is reflected in
`docs/development/CURRENT_TASK.md`.

## Scope Discipline

Implement one bounded task at a time. Do not mix roadmap prompts in one
implementation unless a minimal cross-cutting change is required to preserve
security or make required verification pass.

Do not:

- Add unrelated features.
- Perform broad refactors.
- Upgrade unrelated dependencies.
- Redesign UI during a backend task.
- Introduce placeholder logic.
- Add fake success behavior.
- Reformat unrelated files.
- Create speculative abstractions.
- Hide fallback behavior.
- Weaken, skip, or delete tests to pass checks.

Preserve pre-existing uncommitted work. Never revert or overwrite unrelated
dirty files without explicit instruction.

## Engineering Requirements

Work inside the existing architecture. Every implementation must explicitly
address:

- Authentication.
- Authorization.
- Resource ownership.
- Input validation.
- State transitions.
- Database integrity.
- Transactions.
- Concurrency.
- Error handling.
- Logging.
- Auditability.
- Backward compatibility.
- Tests.

Never rely on hidden UI elements or client-supplied identity, permission,
ownership, review state, citation state, model selection, or retrieval policy
for security. The backend must independently enforce every permission.

Prefer explicit contracts, bounded modules, structured errors, deterministic
tests, and truthful reporting. Do not claim more than was verified.

## Shri AI Product Taste

For UI work, preserve Shri AI's product style:

- Sacred but restrained.
- Premium rather than decorative.
- Clear hierarchy.
- Purposeful animation.
- Accessible contrast.
- No cartoonish religious treatment.
- No excessive glow, particles, or visual noise.
- No generic SaaS appearance.

## Completion Criteria

A task is complete only when all required checks pass or remaining failures are
documented as blockers. Do not declare completion while a required check fails.

Minimum verification:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
git status --short
```

When relevant, also run:

```bash
npm run prisma:generate
npx prisma validate
npx prisma migrate status
npm run db:ready
npm run scripture:validate
npm run scripture:eval
npm run release:check
npm run e2e
```

Do not lower thresholds, bypass authorization, weaken validation, or report
false success to obtain a passing result.
