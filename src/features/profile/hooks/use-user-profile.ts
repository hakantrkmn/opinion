"use client";

import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { PinSummary } from "@/types/api";
import type {
  OwnProfileResponse,
  PublicUserResponse,
  UserCommentItem,
} from "@/types/userTypes";
import { useQuery } from "@tanstack/react-query";
import { usePaginatedQuery } from "@/hooks/use-paginated";

/** GET /api/profile → { profile, stats } (signed-in user). */
export function useOwnProfile(enabled = true, initialData?: OwnProfileResponse) {
  return useQuery({
    queryKey: queryKeys.profile.me,
    queryFn: ({ signal }) =>
      apiClient<OwnProfileResponse>("/api/profile", { signal }),
    enabled,
    initialData,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useOwnProfilePins(enabled = true) {
  return usePaginatedQuery<PinSummary>({
    queryKey: queryKeys.profile.pins,
    url: "/api/profile/pins",
    enabled,
  });
}

export function useOwnProfileComments(enabled = true) {
  return usePaginatedQuery<UserCommentItem>({
    queryKey: queryKeys.profile.comments,
    url: "/api/profile/comments",
    enabled,
  });
}

/** GET /api/users/:id → { user, stats, viewer } */
export function usePublicUser(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.users.profile(userId ?? ""),
    queryFn: ({ signal }) =>
      apiClient<PublicUserResponse>(`/api/users/${encodeURIComponent(userId!)}`, {
        signal,
      }),
    enabled: !!userId,
    staleTime: 60_000,
    retry: (count, error) =>
      count < 1 && (error as { status?: number }).status !== 404,
  });
}

export function usePublicUserPins(userId: string | undefined, enabled = true) {
  return usePaginatedQuery<PinSummary>({
    queryKey: queryKeys.users.pins(userId ?? ""),
    url: `/api/users/${encodeURIComponent(userId ?? "")}/pins`,
    enabled: !!userId && enabled,
  });
}

export function usePublicUserComments(
  userId: string | undefined,
  enabled = true
) {
  return usePaginatedQuery<UserCommentItem>({
    queryKey: queryKeys.users.comments(userId ?? ""),
    url: `/api/users/${encodeURIComponent(userId ?? "")}/comments`,
    enabled: !!userId && enabled,
  });
}
