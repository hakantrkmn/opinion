"use client";

import { apiClient } from "@/lib/api/client";
import type { Paginated } from "@/types/api";
import { useInfiniteQuery, type QueryKey } from "@tanstack/react-query";
import { useMemo } from "react";

/**
 * Infinite list over an offset-paginated endpoint returning `Paginated<T>`
 * (or an extension of it, e.g. AdminPage). `items` is the flattened list.
 */
export function usePaginatedQuery<T, P extends Paginated<T> = Paginated<T>>({
  queryKey,
  url,
  limit = 20,
  enabled = true,
  staleTime = 60_000,
}: {
  queryKey: QueryKey;
  /** Endpoint URL, may already contain a query string. */
  url: string;
  limit?: number;
  enabled?: boolean;
  staleTime?: number;
}) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) => {
      const sep = url.includes("?") ? "&" : "?";
      return apiClient<P>(`${url}${sep}limit=${limit}&offset=${pageParam}`, {
        signal,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (last) => last.next_offset ?? undefined,
    enabled,
    staleTime,
  });

  const items = useMemo(() => {
    const seen = new Set<unknown>();
    const out: T[] = [];
    for (const page of query.data?.pages ?? []) {
      for (const item of page.items) {
        const id = (item as { id?: unknown }).id;
        if (id !== undefined) {
          if (seen.has(id)) continue;
          seen.add(id);
        }
        out.push(item);
      }
    }
    return out;
  }, [query.data]);

  const firstPage = query.data?.pages[0];
  return { ...query, items, firstPage };
}
