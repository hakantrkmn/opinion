import { USER_LOCATION_CIRCLE_RADIUS } from "@/constants";
import { useSession } from "@/hooks/useSession";
import { useCreatePin, useDeletePin } from "@/hooks/mutations/use-pin-mutations";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useMapStore } from "@/store/map-store";
import { locationService } from "@/services/locationService";
import type { Comment, CreatePinData, EnhancedComment, MapBounds, Pin } from "@/types";
import {
  TileCache,
  boundsToTiles,
  pinTileZoomFor,
  tileKeyForPin,
  tileToBounds,
} from "@/utils/tileCache";
import { useQueryClient } from "@tanstack/react-query";
import type maplibregl from "maplibre-gl";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface UsePinOperationsProps {
  map: React.MutableRefObject<maplibregl.Map | null>;
}

// Low-zoom safety: if viewport covers more than this many z14 tiles, skip fetch.
const MAX_TILES_PER_FETCH = 16;

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

async function fetchTilePins(bounds: MapBounds): Promise<Pin[]> {
  const params = new URLSearchParams({
    minLat: String(bounds.minLat),
    maxLat: String(bounds.maxLat),
    minLng: String(bounds.minLng),
    maxLng: String(bounds.maxLng),
  });
  const data = await apiClient<{ pins: Pin[] }>(`/api/pins?${params}`);
  return data.pins || [];
}

export const usePinOperations = ({ map }: UsePinOperationsProps) => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const createPinMutation = useCreatePin();
  const deletePinMutation = useDeletePin();
  const store = useMapStore();

  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRef = useRef<TileCache>(new TileCache());
  const inFlightRef = useRef<Set<string>>(new Set());

  const [pins, setPins] = useState<Pin[]>([]);

  const syncPinsState = useCallback(() => {
    setPins(cacheRef.current.allPins());
  }, []);

  const loadTiles = useCallback(
    async (forceRefresh = false) => {
      const m = map.current;
      if (!m) return;

      const viewport = m.getBounds();
      const viewportBounds: MapBounds = {
        minLat: viewport.getSouth(),
        maxLat: viewport.getNorth(),
        minLng: viewport.getWest(),
        maxLng: viewport.getEast(),
      };

      const tileZoom = pinTileZoomFor(m.getZoom());
      const tiles = boundsToTiles(viewportBounds, tileZoom, MAX_TILES_PER_FETCH);
      if (tiles.length === 0) return;

      const cache = cacheRef.current;
      if (forceRefresh) {
        for (const t of tiles) cache.delete(t.key);
      } else {
        // Touch cached tiles so LRU keeps them warm.
        for (const t of tiles) cache.get(t.key);
      }

      const missing = tiles.filter((t) => !cache.has(t.key) && !inFlightRef.current.has(t.key));
      if (missing.length === 0) {
        syncPinsState();
        return;
      }

      for (const t of missing) inFlightRef.current.add(t.key);

      const results = await Promise.allSettled(
        missing.map((t) => fetchTilePins(tileToBounds(t.x, t.y, tileZoom)))
      );

      results.forEach((res, i) => {
        const t = missing[i];
        inFlightRef.current.delete(t.key);
        if (res.status === "fulfilled") {
          cache.set(t.key, res.value);
        } else {
          console.error("Failed to load tile", t.key, res.reason);
        }
      });

      syncPinsState();
    },
    [map, syncPinsState]
  );

  const loadPinsFromMapWithCache = useCallback(
    (forceRefresh = false) => {
      if (!map.current) return;
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);

      loadingTimeoutRef.current = setTimeout(
        () => {
          void loadTiles(forceRefresh);
        },
        forceRefresh ? 0 : 300
      );
    },
    [map, loadTiles]
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
          const tileKey = (() => {
            const pin = cacheRef.current.allPins().find((p) => p.id === pinId);
            return pin ? tileKeyForPin(pin) : null;
          })();
          if (tileKey) cacheRef.current.delete(tileKey);
          syncPinsState();
          return [];
        }
        return enrichComments(data.comments || [], user?.id);
      } catch {
        return null;
      }
    },
    [queryClient, user?.id, syncPinsState]
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

  const removeFromCache = useCallback(
    (pinId: string) => {
      cacheRef.current.removePinById(pinId);
      syncPinsState();
    },
    [syncPinsState]
  );

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
        const pin = await createPinMutation.mutateAsync({
          lat: tp[1],
          lng: tp[0],
          pinName: data.pinName,
          comment: data.comment,
          photo: data.photo,
          photoMetadata: data.photoMetadata,
        });
        store.setShowPinModal(false);
        store.setTempPin(null);
        // Invalidate the tile the new pin lives in so the next visit re-fetches it
        // authoritatively (in case another client added pins nearby). Then add the
        // pin optimistically so the user sees it immediately without a refetch.
        cacheRef.current.delete(tileKeyForPin(pin));
        setPins((prev) => [...prev.filter((p) => p.id !== pin.id), pin]);
      } catch (err) {
        console.error("Pin creation error:", err);
      }
    },
    [store, createPinMutation]
  );

  const removePin = useCallback(
    (pinId: string) => {
      removeFromCache(pinId);
    },
    [removeFromCache]
  );

  return {
    pins,
    removePin,
    loading: createPinMutation.isPending || deletePinMutation.isPending,
    onLongPress,
    createPin,
    createPinFromData: async (data: CreatePinData) => {
      try {
        const pin = await createPinMutation.mutateAsync(data);
        cacheRef.current.delete(tileKeyForPin(pin));
        setPins((prev) => [...prev.filter((p) => p.id !== pin.id), pin]);
        return true;
      } catch { return false; }
    },
    deletePin: async (pinId: string) => {
      try {
        await deletePinMutation.mutateAsync(pinId);
        removeFromCache(pinId);
        return true;
      } catch { return false; }
    },
    loadPinsFromMapWithCache,
    refreshPins: () => {
      cacheRef.current.clear();
      setPins([]);
      loadPinsFromMapWithCache(true);
    },
    clearMapPins,
    getPinComments,
    getBatchComments,
    invalidateCache: () => {
      cacheRef.current.clear();
    },
    loadingTimeoutRef,
  };
};
