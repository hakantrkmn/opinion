"use client";

import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function invalidateUserSocialQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string
) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.users.followStatus(userId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.users.stats(userId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.profile.stats });
  void queryClient.invalidateQueries({ queryKey: queryKeys.users.followers(userId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.users.following(userId) });
}

export function useFollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) =>
      apiClient<{ success: boolean; isFollowing: boolean }>(
        `/api/users/${userId}/follow`,
        { method: "POST" }
      ),
    onSuccess: (_, userId) => {
      invalidateUserSocialQueries(queryClient, userId);
      toast.success("User followed");
    },
    onError: (error) => {
      toast.error("Failed to follow user", { description: error.message });
    },
  });
}

export function useUnfollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) =>
      apiClient<{ success: boolean; isFollowing: boolean }>(
        `/api/users/${userId}/follow`,
        { method: "DELETE" }
      ),
    onSuccess: (_, userId) => {
      invalidateUserSocialQueries(queryClient, userId);
      toast.success("User unfollowed");
    },
    onError: (error) => {
      toast.error("Failed to unfollow user", { description: error.message });
    },
  });
}
