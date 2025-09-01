import { useSession } from "@/hooks/useSession";
import { HybridCacheManager } from "@/lib/hybrid-cache-manager";
import { pinService } from "@/lib/supabase/database";
import type { EnhancedComment, MapBounds, Pin } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

// Query keys
export const pinQueryKeys = {
  all: ["pins"] as const,
  bounds: (bounds: MapBounds, zoom: number) =>
    [...pinQueryKeys.all, "bounds", bounds, zoom] as const,
  comments: (pinId: string) =>
    [...pinQueryKeys.all, "comments", pinId] as const,
};

// Generate stable cache key for bounds with grid-based approach
function getBoundsKey(bounds: MapBounds, zoom: number): string {
  const getGridSize = (zoom: number) => {
    if (zoom >= 15) return 0.01;
    if (zoom >= 12) return 0.02;
    if (zoom >= 10) return 0.05;
    return 0.1;
  };

  const gridSize = getGridSize(zoom);
  const gridMinLat = Math.floor(bounds.minLat / gridSize) * gridSize;
  const gridMaxLat = Math.ceil(bounds.maxLat / gridSize) * gridSize;
  const gridMinLng = Math.floor(bounds.minLng / gridSize) * gridSize;
  const gridMaxLng = Math.ceil(bounds.maxLng / gridSize) * gridSize;

  return [
    gridMinLat.toFixed(3),
    gridMaxLat.toFixed(3),
    gridMinLng.toFixed(3),
    gridMaxLng.toFixed(3),
    zoom,
  ].join(",");
}

export const usePinQueries = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const hybridCache = useMemo(
    () => new HybridCacheManager(queryClient),
    [queryClient]
  );

  // Get pins from main cache
  const { data: allPins = [] } = useQuery({
    queryKey: pinQueryKeys.all,
    queryFn: () => [] as Pin[],
    enabled: false,
  });

  // Load pins with hybrid cache strategy
  const loadPins = useCallback(
    async (bounds: MapBounds, zoom: number, forceRefresh = false) => {
      const boundsKey = getBoundsKey(bounds, zoom);

      try {
        const fetchedPins = await queryClient.fetchQuery({
          queryKey: [...pinQueryKeys.bounds(bounds, zoom), boundsKey],
          queryFn: async () => {
            if (!forceRefresh) {
              const cachedPins = hybridCache.getPinsForBounds(bounds, zoom);
              if (cachedPins) {
                console.log("🎯 Hybrid cache hit:", cachedPins.length, "pins");
                return cachedPins;
              }
            }

            console.log("💾 Cache miss - fetching from API");
            const { pins, error } = await pinService.getPins(bounds);
            if (error) throw new Error(error);

            const fetchedPins = pins || [];
            console.log("📡 Fetched from API:", fetchedPins.length, "pins");
            hybridCache.cachePinsFromBounds(bounds, zoom, fetchedPins);
            return fetchedPins;
          },
          staleTime: forceRefresh ? 0 : 10 * 60 * 1000,
        });

        queryClient.setQueryData(
          pinQueryKeys.all,
          (oldData: Pin[] | undefined) => {
            const existingPins = Array.isArray(oldData) ? oldData : [];
            if (existingPins.length === 0) return fetchedPins;

            const existingIds = new Set(existingPins.map((pin) => pin.id));
            const newPins = fetchedPins.filter(
              (pin) => !existingIds.has(pin.id)
            );
            return [...existingPins, ...newPins];
          }
        );

        console.log("✅ Pins loaded and cached:", fetchedPins.length);
      } catch (error) {
        console.error("❌ Failed to load pins:", error);
      }
    },
    [queryClient, hybridCache]
  );

  // Get pin comments
  const getPinComments = useCallback(
    async (
      pinId: string,
      forceRefresh = false
    ): Promise<EnhancedComment[] | null> => {
      try {
        const data = await queryClient.fetchQuery({
          queryKey: pinQueryKeys.comments(pinId),
          queryFn: async () => {
            const { comments, error } = await pinService.getPinComments(
              pinId,
              user || undefined
            );

            if (error === "PIN_AUTO_DELETED") {
              hybridCache.deletePin(pinId);
              queryClient.setQueriesData(
                { queryKey: pinQueryKeys.all },
                (oldData: Pin[] | undefined) => {
                  const existingPins = Array.isArray(oldData) ? oldData : [];
                  return existingPins.filter((pin) => pin.id !== pinId);
                }
              );
              queryClient.invalidateQueries({ queryKey: ["pins", "bounds"] });
              hybridCache.clearAll();
              return [];
            }

            if (error) throw new Error(error);
            return comments || [];
          },
          staleTime: forceRefresh ? 0 : 10 * 60 * 1000,
        });

        return data.map((comment) => ({
          ...comment,
          netScore:
            (comment.comment_votes?.filter((v) => v.value === 1).length || 0) -
            (comment.comment_votes?.filter((v) => v.value === -1).length || 0),
          likeCount:
            comment.comment_votes?.filter((v) => v.value === 1).length || 0,
          dislikeCount:
            comment.comment_votes?.filter((v) => v.value === -1).length || 0,
          user_vote:
            comment.comment_votes?.find((v) => v.user_id === user?.id)?.value ||
            0,
        }));
      } catch (error) {
        console.error("Failed to get pin comments:", error);
        return null;
      }
    },
    [queryClient, user?.id, hybridCache]
  );

  // Get batch comments for multiple pins
  const getBatchComments = useCallback(
    async (
      pinIds: string[],
      forceRefresh = false
    ): Promise<{ [pinId: string]: EnhancedComment[] } | null> => {
      try {
        if (pinIds.length === 0) return {};

        const batchKey = `batch_${pinIds.sort().join("_")}`;
        const data = await queryClient.fetchQuery({
          queryKey: [...pinQueryKeys.all, "batch_comments", batchKey],
          queryFn: async () => {
            console.log("🔄 Fetching batch comments for pins:", pinIds);
            const { comments, error } = await pinService.getBatchComments(
              pinIds,
              user || undefined
            );
            if (error) throw new Error(error);
            return comments || {};
          },
          staleTime: forceRefresh ? 0 : 10 * 60 * 1000,
        });

        const enhancedComments: { [pinId: string]: EnhancedComment[] } = {};
        Object.keys(data).forEach((pinId) => {
          enhancedComments[pinId] = (data[pinId] || []).map((comment) => ({
            ...comment,
            netScore:
              (comment.comment_votes?.filter((v) => v.value === 1).length ||
                0) -
              (comment.comment_votes?.filter((v) => v.value === -1).length ||
                0),
            likeCount:
              comment.comment_votes?.filter((v) => v.value === 1).length || 0,
            dislikeCount:
              comment.comment_votes?.filter((v) => v.value === -1).length || 0,
            user_vote:
              comment.comment_votes?.find((v) => v.user_id === user?.id)
                ?.value || 0,
          }));
        });

        console.log(
          "✅ Batch comments loaded for",
          Object.keys(enhancedComments).length,
          "pins"
        );
        return enhancedComments;
      } catch (error) {
        console.error("Failed to get batch comments:", error);
        return null;
      }
    },
    [queryClient, user?.id]
  );

  return {
    pins: allPins,
    loadPins,
    getPinComments,
    getBatchComments,
  };
};
