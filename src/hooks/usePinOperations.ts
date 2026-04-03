import { USER_LOCATION_CIRCLE_RADIUS } from "@/constants";
import { useSession } from "@/hooks/useSession";
import { useCreatePin, useDeletePin } from "@/hooks/mutations/use-pin-mutations";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useMapStore } from "@/store/map-store";
import { locationService } from "@/services/locationService";
import type { Comment, CreatePinData, EnhancedComment, MapBounds, Pin } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import type maplibregl from "maplibre-gl";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface UsePinOperationsProps {
  map: React.MutableRefObject<maplibregl.Map | null>;
}

// Shared enrichment utility
function enrichComments(comments: Comment[], userId?: string): EnhancedComment[] {
  return comments.map((c) => ({
    ...c,
    netScore:
      (c.comment_votes?.filter((v) => v.value === 1).length || 0) -
      (c.comment_votes?.filter((v) => v.value === -1).length || 0),
    likeCount: c.comment_votes?.filter((v) => v.value === 1).length || 0,
    dislikeCount: c.comment_votes?.filter((v) => v.value === -1).length || 0,
    user_vote: c.comment_votes?.find((v) => v.user_id === userId)?.value || 0,
  }));
}

export const usePinOperations = ({ map }: UsePinOperationsProps) => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const createPinMutation = useCreatePin();
  const deletePinMutation = useDeletePin();
  const store = useMapStore();

  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Simple pin state — single source of truth
  const [pins, setPins] = useState<Pin[]>([]);

  // Track last fetched bounds to avoid redundant API calls
  const lastBoundsRef = useRef<string | null>(null);

  // --- Pin Loading ---
  const loadPins = useCallback(
    async (bounds: MapBounds, zoom: number, forceRefresh = false) => {
      // Skip if same bounds (unless force)
      const boundsKey = `${bounds.minLat.toFixed(4)},${bounds.maxLat.toFixed(4)},${bounds.minLng.toFixed(4)},${bounds.maxLng.toFixed(4)},${zoom}`;
      if (!forceRefresh && lastBoundsRef.current === boundsKey) return;
      lastBoundsRef.current = boundsKey;

      const params = new URLSearchParams({
        minLat: String(bounds.minLat),
        maxLat: String(bounds.maxLat),
        minLng: String(bounds.minLng),
        maxLng: String(bounds.maxLng),
      });

      try {
        const data = await apiClient<{ pins: Pin[] }>(`/api/pins?${params}`);
        const newPins = data.pins || [];

        // Merge: add new pins, update existing ones
        setPins((existing) => {
          const map = new Map(existing.map((p) => [p.id, p]));
          for (const pin of newPins) {
            map.set(pin.id, pin);
          }
          return Array.from(map.values());
        });
      } catch (err) {
        console.error("Failed to load pins:", err);
      }
    },
    []
  );

  const loadPinsFromMapWithCache = useCallback(
    (forceRefresh = false) => {
      if (!map.current) return;
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);

      loadingTimeoutRef.current = setTimeout(
        async () => {
          if (!map.current) return;
          const bounds = map.current.getBounds();
          const zoom = Math.floor(map.current.getZoom());

          const latD = bounds.getNorth() - bounds.getSouth();
          const lngD = bounds.getEast() - bounds.getWest();
          await loadPins(
            {
              minLat: bounds.getSouth() - latD * 0.2,
              maxLat: bounds.getNorth() + latD * 0.2,
              minLng: bounds.getWest() - lngD * 0.2,
              maxLng: bounds.getEast() + lngD * 0.2,
            },
            zoom,
            forceRefresh
          );
        },
        forceRefresh ? 0 : 300
      );
    },
    [map, loadPins]
  );

  // --- Comment Fetching (React Query stays for comments) ---
  const getPinComments = useCallback(
    async (pinId: string, forceRefresh = false): Promise<EnhancedComment[] | null> => {
      try {
        const data = await queryClient.fetchQuery({
          queryKey: queryKeys.pins.comments(pinId),
          queryFn: () => apiClient<{ comments: Comment[]; error?: string }>(`/api/pins/${pinId}/comments`),
          staleTime: forceRefresh ? 0 : 2 * 60 * 1000,
        });
        if (data.error === "PIN_AUTO_DELETED") {
          // Remove deleted pin from state
          setPins((prev) => prev.filter((p) => p.id !== pinId));
          return [];
        }
        return enrichComments(data.comments || [], user?.id);
      } catch {
        return null;
      }
    },
    [queryClient, user?.id]
  );

  const getBatchComments = useCallback(
    async (pinIds: string[], forceRefresh = false): Promise<{ [pinId: string]: EnhancedComment[] } | null> => {
      if (!pinIds.length) return {};
      try {
        const data = await queryClient.fetchQuery({
          queryKey: queryKeys.pins.batchComments(pinIds),
          queryFn: () =>
            apiClient<{ comments: { [id: string]: Comment[] } }>("/api/pins/comments/batch", {
              method: "POST",
              body: JSON.stringify({ pinIds }),
            }),
          staleTime: forceRefresh ? 0 : 2 * 60 * 1000,
        });
        const result: { [id: string]: EnhancedComment[] } = {};
        for (const [pid, cmts] of Object.entries(data.comments || {})) {
          result[pid] = enrichComments(cmts, user?.id);
        }
        return result;
      } catch {
        return null;
      }
    },
    [queryClient, user?.id]
  );

  // --- Map Rendering ---
  const clearMapPins = useCallback(() => {
    document.querySelectorAll(".pin-marker").forEach((m) => {
      m.closest(".maplibregl-marker")?.remove();
    });
  }, []);

  // --- Pin Creation ---
  const onLongPress = useCallback(
    async (e: React.SyntheticEvent) => {
      if (!map.current) return;
      const ne = e.nativeEvent as PointerEvent;
      const rect = map.current.getContainer().getBoundingClientRect();
      const lngLat = map.current.unproject([ne.clientX - rect.left, ne.clientY - rect.top]);

      const inCircle = await locationService.isLocationInCircle(lngLat.lat, lngLat.lng);
      if (inCircle === null) { toast.error("User location not available"); return; }
      if (!inCircle) {
        toast.error(`Pin must be within ${USER_LOCATION_CIRCLE_RADIUS}m of your location`);
        return;
      }
      store.setTempPin([lngLat.lng, lngLat.lat]);
      store.setShowPinModal(true);
    },
    [map, store]
  );

  const createPin = useCallback(
    async (data: { pinName: string; comment: string; photo?: File; photoMetadata?: { file_size: number; width?: number; height?: number; format: string } }) => {
      const tp = store.tempPin;
      if (!tp) return;
      try {
        await createPinMutation.mutateAsync({ lat: tp[1], lng: tp[0], pinName: data.pinName, comment: data.comment, photo: data.photo, photoMetadata: data.photoMetadata });
        store.setShowPinModal(false);
        store.setTempPin(null);
        lastBoundsRef.current = null; // Force refetch
        loadPinsFromMapWithCache(true);
      } catch (err) {
        console.error("Pin creation error:", err);
      }
    },
    [store, createPinMutation, loadPinsFromMapWithCache]
  );

  const removePin = useCallback((pinId: string) => {
    setPins((prev) => prev.filter((p) => p.id !== pinId));
  }, []);

  return {
    pins,
    removePin,
    loading: createPinMutation.isPending || deletePinMutation.isPending,
    onLongPress,
    createPin,
    createPinFromData: async (data: CreatePinData) => {
      try {
        const pin = await createPinMutation.mutateAsync(data);
        setPins((prev) => [...prev, pin]);
        return true;
      } catch { return false; }
    },
    deletePin: async (pinId: string) => {
      try {
        await deletePinMutation.mutateAsync(pinId);
        setPins((prev) => prev.filter((p) => p.id !== pinId));
        return true;
      } catch { return false; }
    },
    loadPins,
    loadPinsFromMapWithCache,
    refreshPins: () => {
      lastBoundsRef.current = null;
      loadPinsFromMapWithCache(true);
    },
    clearMapPins,
    getPinComments,
    getBatchComments,
    invalidateCache: () => {
      lastBoundsRef.current = null;
    },
    loadingTimeoutRef,
  };
};
