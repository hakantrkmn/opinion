import { useAuth } from "@/contexts/AuthContext";
import { HybridCacheManager } from "@/lib/hybrid-cache-manager";
import { pinService } from "@/lib/supabase/database";
import type { CreatePinData, EnhancedComment, MapBounds, Pin } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";

// Singleton cache instance
const hybridCache = new HybridCacheManager();

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
  // Grid size based on zoom level (larger grid = fewer cache misses)
  const getGridSize = (zoom: number) => {
    if (zoom >= 15) return 0.01; // ~1km grid for high zoom
    if (zoom >= 12) return 0.02; // ~2km grid for medium zoom
    if (zoom >= 10) return 0.05; // ~5km grid for low zoom
    return 0.1; // ~10km grid for very low zoom
  };

  const gridSize = getGridSize(zoom);

  // Snap bounds to grid
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
  addComment: (pinId: string, text: string) => Promise<boolean>;
  editComment: (commentId: string, newText: string) => Promise<boolean>;
  deleteComment: (commentId: string) => Promise<boolean>;
  voteComment: (commentId: string, value: number) => Promise<boolean>;

  // Cache utilities
  invalidateCache: () => void;
  getCacheInfo: () => {
    hybrid: {
      totalPins: number;
      totalTiles: number;
      totalHits: number;
      memoryUsage: number;
    };
    tanstack: {
      totalQueries: number;
      pinQueries: number;
      cacheSize: number;
    };
  };
}

