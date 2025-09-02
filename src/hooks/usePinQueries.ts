import { pinQueryKeys } from "@/constants";
import { useSession } from "@/hooks/useSession";
import { HybridCacheManager } from "@/lib/hybrid-cache-manager";
import type { EnhancedComment, MapBounds, Pin } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

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
      return await hybridCache.loadPins(bounds, zoom, forceRefresh);
    },
    [hybridCache]
  );

  // Get pin comments
  const getPinComments = useCallback(
    async (
      pinId: string,
      forceRefresh = false
    ): Promise<EnhancedComment[] | null> => {
      return await hybridCache.getPinComments(pinId, forceRefresh, user);
    },
    [user, hybridCache]
  );

  // Get batch comments for multiple pins
  const getBatchComments = useCallback(
    async (
      pinIds: string[],
      forceRefresh = false
    ): Promise<{ [pinId: string]: EnhancedComment[] } | null> => {
      return await hybridCache.getBatchComments(pinIds, forceRefresh, user);
    },
    [user, hybridCache]
  );

  return {
    pins: allPins,
    loadPins,
    getPinComments,
    getBatchComments,
  };
};
