import { sql, type AnyColumn, type SQL } from "drizzle-orm";

/** LIKE metacharacters, escaped after normalisation (see containsText). */
const LIKE_META = "([\\\\%_])";
const LIKE_ESCAPED = "\\\\\\1";

/**
 * Accent- and case-insensitive "contains" for user-facing search, Turkish
 * aware: "uskudar" finds "Üsküdar", "istanbul" finds "İSTANBUL". Uses the
 * IMMUTABLE f_search_norm() from drizzle/0013 (unaccent + İ/I/ı → i), so
 * trigram indexes on f_search_norm(column) serve it.
 *
 * The term is normalised first and LIKE-escaped afterwards: unaccent maps
 * e.g. fullwidth "％" to "%", which must stay literal. A term that
 * normalises to nothing (only combining marks) matches nothing.
 */
export function containsText(column: AnyColumn | SQL, term: string): SQL {
  const needle = sql`regexp_replace(f_search_norm(${term}), ${LIKE_META}, ${LIKE_ESCAPED}, 'g')`;
  return sql`(f_search_norm(${term}) <> '' AND f_search_norm(${column}) LIKE '%' || ${needle} || '%')`;
}
