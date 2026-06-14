# Technical Decisions

## D001: Architecture & Framework

- **Decision**: Use Next.js App Router and Server Actions.
- **Reasoning**: Provides a robust streaming architecture required for progressive AI text delivery and seamless full-stack React integration.

## D002: Vector Database

- **Decision**: PostgreSQL with `pgvector` instead of a standalone vector store (e.g., Pinecone).
- **Reasoning**: Keeps the infrastructure simple, leverages existing relational data integrity via Prisma, and avoids operational overhead of syncing data to a third-party vector store.

## D003: Auth and Ownership

- **Decision**: NextAuth.js with server-side enforced ownership.
- **Reasoning**: Standardizes session handling and aligns seamlessly with Next.js edge and server runtimes.

## D004: Version Pinning

- **Decision**: Pin Node.js to `22.12.0` for local and CI runtime selection via `.node-version`; require Node.js `>=22.12.0` and npm `>=10.0.0` in `package.json`.
- **Reasoning**: Ensures consistent dependency resolution and satisfies current dependency engine requirements, including Next.js and Prisma transitive packages under `engine-strict=true`. Enforced via `.npmrc` and `.node-version`.
