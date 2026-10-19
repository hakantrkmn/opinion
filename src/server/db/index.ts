import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as authSchema from "./schema/auth";
import * as appSchema from "./schema/app";

const connectionString = process.env.DATABASE_URL!;

// Reuse one pool across dev hot reloads instead of leaking a new one per
// module re-evaluation.
const globalForDb = globalThis as unknown as {
  __opinionPg?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__opinionPg ??
  postgres(connectionString, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    // Timestamps are timestamptz; keep the session in UTC so raw-SQL string
    // output is stable ("...+00").
    connection: { TimeZone: "UTC" },
    onnotice: () => {},
  });

if (process.env.NODE_ENV !== "production") globalForDb.__opinionPg = client;

export const db = drizzle(client, {
  schema: { ...authSchema, ...appSchema },
});

export { sql } from "drizzle-orm";
