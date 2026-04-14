"use client";

import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Comment, OwnUserProfile, Pin, PublicUserProfile, UserStats } from "@/types";
import { useQuery } from "@tanstack/react-query";

export type UserProfile = OwnUserProfile;

export function useOwnProfile(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profile.me,
    queryFn: async () => {
      const data = await apiClient<{ profile: OwnUserProfile }>("/api/profile/me");
      return data.profile;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useOwnProfileStats(
  userId: string | undefined,
  options?: { initialData?: UserStats }
) {
  return useQuery({
    queryKey: queryKeys.profile.stats,
    queryFn: async () => {
      const data = await apiClient<UserStats>("/api/profile/stats");
      return data;
    },
    enabled: !!userId,
    initialData: options?.initialData,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOwnProfilePins(enabled = false) {
  return useQuery({
    queryKey: queryKeys.profile.pins,
    queryFn: async () => {
      const data = await apiClient<{ pins: Pin[] }>("/api/profile/pins");
      return data.pins || [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOwnProfileComments(enabled = false) {
  return useQuery({
    queryKey: queryKeys.profile.comments,
    queryFn: async () => {
      const data = await apiClient<{ comments: Comment[] }>("/api/profile/comments");
      return data.comments || [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.users.profile(userId || ""),
    queryFn: async () => {
      const data = await apiClient<{ profile: PublicUserProfile }>(
        `/api/users/${userId}`
      );
      return data.profile;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicUserStats(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.users.stats(userId || ""),
    queryFn: async () => apiClient<UserStats>(`/api/users/${userId}/stats`),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicUserPins(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.pins(userId || ""),
    queryFn: async () => {
      const data = await apiClient<{ pins: Pin[] }>(`/api/users/${userId}/pins`);
      return data.pins || [];
    },
    enabled: !!userId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicUserComments(
  userId: string | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.users.comments(userId || ""),
    queryFn: async () => {
      const data = await apiClient<{ comments: Comment[] }>(
        `/api/users/${userId}/comments`
      );
      return data.comments || [];
    },
    enabled: !!userId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}
