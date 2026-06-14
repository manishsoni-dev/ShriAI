import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env", override: false, quiet: true });
config({ path: ".env.local", override: true, quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
