import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useQuery } from "@tanstack/react-query";

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

export function useAdminUsers(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: queryKeys.admin.users(page),
    queryFn: async () => {
      return apiClient<PaginatedResponse<unknown>>(
        `/api/admin/users?page=${page}&pageSize=${pageSize}`
      );
    },
  });
}

export function useAdminPins(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: queryKeys.admin.pins(page),
    queryFn: async () => {
      return apiClient<PaginatedResponse<unknown>>(
        `/api/admin/pins?page=${page}&pageSize=${pageSize}`
      );
    },
  });
}

export function useAdminComments(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: queryKeys.admin.comments(page),
    queryFn: async () => {
      return apiClient<PaginatedResponse<unknown>>(
        `/api/admin/comments?page=${page}&pageSize=${pageSize}`
      );
    },
  });
}

export function useAdminAnalytics() {
  return useQuery({
    queryKey: queryKeys.admin.analytics,
    queryFn: async () => {
      return apiClient<Record<string, unknown>>("/api/admin/analytics");
    },
  });
}