export const usePinsWithHybridCache = (): UsePinsWithHybridCacheReturn => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get pins from main cache
  const { data: allPins = [] } = useQuery({
    queryKey: pinQueryKeys.all,
    queryFn: () => [] as Pin[], // Default empty array
    enabled: false, // Don't auto-fetch, we control loading manually
  });

  // Load pins with hybrid cache strategy
  const loadPins = useCallback(
    async (bounds: MapBounds, zoom: number, forceRefresh = false) => {
      const boundsKey = getBoundsKey(bounds, zoom);

      try {
        const fetchedPins = await queryClient.fetchQuery({
          queryKey: [...pinQueryKeys.bounds(bounds, zoom), boundsKey],
          queryFn: async () => {
            // First try hybrid cache
            if (!forceRefresh) {
              const cachedPins = hybridCache.getPinsForBounds(bounds, zoom);
              if (cachedPins) {
                console.log("🎯 Hybrid cache hit:", cachedPins.length, "pins");
                return cachedPins;
              }
            }

            console.log("💾 Cache miss - fetching from API");
            const { pins, error } = await pinService.getPins(bounds);

            if (error) {
              throw new Error(error);
            }

            const fetchedPins = pins || [];
            console.log("📡 Fetched from API:", fetchedPins.length, "pins");

            // Cache in hybrid cache
            hybridCache.cachePinsFromBounds(bounds, zoom, fetchedPins);

            return fetchedPins;
          },
          staleTime: forceRefresh ? 0 : 5 * 60 * 1000, // 5 minutes unless force refresh
        });

        // Update the main pins cache with fetched data
        queryClient.setQueryData(
          pinQueryKeys.all,
          (oldData: Pin[] | undefined) => {
            if (!oldData) return fetchedPins;

            // Merge with existing pins, avoiding duplicates
            const existingIds = new Set(oldData.map((pin) => pin.id));
            const newPins = fetchedPins.filter(
              (pin) => !existingIds.has(pin.id)
            );

            return [...oldData, ...newPins];
          }
        );

        console.log("✅ Pins loaded and cached:", fetchedPins.length);
      } catch (error) {
        console.error("❌ Failed to load pins:", error);
      }
    },
    [queryClient]
  );

  // Create pin mutation
  const createPinMutation = useMutation({
    mutationFn: async (data: CreatePinData) => {
      const { pin, error } = await pinService.createPin(data);
      if (error) throw new Error(error);
      return pin;
    },
    onSuccess: (newPin) => {
      if (newPin) {
        // Ensure the new pin has correct comment count (should be 1 since we create with initial comment)
        const pinWithCorrectCount = {
          ...newPin,
          comment_count: 1, // Pin is created with initial comment
        };

        // Add to hybrid cache
        hybridCache.cachePin(pinWithCorrectCount);

        // Add to all relevant TanStack Query caches
        queryClient.setQueriesData(
          { queryKey: pinQueryKeys.all },
          (oldData: Pin[] | undefined) => {
            if (!oldData) return [pinWithCorrectCount];
            return [pinWithCorrectCount, ...oldData];
          }
        );

        // Invalidate all bounds queries to force refresh
        queryClient.invalidateQueries({
          queryKey: ["pins", "bounds"],
        });

        // Also clear hybrid cache to force fresh data
        hybridCache.clearAll();

        toast.success("Pin created successfully!");
      }
    },
    onError: (error) => {
      toast.error("Failed to create pin", {
        description: error.message,
      });
    },
  });

  // Delete pin mutation
  const deletePinMutation = useMutation({
    mutationFn: async (pinId: string) => {
      const { success, error } = await pinService.deletePin(pinId);
      if (error) throw new Error(error);
      return success;
    },
    onSuccess: (_, pinId) => {
      // Remove from hybrid cache
      hybridCache.deletePin(pinId);

      // Remove from all TanStack Query caches
      queryClient.setQueriesData(
        { queryKey: pinQueryKeys.all },
        (oldData: Pin[] | undefined) => {
          if (!oldData) return [];
          return oldData.filter((pin) => pin.id !== pinId);
        }
      );

      toast.success("Pin deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete pin", {
        description: error.message,
      });
    },
  });

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
            const { comments, error } = await pinService.getPinComments(pinId);
            if (error) throw new Error(error);
            return comments || [];
          },
          staleTime: forceRefresh ? 0 : 2 * 60 * 1000, // Force fresh data if requested
        });

        // Convert to enhanced comments
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
    [queryClient, user?.id]
  );

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ pinId, text }: { pinId: string; text: string }) => {
      const { comment, error } = await pinService.addComment(pinId, text);
      if (error) throw new Error(error);
      return { comment, pinId };
    },
    onSuccess: ({ comment, pinId }) => {
      if (comment) {
        // Update hybrid cache
        hybridCache.updateCommentCountInCache(pinId, 1);

        // Invalidate comments cache for this pin to force immediate refresh
        queryClient.invalidateQueries({
          queryKey: pinQueryKeys.comments(pinId),
        });

        // Update pin comment count in TanStack Query cache
        queryClient.setQueriesData(
          { queryKey: pinQueryKeys.all },
          (oldData: Pin[] | undefined) => {
            if (!oldData) return [];
            return oldData.map((pin) =>
              pin.id === pinId
                ? { ...pin, comments_count: (pin.comments_count || 0) + 1 }
                : pin
            );
          }
        );

        // Note: No need to invalidate bounds queries, just update the cache data
        // The comment count is already updated above

        toast.success("Comment added successfully!");
      }
    },
    onError: (error) => {
      toast.error("Failed to add comment", {
        description: error.message,
      });
    },
  });

  // Edit comment mutation
  const editCommentMutation = useMutation({
    mutationFn: async ({
      commentId,
      newText,
    }: {
      commentId: string;
      newText: string;
    }) => {
      const { success, error } = await pinService.updateComment(
        commentId,
        newText
      );
      if (error) throw new Error(error);
      return success;
    },
    onSuccess: () => {
      // Invalidate all comment caches
      queryClient.invalidateQueries({
        queryKey: [...pinQueryKeys.all, "comments"],
      });
      toast.success("Comment updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update comment", {
        description: error.message,
      });
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const result = await pinService.deleteCommentWithCleanup(commentId);
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: ({ success, pinDeleted, pinId }) => {
      if (success && pinId) {
        if (pinDeleted) {
          // Remove pin from hybrid cache
          hybridCache.deletePin(pinId);

          // Remove pin from TanStack Query cache
          queryClient.setQueriesData(
            { queryKey: pinQueryKeys.all },
            (oldData: Pin[] | undefined) => {
              if (!oldData) return [];
              return oldData.filter((pin) => pin.id !== pinId);
            }
          );
          toast.success("Pin deleted after removing last comment");
        } else {
          // Update hybrid cache
          hybridCache.updateCommentCountInCache(pinId, -1);

          // Update comment count in TanStack Query cache
          queryClient.setQueriesData(
            { queryKey: pinQueryKeys.all },
            (oldData: Pin[] | undefined) => {
              if (!oldData) return [];
              return oldData.map((pin) =>
                pin.id === pinId
                  ? {
                      ...pin,
                      comments_count: Math.max(
                        0,
                        (pin.comments_count || 1) - 1
                      ),
                    }
                  : pin
              );
            }
          );
          toast.success("Comment deleted successfully!");
        }

        // Invalidate comments cache
        queryClient.invalidateQueries({
          queryKey: pinQueryKeys.comments(pinId),
        });
      }
    },
    onError: (error) => {
      toast.error("Failed to delete comment", {
        description: error.message,
      });
    },
  });

  // Vote comment mutation
  const voteCommentMutation = useMutation({
    mutationFn: async ({
      commentId,
      value,
    }: {
      commentId: string;
      value: number;
    }) => {
      const { success, error } = await pinService.voteComment(commentId, value);
      if (error) throw new Error(error);
      return success;
    },
    onSuccess: () => {
      // Invalidate all comment caches to refresh vote counts
      queryClient.invalidateQueries({
        queryKey: [...pinQueryKeys.all, "comments"],
      });
    },
    onError: (error) => {
      toast.error("Failed to vote on comment", {
        description: error.message,
      });
    },
  });

  // Cache utilities
  const invalidateCache = useCallback(() => {
    hybridCache.clear();
    queryClient.invalidateQueries({ queryKey: pinQueryKeys.all });
  }, [queryClient]);

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
  }, [queryClient]);

  return {
    // State
    pins: allPins,
    loading:
      createPinMutation.isPending ||
      deletePinMutation.isPending ||
      addCommentMutation.isPending ||
      editCommentMutation.isPending ||
      deleteCommentMutation.isPending ||
      voteCommentMutation.isPending,
    error: null,

    // Actions
    loadPins,
    createPin: async (data: CreatePinData) => {
      try {
        await createPinMutation.mutateAsync(data);
        return true;
      } catch {
        return false;
      }
    },
    deletePin: async (pinId: string) => {
      try {
        await deletePinMutation.mutateAsync(pinId);
        return true;
      } catch {
        return false;
      }
    },

    // Comments
    getPinComments,
    addComment: async (pinId: string, text: string) => {
      try {
        await addCommentMutation.mutateAsync({ pinId, text });
        return true;
      } catch {
        return false;
      }
    },
    editComment: async (commentId: string, newText: string) => {
      try {
        await editCommentMutation.mutateAsync({ commentId, newText });
        return true;
      } catch {
        return false;
      }
    },
    deleteComment: async (commentId: string) => {
      try {
        await deleteCommentMutation.mutateAsync(commentId);
        return true;
      } catch {
        return false;
      }
    },
    voteComment: async (commentId: string, value: number) => {
      try {
        await voteCommentMutation.mutateAsync({ commentId, value });
        return true;
      } catch {
        return false;
      }
    },

    // Cache utilities
    invalidateCache,
    getCacheInfo,
  };
};
