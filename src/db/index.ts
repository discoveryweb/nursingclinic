import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL || "postgresql://build_user:dummy@localhost:5432/build_dummy";

if (!process.env.DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL not set - using build dummy placeholder. Runtime requires real DATABASE_URL for database operations.");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    max: Math.min(20, Math.max(2, Number(process.env.DB_POOL_MAX) || 8)),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
    statement_timeout: 15_000,
    idle_in_transaction_session_timeout: 15_000,
    application_name: "aramash-care-platform",
  });

if (process.env.NODE_ENV !== "production") {
  pool.on("error", () => console.error("PostgreSQL pool connection error"));
}

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
