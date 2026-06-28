# P0.1 Dependency Audit Remediation

## Pre-Remediation High Findings

`npm audit --json` reported two high-severity findings:

- `hono <= 4.12.24` through `prisma -> @prisma/dev -> hono`.
  Production relevance: Prisma is a direct dependency and its transitive dev
  server packages are installed in the project dependency tree. The advisory
  includes a high CORS middleware issue plus related adapter/static-serving
  issues.
- `vite 8.0.0 - 8.0.15` through `vitest -> @vitest/mocker -> vite`.
  Production relevance: dev/test tooling only, but ordinary CI runs install dev
  dependencies and the high audit gate covered the full tree.

`npm audit --omit=dev --json` reported one high-severity finding:

- `hono <= 4.12.24` through `prisma -> @prisma/dev -> hono`.

## Remediation Applied

- Ran `npm update prisma vitest` using npm tooling. This updated Vitest to a
  release using `vite@8.1.0`, clearing the Vite high advisory.
- Added npm overrides for Prisma's vulnerable transitive packages:
  - `hono: ^4.12.25`
  - `@hono/node-server: ^1.19.13`
- Ran `npm install` to update `package-lock.json`.

## Post-Remediation Result

`npm audit --audit-level=high` passes.

Remaining advisories are low/moderate:

- `@babel/core <= 7.29.0`, low, fix available via non-forced npm audit fix.
- `js-yaml <= 4.1.1`, moderate, fix available via non-forced npm audit fix.
- `next -> postcss < 8.5.10`, moderate. npm currently reports a forced
  breaking fix path that would install `next@9.3.3`; that downgrade is not safe
  for this Next 16 app and is out of scope for P0.1.
