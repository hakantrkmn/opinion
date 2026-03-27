import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Comment, MapBounds, Pin } from "@/types";
import { useQuery } from "@tanstack/react-query";

export function usePins(bounds: MapBounds | null, zoom: number) {
  return useQuery({
    queryKey: bounds ? queryKeys.pins.bounds(bounds, zoom) : queryKeys.pins.all,
    queryFn: async () => {
      if (!bounds) return [];
      const params = new URLSearchParams({
        minLat: String(bounds.minLat),
        maxLat: String(bounds.maxLat),
        minLng: String(bounds.minLng),
        maxLng: String(bounds.maxLng),
      });
      const data = await apiClient<{ pins: Pin[] }>(`/api/pins?${params}`);
      return data.pins || [];
    },
    enabled: !!bounds,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePinComments(pinId: string | null) {
  return useQuery({
    queryKey: queryKeys.pins.comments(pinId || ""),
    queryFn: async () => {
      const data = await apiClient<{ comments: Comment[]; error?: string }>(
        `/api/pins/${pinId}/comments`
      );
      return { comments: data.comments || [], error: data.error || null };
    },
    enabled: !!pinId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useBatchComments(pinIds: string[]) {
  return useQuery({
    queryKey: queryKeys.pins.batchComments(pinIds),
    queryFn: async () => {
      if (pinIds.length === 0) return {};
      const data = await apiClient<{
        comments: { [pinId: string]: Comment[] };
      }>("/api/pins/comments/batch", {
        method: "POST",
        body: JSON.stringify({ pinIds }),
      });
      return data.comments || {};
    },
    enabled: pinIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });
}

export function useHasUserCommented(pinId: string | null) {
  return useQuery({
    queryKey: queryKeys.pins.hasCommented(pinId || ""),
    queryFn: async () => {
      const data = await apiClient<{
        hasCommented: boolean;
        commentId?: string;
      }>(`/api/pins/${pinId}/has-commented`);
      return data;
    },
    enabled: !!pinId,
  });
}
