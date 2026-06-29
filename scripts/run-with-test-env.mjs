import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";

const envFile = path.resolve(process.cwd(), ".env.test");
const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  console.error(
    "Usage: node scripts/run-with-test-env.mjs <command> [args...]",
  );
  process.exit(2);
}

if (!existsSync(envFile)) {
  console.error(".env.test is required for explicit CI/test placeholder mode.");
  process.exit(1);
}

const result = config({ path: envFile, override: false, quiet: true });

if (result.error) {
  console.error(`Could not load .env.test: ${result.error.message}`);
  process.exit(1);
}

const child = spawn(command, args, {
  env: process.env,
  shell: process.platform === "win32",
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Command terminated by signal ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
