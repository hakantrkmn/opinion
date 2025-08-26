"use client";

import { userService } from "@/lib/supabase/userService";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "./useSession";

export interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
}

export function useUserProfile() {
  const { user } = useSession();

  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!user?.id) return null;

      const { profile, error } = await userService.getUserProfile(user.id);
      
      if (error) {
        console.error("Failed to fetch user profile:", error);
        // Return basic profile from auth user if database fetch fails
        return {
          id: user.id,
          email: user.email || "",
          display_name: user.user_metadata?.display_name,
          avatar_url: user.user_metadata?.avatar_url || undefined,
          created_at: user.created_at || new Date().toISOString(),
        };
      }

      // Ensure null avatar_url is converted to undefined for consistency
      if (profile) {
        return {
          ...profile,
          avatar_url: profile.avatar_url || undefined
        };
      }

      return profile;
    },
    enabled: !!user?.id, // Only run if user is logged in
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    retry: 1,
  });

  const updateProfile = (updates: Partial<Pick<UserProfile, 'display_name' | 'avatar_url'>>) => {
    if (!profile) return;

    // Handle null avatar_url by converting to undefined
    const sanitizedUpdates = {
      ...updates,
      avatar_url: updates.avatar_url === null ? undefined : updates.avatar_url
    };

    // Update cache optimistically
    const updatedProfile = { ...profile, ...sanitizedUpdates };
    
    // Update the query cache
    refetch();
    
    return updatedProfile;
  };

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    refetch,
  };
}