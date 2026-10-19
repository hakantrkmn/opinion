"use client";

import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  AdminAnalytics,
  AdminComment,
  AdminNotificationLog,
  AdminPage,
  AdminPin,
  AdminReport,
  AdminReportStatus,
  AdminUser,
} from "@/types/userTypes";
import { useQuery } from "@tanstack/react-query";
import { usePaginatedQuery } from "@/hooks/use-paginated";

export type { AdminReport };
export type AdminReportFilter = AdminReportStatus | "all";

const PAGE = 50;

function withQ(base: string, q: string) {
  const trimmed = q.trim();
  return trimmed ? `${base}?q=${encodeURIComponent(trimmed)}` : base;
}

export function useAdminUsers(q = "", enabled = true) {
  return usePaginatedQuery<AdminUser, AdminPage<AdminUser>>({
    queryKey: queryKeys.admin.users(q.trim()),
    url: withQ("/api/admin/users", q),
    limit: PAGE,
    enabled,
    staleTime: 30_000,
  });
}

export function useAdminPins(q = "", enabled = true) {
  return usePaginatedQuery<AdminPin, AdminPage<AdminPin>>({
    queryKey: queryKeys.admin.pins(q.trim()),
    url: withQ("/api/admin/pins", q),
    limit: PAGE,
    enabled,
    staleTime: 30_000,
  });
}

export function useAdminComments(q = "", enabled = true) {
  return usePaginatedQuery<AdminComment, AdminPage<AdminComment>>({
    queryKey: queryKeys.admin.comments(q.trim()),
    url: withQ("/api/admin/comments", q),
    limit: PAGE,
    enabled,
    staleTime: 30_000,
  });
}

export function useAdminReports(status: AdminReportFilter = "open", enabled = true) {
  return usePaginatedQuery<AdminReport, AdminPage<AdminReport>>({
    queryKey: queryKeys.admin.reports(status),
    url: `/api/admin/reports?status=${status}`,
    limit: PAGE,
    enabled,
    staleTime: 15_000,
  });
}

export function useRecentNotifications(enabled = true) {
  return usePaginatedQuery<AdminNotificationLog, AdminPage<AdminNotificationLog>>({
    queryKey: queryKeys.admin.notifications.recent,
    url: "/api/admin/notifications/recent",
    limit: 20,
    enabled,
    staleTime: 30_000,
  });
}

export function useAdminAnalytics() {
  return useQuery({
    queryKey: queryKeys.admin.analytics,
    queryFn: async ({ signal }) =>
      (await apiClient<{ analytics: AdminAnalytics }>("/api/admin/analytics", { signal }))
        .analytics,
    staleTime: 60_000,
  });
}
