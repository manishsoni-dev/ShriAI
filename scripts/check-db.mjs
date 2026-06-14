import { existsSync } from "node:fs";
import { createRequire } from "node:module";

import { config } from "dotenv";
import pg from "pg";

config({ path: ".env", override: false, quiet: true });
config({ path: ".env.local", override: true, quiet: true });

const { Client } = pg;
const require = createRequire(import.meta.url);

function fail(message, details) {
  console.error(`\nDatabase check failed: ${message}`);

  if (details) {
    console.error(details);
  }

  process.exit(1);
}

function maskDatabaseUrl(value) {
  try {
    const url = new URL(value);

    if (url.password) {
      url.password = "****";
    }

    if (url.username) {
      url.username = url.username.replace(/./g, "*");
    }

    return url.toString();
  } catch {
    return "unparseable DATABASE_URL";
  }
}

function formatConnectionError(error) {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const details = [
    error.message,
    "code" in error ? `code: ${error.code}` : null,
    "errno" in error ? `errno: ${error.errno}` : null,
    "syscall" in error ? `syscall: ${error.syscall}` : null,
    "address" in error ? `address: ${error.address}` : null,
    "port" in error ? `port: ${error.port}` : null,
  ].filter(Boolean);

  return details.length > 0 ? details.join("\n") : error.name;
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || databaseUrl.includes("replace-with")) {
  fail(
    "DATABASE_URL is missing or still uses the placeholder value.",
    "Set DATABASE_URL in .env.local or .env before running Prisma commands.",
  );
}

try {
  require.resolve("@prisma/client");
  require("@prisma/client");
} catch (error) {
  fail(
    "Prisma Client is not generated.",
    `Run npm run prisma:generate first.\n${error instanceof Error ? error.message : String(error)}`,
  );
}

const generatedClientPath = "node_modules/.prisma/client/index.js";

if (!existsSync(generatedClientPath)) {
  fail(
    "Prisma generated client files are missing.",
    "Run npm run prisma:generate first.",
  );
}

const client = new Client({
  connectionString: databaseUrl,
});

try {
  await client.connect();

  const connection = await client.query(
    "SELECT current_database() AS database, current_user AS user, version() AS version",
  );
  const vector = await client.query(
    "SELECT installed_version, default_version FROM pg_available_extensions WHERE name = 'vector'",
  );
  const row = connection.rows[0];
  const vectorRow = vector.rows[0];

  console.log("Database check passed.");
  console.log(`DATABASE_URL: ${maskDatabaseUrl(databaseUrl)}`);
  console.log(`Database: ${row.database}`);
  console.log(`User: ${row.user}`);
  console.log(`Postgres: ${String(row.version).split(",")[0]}`);
  console.log("Prisma Client: generated");

  if (!vectorRow) {
    console.warn(
      "Warning: pgvector is not available on this Postgres server. The existing migrations include CREATE EXTENSION vector and will fail until pgvector is installed/enabled.",
    );
  } else if (!vectorRow.installed_version) {
    console.warn(
      `Warning: pgvector is available but not installed in this database. Migrations should install it with CREATE EXTENSION vector if the database user has permission. Available version: ${vectorRow.default_version}.`,
    );
  } else {
    console.log(`pgvector: installed (${vectorRow.installed_version})`);
  }
} catch (error) {
  fail("Could not connect to the database.", formatConnectionError(error));
} finally {
  await client.end().catch(() => {});
}
