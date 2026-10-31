import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL || "postgresql://build_user:dummy@localhost:5432/build_dummy";
if (!process.env.DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL not set - using build dummy. Set real DATABASE_URL for migrations.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
});
