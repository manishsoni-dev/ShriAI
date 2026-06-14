import { config } from "dotenv";
import pg from "pg";

config({ path: ".env", override: false, quiet: true });
config({ path: ".env.local", override: true, quiet: true });

const { Client } = pg;

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.includes("replace-with")) {
    console.error(
      "DATABASE_URL is missing or still uses the placeholder value.",
    );
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();

    // Check pgvector
    const vector = await client.query(
      "SELECT installed_version FROM pg_available_extensions WHERE name = 'vector'",
    );
    const vectorRow = vector.rows[0];

    if (!vectorRow || !vectorRow.installed_version) {
      console.error(
        "Database check failed: pgvector extension is not installed or enabled in this database.",
      );
      process.exit(1);
    }
    console.log(`pgvector: installed (${vectorRow.installed_version})`);

    // Check required tables (e.g., ScriptureSource, ScriptureChunk)
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const tableNames = tables.rows.map((r) => r.table_name);

    if (
      !tableNames.includes("ScriptureSource") ||
      !tableNames.includes("ScriptureChunk")
    ) {
      console.error(
        "Database check failed: required tables (ScriptureSource, ScriptureChunk) are missing. Please run migrations.",
      );
      process.exit(1);
    }

    console.log(
      "Database capabilities: OK. Connection, pgvector, and required tables are ready.",
    );
  } catch (error) {
    console.error("Could not connect to the database.", error);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

run();
