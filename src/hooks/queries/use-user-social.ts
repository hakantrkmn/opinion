"use client";

import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  FollowListResponse,
  FollowStatusResponse,
  UserSearchResponse,
} from "@/types";
import { useQuery } from "@tanstack/react-query";

export function useFollowStatus(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.followStatus(userId || ""),
    queryFn: async () =>
      apiClient<FollowStatusResponse>(`/api/users/${userId}/follow-status`),
    enabled: !!userId && enabled,
    staleTime: 60 * 1000,
  });
}

export function useFollowers(
  userId: string | undefined,
  page = 1,
  pageSize = 20,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.users.followers(userId || "", page, pageSize),
    queryFn: async () =>
      apiClient<FollowListResponse>(
        `/api/users/${userId}/followers?page=${page}&pageSize=${pageSize}`
      ),
    enabled: !!userId && enabled,
    staleTime: 60 * 1000,
  });
}

export function useFollowing(
  userId: string | undefined,
  page = 1,
  pageSize = 20,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.users.following(userId || "", page, pageSize),
    queryFn: async () =>
      apiClient<FollowListResponse>(
        `/api/users/${userId}/following?page=${page}&pageSize=${pageSize}`
      ),
    enabled: !!userId && enabled,
    staleTime: 60 * 1000,
  });
}

export function useUserSearch(query: string, limit = 10, offset = 0) {
  const trimmedQuery = query.trim();

  return useQuery({
    queryKey: queryKeys.users.search(trimmedQuery, limit, offset),
    queryFn: async () =>
      apiClient<UserSearchResponse>(
        `/api/users/search?q=${encodeURIComponent(trimmedQuery)}&limit=${limit}&offset=${offset}`
      ),
    enabled: trimmedQuery.length >= 2,
    staleTime: 30 * 1000,
  });
}
