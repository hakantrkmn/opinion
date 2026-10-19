"use client";

import { queryKeys } from "@/lib/api/query-keys";
import type { FollowStatusResponse, PublicUserResponse } from "@/types/userTypes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiSend } from "@/lib/api/send";

/**
 * Follow / unfollow with an optimistic update of the cached public profile
 * (button state + follower count). Rolls back on error.
 */
function useFollowMutation(follow: boolean) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiSend<FollowStatusResponse>(`/api/users/${encodeURIComponent(userId)}/follow`, {
        method: follow ? "POST" : "DELETE",
      }),
    onMutate: async (userId) => {
      const key = queryKeys.users.profile(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PublicUserResponse>(key);
      if (previous && previous.viewer.is_following !== follow) {
        queryClient.setQueryData<PublicUserResponse>(key, {
          ...previous,
          viewer: { ...previous.viewer, is_following: follow },
          stats: {
            ...previous.stats,
            followers_count: Math.max(
              0,
              previous.stats.followers_count + (follow ? 1 : -1)
            ),
          },
        });
      }
      return { previous };
    },
    onError: (error, userId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.users.profile(userId), context.previous);
      }
      toast.error(follow ? "Couldn't follow user" : "Couldn't unfollow user", {
        description: error.message,
      });
    },
    onSettled: (_data, _error, userId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.me });
      // "following" map scope depends on the follow graph.
      void queryClient.invalidateQueries({ queryKey: queryKeys.pins.all });
    },
  });
}

export const useFollowUser = () => useFollowMutation(true);
export const useUnfollowUser = () => useFollowMutation(false);
