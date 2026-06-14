import { config } from "dotenv";
import pg from "pg";

const REQUIRED_TABLES = [
  "WaitlistLead",
  "Conversation",
  "Message",
  "DocumentChunk",
  "ScriptureSource",
  "ScriptureChunk",
  "ScriptureChunkReview",
  "ScriptureChunkReviewAudit",
  "RetrievalLog",
  "AnswerCitation",
  "ObservabilityEvent",
  "VoiceQaRun",
  "VoiceQaStep",
];

const args = process.argv.slice(2);
const envArg = args.find((arg) => arg.startsWith("--env="));

config({ path: ".env", override: false, quiet: true });
config({ path: ".env.local", override: true, quiet: true });

if (envArg) {
  config({ path: envArg.slice("--env=".length), override: true, quiet: true });
}

const databaseUrlArg = args.find((arg) => arg.startsWith("--database-url="));
const databaseUrl =
  databaseUrlArg?.slice("--database-url=".length) ?? process.env.DATABASE_URL;

function fail(message, details) {
  console.error(`\nDatabase readiness failed: ${message}`);
  if (details) console.error(details);
  process.exit(1);
}

function maskDatabaseUrl(value) {
  try {
    const url = new URL(value);
    if (url.password) url.password = "****";
    if (url.username) url.username = url.username.replace(/./g, "*");
    return url.toString();
  } catch {
    return "unparseable DATABASE_URL";
  }
}

if (!databaseUrl || databaseUrl.includes("replace-with")) {
  fail(
    "DATABASE_URL is missing or still uses the placeholder value.",
    "Pass --env=.env.managed, --database-url=..., or set DATABASE_URL.",
  );
}

const { Client } = pg;
const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();

  const connection = await client.query(
    "SELECT current_database() AS database, current_user AS user, version() AS version",
  );
  const vector = await client.query(
    "SELECT installed_version FROM pg_available_extensions WHERE name = 'vector'",
  );

  const vectorRow = vector.rows[0];
  if (!vectorRow?.installed_version) {
    fail("pgvector extension is not installed or enabled in this database.");
  }

  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
  );
  const tableNames = new Set(tables.rows.map((row) => row.table_name));
  const missingTables = REQUIRED_TABLES.filter(
    (table) => !tableNames.has(table),
  );

  if (missingTables.length > 0) {
    fail(
      "Required tables are missing. Run the Prisma migrations first.",
      `Missing: ${missingTables.join(", ")}`,
    );
  }

  const row = connection.rows[0];
  console.log("Database readiness: OK");
  console.log(`DATABASE_URL: ${maskDatabaseUrl(databaseUrl)}`);
  console.log(`Database: ${row.database}`);
  console.log(`User: ${row.user}`);
  console.log(`Postgres: ${String(row.version).split(",")[0]}`);
  console.log(`pgvector: installed (${vectorRow.installed_version})`);
  console.log(`Tables: ${REQUIRED_TABLES.join(", ")}`);
} catch (error) {
  fail(
    "Could not verify database readiness.",
    error instanceof Error ? error.message : String(error),
  );
} finally {
  await client.end().catch(() => {});
}
