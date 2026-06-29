const PRODUCTION_HOST_PATTERNS = [
  /prod/i,
  /production/i,
  /staging/i,
  /supabase\.(co|com)$/i,
  /amazonaws\.com$/i,
  /rds\.amazonaws\.com$/i,
  /neon\.tech$/i,
  /railway\.app$/i,
  /render\.com$/i,
  /fly\.dev$/i,
];

const ALLOWED_LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "postgres",
  "host.docker.internal",
]);

function parseDatabaseUrl(value) {
  try {
    return { ok: true, url: new URL(value) };
  } catch {
    return { ok: false, reason: "TEST_DATABASE_URL is not a valid URL." };
  }
}

export function validateTestDatabaseEnvironment(env, options = {}) {
  const required = options.required ?? false;
  const testDatabaseUrl = env.TEST_DATABASE_URL;
  const databaseUrl = env.DATABASE_URL;

  if (!testDatabaseUrl) {
    if (!required) return { ok: true, databaseUrl: null };
    return {
      ok: false,
      reason:
        "TEST_DATABASE_URL is required for database integration checks. Use a disposable local or CI database.",
    };
  }

  const parsed = parseDatabaseUrl(testDatabaseUrl);
  if (!parsed.ok) return parsed;

  const { url } = parsed;
  const hostname = url.hostname.toLowerCase();
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    return {
      ok: false,
      reason: "TEST_DATABASE_URL must use a PostgreSQL connection string.",
    };
  }

  if (
    !ALLOWED_LOCAL_HOSTS.has(hostname) &&
    PRODUCTION_HOST_PATTERNS.some((pattern) => pattern.test(hostname))
  ) {
    return {
      ok: false,
      reason:
        "TEST_DATABASE_URL points at a production-like hostname. Use a disposable local or CI database.",
    };
  }

  if (!/(test|ci|tmp|temp|disposable)/i.test(databaseName)) {
    return {
      ok: false,
      reason:
        "TEST_DATABASE_URL database name must clearly identify a disposable test/CI database.",
    };
  }

  if (databaseUrl && databaseUrl !== testDatabaseUrl) {
    return {
      ok: false,
      reason:
        "DATABASE_URL differs from TEST_DATABASE_URL during test database checks. Refusing to risk production DATABASE_URL usage.",
    };
  }

  return { ok: true, databaseUrl: testDatabaseUrl };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const required = process.argv.includes("--required");
  const result = validateTestDatabaseEnvironment(process.env, { required });

  if (!result.ok) {
    console.error(`Test database preflight failed: ${result.reason}`);
    process.exit(1);
  }

  console.log("Test database preflight passed.");
}
import { fileURLToPath } from "node:url";
