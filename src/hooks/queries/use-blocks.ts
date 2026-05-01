"use client";

import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { BlockedUser } from "@/types";
import { useQuery } from "@tanstack/react-query";

export function useBlockedUsers(enabled = true) {
  return useQuery({
    queryKey: queryKeys.blocks.list,
    queryFn: async () => {
      const data = await apiClient<{ data: BlockedUser[] }>("/api/blocks");
      return data.data ?? [];
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useIsUserBlocked(userId: string | undefined) {
  const query = useBlockedUsers(!!userId);
  const blocked = query.data?.some((u) => u.id === userId) ?? false;
  return { isBlocked: blocked, isLoading: query.isLoading };
}
