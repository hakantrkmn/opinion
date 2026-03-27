import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as authSchema from "./schema/auth";
import * as appSchema from "./schema/app";

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString);

export const db = drizzle(client, {
  schema: { ...authSchema, ...appSchema },
});

export { sql } from "drizzle-orm";
