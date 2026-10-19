import { z } from "zod";
import type { Paginated } from "@/types/api";

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 50;

/** `?limit=&offset=` query schema shared by every list endpoint. */
export function offsetPaginationSchema(
  defaultLimit = DEFAULT_PAGE_LIMIT,
  maxLimit = MAX_PAGE_LIMIT
) {
  return z.object({
    limit: z.coerce.number().int().min(1).max(maxLimit).default(defaultLimit),
    offset: z.coerce.number().int().min(0).max(100_000).default(0),
  });
}

export type OffsetPagination = { limit: number; offset: number };

/**
 * Build a `Paginated<T>` from rows fetched with `LIMIT limit + 1` — the
 * extra row only signals that another page exists and is dropped.
 */
export function toPaginated<T>(
  rows: T[],
  { limit, offset }: OffsetPagination
): Paginated<T> {
  const hasMore = rows.length > limit;
  return {
    items: hasMore ? rows.slice(0, limit) : rows,
    has_more: hasMore,
    next_offset: hasMore ? offset + limit : null,
  };
}
