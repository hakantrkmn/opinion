"use client";

import { queryKeys } from "@/lib/api/query-keys";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPin } from "../lib/api";
import { findCachedPin } from "../lib/cache";

/** Pin summary by id; renders instantly from map caches when available. */
export function usePin(pinId: string | null) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.pins.detail(pinId ?? ""),
    queryFn: ({ signal }) => fetchPin(pinId!, signal),
    enabled: !!pinId,
    staleTime: 60_000,
    initialData: () => {
      const cached = pinId ? findCachedPin(queryClient, pinId) : undefined;
      return cached ? { pin: cached.pin } : undefined;
    },
    initialDataUpdatedAt: () =>
      pinId ? findCachedPin(queryClient, pinId)?.updatedAt : undefined,
    select: (data) => data.pin,
  });
}
