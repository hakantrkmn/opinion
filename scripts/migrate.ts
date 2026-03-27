import postgres from "postgres";
import { readFileSync } from "fs";
import { join } from "path";

const connectionString =
  process.env.DATABASE_URL || "postgresql://opinion:opinion@localhost:5432/opinion";

async function main() {
  const sql = postgres(connectionString, { max: 1 });

  console.log("Running migration...");

  const migrationSql = readFileSync(
    join(process.cwd(), "drizzle", "0000_init.sql"),
    "utf-8"
  );

  await sql.unsafe(migrationSql);

  console.log("Migration complete!");
  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
