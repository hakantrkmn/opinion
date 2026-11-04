"use client";

import { usePaginatedQuery } from "@/hooks/use-paginated";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { apiSend } from "@/lib/api/send";
import type { NotificationItem, UnreadNotificationsResponse } from "@/types/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/** Badge count: polled every minute while the tab is visible, and on focus. */
export function useUnreadNotificationCount(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.notifications.unread,
    queryFn: ({ signal }) =>
      apiClient<UnreadNotificationsResponse>("/api/notifications/unread-count", { signal }),
    select: (data) => data.unread_count,
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useNotifications(enabled: boolean) {
  return usePaginatedQuery<NotificationItem>({
    queryKey: queryKeys.notifications.list,
    url: "/api/notifications",
    enabled,
    staleTime: 0,
  });
}

/**
 * Marks rows read on the server, then refreshes the badge. `seenUntil` is
 * the newest `updated_at` shown, so a row bumped meanwhile stays unread.
 * The open list keeps its own copy, so rows stay highlighted until the
 * inbox is reopened.
 */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, seenUntil }: { ids: string[]; seenUntil: string }) =>
      apiSend<UnreadNotificationsResponse>("/api/notifications/read", {
        method: "POST",
        json: { ids, seen_until: seenUntil },
      }),
    // A poll in flight could land after this and show the old count.
    onMutate: () => queryClient.cancelQueries({ queryKey: queryKeys.notifications.unread }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread }),
  });
}
