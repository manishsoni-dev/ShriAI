# Deployment Guide

This guide describes how to run Shri AI in a secure, local-first production environment using Docker Compose.

## Prerequisites

- A local machine or private server.
- Docker and Docker Compose installed.
- (Host) Ollama installed and running.

## Local Setup vs Production

- **Local Dev:** Run `npm run dev` and `docker compose -f docker-compose.yml up -d postgres voice` to develop.
- **Production MVP:** Run `docker compose up -d --build`. This starts Postgres, the Next.js standalone app, the Python Voice STT service, and Caddy (reverse proxy).

### 1. Database Migration & Startup

Before running the Next.js app in production, apply migrations:

```bash
# Run migrations using the host node environment before Docker Compose
npx prisma migrate deploy
```

Then start the stack:

```bash
docker compose up -d --build
```

This isolates the database and voice containers in a private internal Docker network. Only Caddy exposes ports `80` and `443`.

The Caddy `Permissions-Policy` allows microphone access only for the app origin
with `microphone=(self)`. Browser recording is still blocked by the Shri AI UI
until the authenticated user grants stored local microphone-processing consent.

### 2. Ollama Configuration

By default, the Next.js container expects Ollama on `http://host.docker.internal:11434`.
Ensure you have the required models:

```bash
ollama pull qwen3:8b
ollama pull qwen3-embedding:0.6b
```

Ensure your host Ollama is listening on the Docker bridge interface (or `0.0.0.0` if strictly internal server).

### 3. HTTPS and Caddy

Caddy automatically generates internal self-signed certificates.
If deploying to a public domain, edit `Caddyfile` and replace `tls internal` with your email address (e.g., `tls admin@yourdomain.com`) to enable automatic Let's Encrypt certificates.

### 4. Backups and Restore

**Backup:**

```bash
docker exec -t shri-ai-postgres pg_dumpall -c -U postgres > backup_`date +%Y-%m-%d`.sql
```

**Restore:**

```bash
cat backup_`date +%Y-%m-%d`.sql | docker exec -i shri-ai-postgres psql -U postgres
```

### 5. Rollbacks

To roll back the code, checkout the previous stable Git commit and rebuild the Next.js container:

```bash
git checkout main
docker compose up -d --build nextjs
```

_Note:_ Rolling back Prisma database schema changes requires reverting the `schema.prisma` file and writing a down-migration manually or restoring from the latest backup.

### 6. Security & Limitations

- **No API Keys:** Shri AI strictly does not require OpenAI or any third-party API keys.
- **Rate Limits & Concurrency:** The Next.js application enforces IP/User rate limits. It also tracks LLM and STT concurrency to avoid starving the host resources.
- **Data Protection:** Next.js uses strict CSP headers. Only Caddy touches the public web.
