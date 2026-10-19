"use client";

import { queryKeys } from "@/lib/api/query-keys";
import type { BlockedUser } from "@/types/userTypes";
import { usePaginatedQuery } from "@/hooks/use-paginated";

/** Users the signed-in user has blocked. */
export function useBlockedUsers(enabled = true) {
  return usePaginatedQuery<BlockedUser>({
    queryKey: queryKeys.blocks.list,
    url: "/api/blocks",
    limit: 50,
    enabled,
  });
}
