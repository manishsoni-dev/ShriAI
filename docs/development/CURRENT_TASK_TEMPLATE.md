# Current Task: <Task Name>

## Objective

Describe the single bounded task in one or two sentences.

## Verified Current Flow

Record the actual current behavior from repository inspection. Include relevant
entry points, server actions, route handlers, data helpers, schemas, and tests.

## Scope

List only the work this task is allowed to change.

## Out-Of-Scope Work

List related work that must not be changed by this task.

## Decisions

Record implementation decisions and defaults chosen for this task.

## Acceptance Criteria

- Verifiable criterion 1.
- Verifiable criterion 2.
- Verifiable criterion 3.

## Files Expected To Change

- `path/to/file`

## Files That Must Remain Unchanged

- `path/to/file`

## Tests Required

- Successful behavior.
- Failure behavior.
- Invalid input.
- Unauthenticated access when relevant.
- Unauthorized access when relevant.
- Cross-user access when relevant.
- Cross-workspace access when relevant.
- Ownership enforcement when relevant.
- Edge cases.
- Database failures when relevant.
- Provider failures when relevant.
- Concurrency when relevant.

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

Add task-specific database, evaluation, E2E, or release commands here when
relevant.

## Implementation Log

Fill this section at task completion.

### What Was Implemented

- Completed work item.

### Files Changed

- `path/to/file`

### Decisions Made

- Decision and reason.

### Tests Run

- `command`: result.

### Checks Passed

- `command`

### Checks Failed

- None, or list failing command and blocker.

### Remaining Blockers

- None, or list concrete blockers.

### Recommended Next Task

Name the next bounded task.
