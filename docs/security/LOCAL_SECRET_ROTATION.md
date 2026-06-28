# Local Secret Rotation

This project keeps real environment files local and ignored by Git. Do not
commit `.env`, `.env.local`, `.env.production`, database dumps, logs, or shared
archives that contain those files.

## When To Rotate

Rotate local secrets immediately if a workstation, repository archive, support
bundle, screenshot, or chat message may have exposed `.env`, `.env.local`, or
generated deployment output containing environment values.

## Rotation Procedure

1. Create fresh local values:

```bash
openssl rand -base64 32 # AUTH_SECRET
openssl rand -hex 32    # STT_SERVICE_TOKEN
```

2. Replace the affected values in your local `.env` or `.env.local`.
3. Restart the Next.js app and the local voice service so both use the same
   `STT_SERVICE_TOKEN`.
4. Remove any previously shared archives or attachments that contained real
   environment files.
5. If a database URL, database password, or managed deployment secret was
   exposed, rotate it at the database/deployment provider and update only local
   secret stores.
6. Run the tracked-file containment check before sharing the repo again:

```bash
npm run secrets:check
```

## Repository Rules

- `.env.example` may contain only variable names and safe placeholders.
- Real environment files must remain ignored.
- Do not rewrite Git history in this task. If a committed historical secret is
  confirmed, plan a separate maintainer-approved history remediation.
