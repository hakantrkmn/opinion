"use client";

import { queryKeys } from "@/lib/api/query-keys";
import type {
  AdminReportAction,
  SendNotificationRequest,
  SendNotificationResult,
} from "@/types/userTypes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("admin");
  return useMutation({
    mutationFn: (userId: string) =>
      apiSend(`/api/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidateAdminAndContent(queryClient);
      toast.success(t("toast.accountDeleted"));
    },
    onError: (error) => {
      toast.error(t("toast.accountDeleteFailed"), { description: error.message });
    },
  });
}

export function useDeleteAdminPin() {
  const queryClient = useQueryClient();
  const t = useTranslations("admin");
  return useMutation({
    mutationFn: (pinId: string) =>
      apiSend(`/api/admin/pins/${encodeURIComponent(pinId)}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidateAdminAndContent(queryClient);
      toast.success(t("toast.pinDeleted"));
    },
    onError: (error) => {
      toast.error(t("toast.pinDeleteFailed"), { description: error.message });
    },
  });
}

export function useDeleteAdminComment() {
  const queryClient = useQueryClient();
  const t = useTranslations("admin");
  return useMutation({
    mutationFn: (commentId: string) =>
      apiSend<{ pin_deleted: boolean; pin_id: string }>(
        `/api/admin/comments/${encodeURIComponent(commentId)}`,
        { method: "DELETE" }
      ),
    onSuccess: (data) => {
      invalidateAdminAndContent(queryClient);
      toast.success(t("toast.commentDeleted"), {
        description: data.pin_deleted ? t("toast.commentDeletedPinToo") : undefined,
      });
    },
    onError: (error) => {
      toast.error(t("toast.commentDeleteFailed"), { description: error.message });
    },
  });
}

export function useSendNotification() {
  const queryClient = useQueryClient();
  const t = useTranslations("admin");
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
      toast.success(t("toast.notificationSent"), {
        // Strings, so counts are not grouped ("1000", as before).
        description: t("toast.notificationSentDescription", {
          sent: String(data.sent),
          failed: String(data.failed),
          deactivated: data.deactivated,
        }),
      });
    },
    onError: (error) => {
      toast.error(t("toast.notificationFailed"), { description: error.message });
    },
  });
}

const REPORT_MESSAGES = {
  resolve: "toast.reportResolved",
  dismiss: "toast.reportDismissed",
  delete_target: "toast.contentRemoved",
} as const satisfies Record<AdminReportAction, string>;

export function useReportAction() {
  const queryClient = useQueryClient();
  const t = useTranslations("admin");
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
      toast.success(t(REPORT_MESSAGES[variables.action]));
    },
    onError: (error) => {
      toast.error(t("toast.actionFailed"), { description: error.message });
    },
  });
}

export function useRefreshStats() {
  const queryClient = useQueryClient();
  const t = useTranslations("admin");
  return useMutation({
    mutationFn: () =>
      apiSend<{ ok: boolean; duration_ms: number }>("/api/admin/refresh-stats", {
        method: "POST",
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.analytics });
      toast.success(t("toast.statsRecomputed"), {
        description: t("toast.statsTook", { ms: String(data.duration_ms) }),
      });
    },
    onError: (error) => {
      toast.error(t("toast.statsFailed"), { description: error.message });
    },
  });
}
