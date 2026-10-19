/**
 * DESTRUCTIVE: drops the `public` and `drizzle` schemas (all tables, data,
 * functions, extensions installed there) so `db:migrate` can rebuild from
 * 0000. Used by `npm run db:reset` (= reset + migrate + seed).
 * Refuses non-local databases unless --force.
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[db:reset] DATABASE_URL is not set");
  process.exit(1);
}
const host = new URL(url).hostname;
if (
  !process.argv.includes("--force") &&
  (process.env.NODE_ENV === "production" ||
    !["localhost", "127.0.0.1", "::1"].includes(host))
) {
  console.error(
    `[db:reset] refusing to drop schemas on "${host}" (pass --force)`,
  );
  process.exit(1);
}

async function main(databaseUrl: string) {
  const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  try {
    await sql.unsafe(`
    DROP SCHEMA IF EXISTS drizzle CASCADE;
    DROP SCHEMA IF EXISTS tiger CASCADE;
    DROP SCHEMA IF EXISTS tiger_data CASCADE;
    DROP SCHEMA IF EXISTS topology CASCADE;
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO public;
  `);
    console.log("[db:reset] schemas dropped");
  } catch (error) {
    console.error("[db:reset] failed:", error);
    process.exitCode = 1;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

void main(url);
