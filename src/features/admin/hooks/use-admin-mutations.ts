"use client";

import { queryKeys } from "@/lib/api/query-keys";
import type {
  AdminReportAction,
  SendNotificationRequest,
  SendNotificationResult,
} from "@/types/userTypes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiSend } from "@/lib/api/send";

function invalidateAdminAndContent(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.pins.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiSend(`/api/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidateAdminAndContent(queryClient);
      toast.success("Account deleted");
    },
    onError: (error) => {
      toast.error("Couldn't delete account", { description: error.message });
    },
  });
}

export function useDeleteAdminPin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pinId: string) =>
      apiSend(`/api/admin/pins/${encodeURIComponent(pinId)}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidateAdminAndContent(queryClient);
      toast.success("Pin deleted");
    },
    onError: (error) => {
      toast.error("Couldn't delete pin", { description: error.message });
    },
  });
}

export function useDeleteAdminComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) =>
      apiSend<{ pin_deleted: boolean; pin_id: string }>(
        `/api/admin/comments/${encodeURIComponent(commentId)}`,
        { method: "DELETE" }
      ),
    onSuccess: (data) => {
      invalidateAdminAndContent(queryClient);
      toast.success("Comment deleted", {
        description: data.pin_deleted
          ? "The pin was removed too — it had no comments left."
          : undefined,
      });
    },
    onError: (error) => {
      toast.error("Couldn't delete comment", { description: error.message });
    },
  });
}

export function useSendNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendNotificationRequest) =>
      apiSend<SendNotificationResult>("/api/admin/notifications/send", {
        method: "POST",
        json: input,
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.notifications.recent,
      });
      toast.success("Notification sent", {
        description: `Sent ${data.sent}, failed ${data.failed}${
          data.deactivated > 0 ? `, ${data.deactivated} stale device(s) removed` : ""
        }`,
      });
    },
    onError: (error) => {
      toast.error("Couldn't send notification", { description: error.message });
    },
  });
}

const REPORT_MESSAGES: Record<AdminReportAction, string> = {
  resolve: "Report resolved",
  dismiss: "Report dismissed",
  delete_target: "Content removed",
};

export function useReportAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reportId: string; action: AdminReportAction }) =>
      apiSend(`/api/admin/reports/${encodeURIComponent(input.reportId)}`, {
        method: "PATCH",
        json: { action: input.action },
      }),
    onSuccess: (_data, variables) => {
      if (variables.action === "delete_target") {
        invalidateAdminAndContent(queryClient);
      } else {
        void queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
        void queryClient.invalidateQueries({ queryKey: queryKeys.admin.analytics });
      }
      toast.success(REPORT_MESSAGES[variables.action]);
    },
    onError: (error) => {
      toast.error("Action failed", { description: error.message });
    },
  });
}

export function useRefreshStats() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiSend<{ ok: boolean; duration_ms: number }>("/api/admin/refresh-stats", {
        method: "POST",
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.analytics });
      toast.success("Statistics recomputed", {
        description: `Took ${data.duration_ms} ms`,
      });
    },
    onError: (error) => {
      toast.error("Couldn't recompute statistics", { description: error.message });
    },
  });
}
