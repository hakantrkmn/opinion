"use client";

import { useOwnProfile, type UserProfile } from "@/hooks/queries/use-user-profile";
import { apiClient } from "@/lib/api/client";
import type { UserStats } from "@/types";
import { useSession } from "./useSession";

export type { UserProfile };

export function useUserProfile() {
  const { user } = useSession();

  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useOwnProfile(user?.id);

  const updateProfile = (
    updates: Partial<Pick<UserProfile, "display_name" | "avatar_url">>
  ) => {
    if (!profile) return;
    refetch();
    return { ...profile, ...updates };
  };

  const getProfileFromDB = async (): Promise<{
    stats: UserStats;
    success: boolean;
  }> => {
    const result = await apiClient<UserStats>("/api/profile/stats");
    return { stats: result, success: result.error === null };
  };

  return {
    getProfileFromDB,
    profile: profile || null,
    isLoading,
    error,
    updateProfile,
    refetch,
  };
}
