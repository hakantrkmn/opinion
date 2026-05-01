"use client";

import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useBlockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) =>
      apiClient<{ ok: boolean }>("/api/blocks", {
        method: "POST",
        body: JSON.stringify({ blockedId: userId }),
      }),
    onSuccess: (_, userId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.blocks.list });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.followStatus(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.stats(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.followers(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.following(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.stats });
      void queryClient.invalidateQueries({ queryKey: queryKeys.pins.all });
      toast.success("User blocked");
    },
    onError: (error) => {
      toast.error("Failed to block user", { description: error.message });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) =>
      apiClient<{ ok: boolean }>(
        `/api/blocks?blockedId=${encodeURIComponent(userId)}`,
        { method: "DELETE" }
      ),
    onSuccess: (_, userId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.blocks.list });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.followStatus(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.stats(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.pins.all });
      toast.success("User unblocked");
    },
    onError: (error) => {
      toast.error("Failed to unblock user", { description: error.message });
    },
  });
}
