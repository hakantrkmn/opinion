import { pinQueryKeys } from "@/constants";
import { useSession } from "@/hooks/useSession";
import { HybridCacheManager } from "@/lib/hybrid-cache-manager";
import { pinService } from "@/lib/supabase/database";
import type { CreatePinData, EnhancedComment, MapBounds, Pin } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useCommentMutations } from "./useCommentMutations";
import { usePinMutations } from "./usePinMutations";
import { usePinQueries } from "./usePinQueries";

export interface UsePinsWithHybridCacheReturn {
  // State
  pins: Pin[];
  loading: boolean;
  error: string | null;

  // Actions
  loadPins: (bounds: MapBounds, zoom: number, forceRefresh?: boolean) => void;
  createPin: (data: CreatePinData) => Promise<boolean>;
  deletePin: (pinId: string) => Promise<boolean>;

  // Comments
  getPinComments: (
    pinId: string,
    forceRefresh?: boolean
  ) => Promise<EnhancedComment[] | null>;
  getBatchComments: (
    pinIds: string[],
    forceRefresh?: boolean
  ) => Promise<{ [pinId: string]: EnhancedComment[] } | null>;
  addComment: (
    pinId: string,
    text: string,
    photoUrl?: string,
    photoMetadata?: Record<string, unknown>
  ) => Promise<boolean>;
  editComment: (
    commentId: string,
    newText: string,
    photoUrl?: string | null,
    photoMetadata?: Record<string, unknown>
  ) => Promise<boolean>;
  deleteComment: (commentId: string) => Promise<boolean>;
  voteComment: (
    commentId: string,
    value: number,
    pinId: string
  ) => Promise<boolean>;
  hasUserCommented: (pinId: string) => Promise<{
    hasCommented: boolean;
    commentId?: string;
    error: string | null;
  }>;

  // Cache utilities
  invalidateCache: () => void;
  getCacheInfo: () => {
    hybrid: {
      totalPins: number;
      totalTiles: number;
      totalHits: number;
      memoryUsage: number;
    };
    tanstack: { totalQueries: number; pinQueries: number; cacheSize: number };
  };
}

export const usePinsWithHybridCache = (): UsePinsWithHybridCacheReturn => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const hybridCache = useMemo(
    () => new HybridCacheManager(queryClient),
    [queryClient]
  );

  // Custom hooks
  const pinMutations = usePinMutations();
  const commentMutations = useCommentMutations();
  const pinQueries = usePinQueries();

  // Cache utilities
  const invalidateCache = useCallback(() => {
    hybridCache.clear();
    queryClient.invalidateQueries({ queryKey: pinQueryKeys.all });
  }, [queryClient, hybridCache]);

  const getCacheInfo = useCallback(() => {
    const hybridStats = hybridCache.getStats();
    const queryCache = queryClient.getQueryCache();
    const queries = queryCache.getAll();

    return {
      hybrid: hybridStats,
      tanstack: {
        totalQueries: queries.length,
        pinQueries: queries.filter((q) => q.queryKey[0] === "pins").length,
        cacheSize: queries.reduce((size, query) => {
          return (
            size +
            (query.state.data ? JSON.stringify(query.state.data).length : 0)
          );
        }, 0),
      },
    };
  }, [queryClient, hybridCache]);

  return {
    // State
    pins: pinQueries.pins,
    loading: pinMutations.loading,
    error: null,

    // Actions
    loadPins: pinQueries.loadPins,
    createPin: pinMutations.createPin,
    deletePin: pinMutations.deletePin,

    // Comments
    getPinComments: pinQueries.getPinComments,
    getBatchComments: pinQueries.getBatchComments,
    addComment: commentMutations.addComment,
    editComment: commentMutations.editComment,
    deleteComment: commentMutations.deleteComment,
    voteComment: commentMutations.voteComment,
    hasUserCommented: async (pinId: string) => {
      try {
        return await pinService.hasUserCommented(pinId, user || undefined);
      } catch {
        return { hasCommented: false, error: "Failed to check comment status" };
      }
    },

    // Cache utilities
    invalidateCache,
    getCacheInfo,
  };
};
