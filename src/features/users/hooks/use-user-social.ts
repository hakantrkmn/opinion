"use client";

import { queryKeys } from "@/lib/api/query-keys";
import type { UserSummary } from "@/types/api";
import type { FollowListUser } from "@/types/userTypes";
import { usePaginatedQuery } from "@/hooks/use-paginated";

export function useFollowers(userId: string | undefined, enabled = true) {
  return usePaginatedQuery<FollowListUser>({
    queryKey: queryKeys.users.followers(userId ?? ""),
    url: `/api/users/${encodeURIComponent(userId ?? "")}/followers`,
    enabled: !!userId && enabled,
  });
}

export function useFollowing(userId: string | undefined, enabled = true) {
  return usePaginatedQuery<FollowListUser>({
    queryKey: queryKeys.users.following(userId ?? ""),
    url: `/api/users/${encodeURIComponent(userId ?? "")}/following`,
    enabled: !!userId && enabled,
  });
}

/** Search by display name; pass an already-debounced query. */
export function useUserSearch(query: string) {
  const q = query.trim();
  return usePaginatedQuery<UserSummary>({
    queryKey: queryKeys.users.search(q),
    url: `/api/users/search?q=${encodeURIComponent(q)}`,
    enabled: q.length >= 2,
    staleTime: 30_000,
  });
}
