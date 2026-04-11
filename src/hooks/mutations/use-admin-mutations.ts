import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function invalidateAdminAndContent(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["admin"] });
  queryClient.invalidateQueries({ queryKey: queryKeys.admin.analytics });
  queryClient.invalidateQueries({ queryKey: queryKeys.pins.all });
  queryClient.invalidateQueries({ queryKey: ["pins"] });
  queryClient.invalidateQueries({ queryKey: queryKeys.profile.pins });
  queryClient.invalidateQueries({ queryKey: queryKeys.profile.comments });
  queryClient.invalidateQueries({ queryKey: queryKeys.profile.stats });
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      return apiClient(`/api/admin/users/${userId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      invalidateAdminAndContent(queryClient);
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
      invalidateAdminAndContent(queryClient);
      toast.success("Pin deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete pin", { description: error.message });
    },
  });
}

interface DeleteAdminCommentResponse {
  success: boolean;
  pinDeleted?: boolean;
  pinId?: string | null;
}

export function useDeleteAdminComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string): Promise<DeleteAdminCommentResponse> => {
      return apiClient<DeleteAdminCommentResponse>(
        `/api/admin/comments/${commentId}`,
        { method: "DELETE" }
      );
    },
    onSuccess: (data) => {
      invalidateAdminAndContent(queryClient);
      if (data?.pinDeleted) {
        toast.success("Comment deleted", {
          description: "Pin removed — last comment was cleared.",
        });
      } else {
        toast.success("Comment deleted");
      }
    },
    onError: (error) => {
      toast.error("Failed to delete comment", { description: error.message });
    },
  });
}

export interface SendNotificationInput {
  target: { type: "user"; userId: string } | { type: "all" };
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface SendNotificationResult {
  sent: number;
  failed: number;
  deactivated: number;
  recipientCount: number;
}

export function useSendNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SendNotificationInput): Promise<SendNotificationResult> => {
      return apiClient<SendNotificationResult>("/api/admin/notifications/send", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.notifications.recent });
      const desc = `Sent ${data.sent}, failed ${data.failed}${
        data.deactivated > 0 ? `, ${data.deactivated} stale token(s) cleaned` : ""
      }`;
      toast.success("Notification dispatched", { description: desc });
    },
    onError: (error) => {
      toast.error("Failed to send notification", { description: error.message });
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
