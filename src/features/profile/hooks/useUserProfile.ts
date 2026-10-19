"use client";

import { useOwnProfile } from "@/features/profile/hooks/use-user-profile";
import type { OwnUserProfile } from "@/types/userTypes";
import { useSession } from "@/features/auth/hooks/useSession";

export type UserProfile = OwnUserProfile;

/** Signed-in user's profile + stats (null while signed out). */
export function useUserProfile() {
  const { user } = useSession();
  const query = useOwnProfile(!!user);

  return {
    profile: user ? (query.data?.profile ?? null) : null,
    stats: user ? (query.data?.stats ?? null) : null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
