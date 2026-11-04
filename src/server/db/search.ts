import { sql, type AnyColumn, type SQL } from "drizzle-orm";
import { escapeLike } from "@/server/services/pins/like";

/**
 * Accent- and case-insensitive "contains" for user-facing search, Turkish
 * aware: "uskudar" finds "Üsküdar", "istanbul" finds "İSTANBUL". Uses the
 * IMMUTABLE f_search_norm() from drizzle/0013 (unaccent + İ/I/ı → i), so
 * trigram indexes on f_search_norm(column) serve it.
 */
export function containsText(column: AnyColumn | SQL, term: string): SQL {
  return sql`f_search_norm(${column}) LIKE '%' || f_search_norm(${escapeLike(term)}) || '%'`;
}
