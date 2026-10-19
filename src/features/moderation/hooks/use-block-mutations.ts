"use client";

import { queryKeys } from "@/lib/api/query-keys";
import type { BlockStatusResponse } from "@/types/userTypes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiSend } from "@/lib/api/send";

function useBlockMutation(block: boolean) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiSend<BlockStatusResponse>(`/api/users/${encodeURIComponent(userId)}/block`, {
        method: block ? "POST" : "DELETE",
      }),
    onSuccess: (_data, userId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.blocks.list });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.me });
      // Blocking hides content everywhere: refresh map + comment caches.
      void queryClient.invalidateQueries({ queryKey: queryKeys.pins.all });
      toast.success(block ? "User blocked" : "User unblocked");
    },
    onError: (error) => {
      toast.error(block ? "Couldn't block user" : "Couldn't unblock user", {
        description: error.message,
      });
    },
  });
}

export const useBlockUser = () => useBlockMutation(true);
export const useUnblockUser = () => useBlockMutation(false);
