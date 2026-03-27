import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      return apiClient(`/api/admin/users/${userId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.analytics });
      toast.success("User deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete user", { description: error.message });
    },
  });
}

export function useDeleteAdminPin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pinId: string) => {
      return apiClient(`/api/admin/pins/${pinId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "pins"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.analytics });
      toast.success("Pin deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete pin", { description: error.message });
    },
  });
}

export function useDeleteAdminComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      return apiClient(`/api/admin/comments/${commentId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "comments"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.analytics });
      toast.success("Comment deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete comment", { description: error.message });
    },
  });
}

export function useRefreshStats() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return apiClient("/api/admin/refresh-stats", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.analytics });
      toast.success("Statistics refreshed");
    },
    onError: (error) => {
      toast.error("Failed to refresh stats", { description: error.message });
    },
  });
}
