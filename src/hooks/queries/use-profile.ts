import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Comment, Pin, UserStats } from "@/types";
import { useQuery } from "@tanstack/react-query";

export interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profile.me,
    queryFn: async () => {
      const data = await apiClient<{ profile: UserProfile }>(
        "/api/profile/me"
      );
      return data.profile;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useProfileStats(
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

export function useUserPins(enabled = false) {
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

export function useUserComments(enabled = false) {
  return useQuery({
    queryKey: queryKeys.profile.comments,
    queryFn: async () => {
      const data = await apiClient<{ comments: Comment[] }>(
        "/api/profile/comments"
      );
      return data.comments || [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
