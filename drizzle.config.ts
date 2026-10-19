import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema/*",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // The postgis/postgis image also ships tiger/topology schemas and the
  // spatial_ref_sys table; keep drizzle-kit (push/pull/check) out of them.
  schemaFilter: ["public"],
  extensionsFilters: ["postgis"],
});
