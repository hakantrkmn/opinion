import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL || "postgresql://opinion:opinion@localhost:5432/opinion";

async function main() {
  const sql = postgres(connectionString);

  const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
  console.log("Tables:", tables.map((t) => t.tablename));

  const triggers = await sql`SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public' ORDER BY event_object_table`;
  console.log("Triggers:", triggers.map((t) => t.trigger_name + " on " + t.event_object_table));

  const funcs = await sql`SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION' ORDER BY routine_name`;
  console.log("Functions:", funcs.map((f) => f.routine_name));

  await sql.end();
}

main();
