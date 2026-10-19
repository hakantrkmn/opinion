// Production-safe migrator: only needs runtime deps (drizzle-orm, postgres).
// Applies every pending migration in ./drizzle (journal order) inside a
// transaction and records it in drizzle.__drizzle_migrations, exactly like
// `drizzle-kit migrate` does.
//
//   node scripts/migrate.mjs            (DATABASE_URL from the environment)
//   npm run db:migrate                  (also loads .env when present)
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL is not set");
  process.exit(1);
}

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), "..", "drizzle");
const client = postgres(url, { max: 1, onnotice: () => {} });

try {
  const started = Date.now();
  await migrate(drizzle(client), { migrationsFolder });
  console.log(`[migrate] database is up to date (${Date.now() - started} ms)`);
} catch (error) {
  console.error("[migrate] migration failed:", error);
  process.exitCode = 1;
} finally {
  await client.end({ timeout: 5 });
}
