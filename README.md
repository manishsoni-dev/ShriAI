# Shri AI

Initial foundation for a production-grade AI assistant web app built with Next.js, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

## Overview

Shri AI is a full-stack AI assistant foundation with authentication, workspace-aware conversations, provider-isolated model access, usage logging, and a knowledge-base ingestion flow for document search.

## Features

- Email/password authentication with protected routes
- Workspace-backed users and conversations
- OpenAI provider gateway with configurable models
- Usage metadata capture for assistant responses
- Document upload, text extraction, chunking, embeddings, and semantic search
- Prisma/PostgreSQL persistence with local Docker setup

## Stack

- Next.js App Router
- TypeScript strict mode
- Tailwind CSS
- ESLint and Prettier
- Prisma ORM
- PostgreSQL

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create an environment file:

```bash
cp .env.example .env
```

3. Generate an Auth.js secret and set `AUTH_SECRET` in `.env`:

```bash
openssl rand -base64 32
```

4. Start PostgreSQL with Docker:

```bash
docker compose up -d postgres
```

5. Update `DATABASE_URL` in `.env` if you are using a different PostgreSQL database.

Example:

```env
DATABASE_URL="replace-with-postgres-database-url"
```

6. Generate the Prisma client and run the first migration:

```bash
npm run prisma:generate
npm run prisma:migrate
```

7. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` starts the Next.js development server.
- `npm run build` creates a production build.
- `npm run lint` runs ESLint.
- `npm run typecheck` runs TypeScript without emitting files.
- `npm run prisma:migrate` applies Prisma migrations locally.
- `npm run prisma:studio` opens Prisma Studio.
- `npm run format` formats files with Prettier.

## Routes

- `/` landing page.
- `/sign-in` email/password sign-in and first-time account creation.
- `/dashboard` protected placeholder route. Unauthenticated users are redirected to `/sign-in`.

## Authentication

Auth.js is configured in `src/auth.ts`. Supporting user and workspace creation lives under `src/lib/auth` and `src/lib/workspaces.ts` so route components do not own authentication details.

The current local credentials flow creates a `User` record on first sign-in and ensures that user has an owner `Workspace`. Existing users must provide the same password they used when the account was created.

## Conversations

Persistent conversation and message access lives in `src/lib/conversations.ts`.

The exported helpers create, list, read, and delete conversations, plus create and list messages. Every helper accepts a `userId` and checks workspace membership before reading or mutating conversation data, so users cannot access another workspace's conversations through the server-side data layer.

## AI Gateway

Model access is isolated in `src/lib/ai`. UI components should never call provider SDKs directly.

- `src/lib/ai/types.ts` defines the provider interface.
- `src/lib/ai/openai-provider.ts` contains the OpenAI implementation.
- `src/lib/ai/config.ts` centralizes model names from environment variables.
- `src/lib/ai/errors.ts` exposes typed, readable errors.
- `src/lib/ai/README.md` explains how to add another provider.

The chat server action calls the gateway and persists assistant responses with provider, model, request, and usage metadata.

## Knowledge Base

Document upload lives at `/knowledge`. Metadata is stored in the `Document` table and development files are written under `storage/documents`.

Supported upload types are PDF, TXT, Markdown, and DOCX. Storage is isolated behind `src/lib/storage`, where `StorageAdapter` can be implemented for S3, R2, or another object store later without changing the route UI.

Uploaded documents are ingested synchronously for now:

- Text is extracted from TXT, Markdown, PDF, and DOCX files.
- Text is split into overlapping chunks in `src/lib/ingestion/chunking.ts`.
- Chunks are embedded through the AI gateway and stored in Postgres with pgvector.
- Document status moves through `uploaded`, `processing`, `ready`, or `failed`.

Semantic search is available at `/knowledge/search`. It embeds the query, compares it against workspace-scoped chunks, and returns the top matching chunks with document name and score.

## Status

Professional foundation project prepared for public GitHub sharing. It is suitable for local development and portfolio demonstration, with production hardening still expected before live deployment.
