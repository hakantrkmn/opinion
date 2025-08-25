import { useAuth } from "@/contexts/AuthContext";
import { getIntegratedStateManager } from "@/lib/integrated-state-manager";
import { pinService } from "@/lib/supabase/database";
import type { CreatePinData, EnhancedComment, MapBounds, Pin } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UsePinsWithIntegratedCacheReturn {
  // State
  pins: Pin[];
  loading: boolean;
  error: string | null;

  // Actions
  createPin: (data: CreatePinData) => Promise<boolean>;
  loadPins: (
    bounds: MapBounds,
    zoom: number
  ) => Promise<
    { pins: Pin[]; error: string | null; fromCache: boolean } | undefined
  >;
  getPinComments: (pinId: string) => Promise<EnhancedComment[] | null>;
  addComment: (pinId: string, text: string) => Promise<boolean>;
  deletePin: (pinId: string) => Promise<boolean>;
  updatePin: (pinId: string, updates: Partial<Pin>) => void;
  editComment: (commentId: string, newText: string) => Promise<boolean>;
  deleteComment: (commentId: string) => Promise<boolean>;
  voteComment: (commentId: string, value: number) => Promise<boolean>;

  // Cache utilities
  clearCache: () => void;
  getCacheStats: () => any;

  // Utilities
  clearError: () => void;
  clearPins: () => void;

  // Optimistic state info
  hasOptimisticUpdates: boolean;
  debugInfo: any;
}

export const usePinsWithIntegratedCache =
  (): UsePinsWithIntegratedCacheReturn => {
    const [pins, setPins] = useState<Pin[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<any>({});

    const { user } = useAuth();
    const integratedManager = useRef(getIntegratedStateManager());
    const optimisticManager = integratedManager.current.getOptimisticManager();

    // Subscribe to optimistic state changes
    useEffect(() => {
      const unsubscribe = optimisticManager.subscribe(() => {
        // Update debug info when optimistic state changes
        setDebugInfo(integratedManager.current.getDebugInfo());
      });

      return unsubscribe;
    }, [optimisticManager]);

    // Calculate if there are any optimistic updates
    const hasOptimisticUpdates =
      optimisticManager.getPendingComments().size > 0 ||
      optimisticManager.getPendingVotes().size > 0;

    // Create pin with cache integration
    const createPin = useCallback(
      async (data: CreatePinData): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
          const { pin, error: pinError } = await pinService.createPin(data);

          if (pinError) {
            setError(pinError);
            return false;
          }

          if (pin) {
            // Add pin to local state
            setPins((prevPins) => [pin, ...prevPins]);

            // Update cache with new pin
            integratedManager.current.createPinWithCache(pin);

            return true;
          }

          return false;
        } catch (err) {
          setError("Pin oluşturulurken beklenmeyen hata oluştu");
          return false;
        } finally {
          setLoading(false);
        }
      },
      []
    );

    // Load pins with integrated cache
    const loadPins = useCallback(async (bounds: MapBounds, zoom: number) => {
      setLoading(true);
      setError(null);

      try {
        // Try to get from cache first
        const cachedPins = await integratedManager.current.loadPinsWithCache(
          bounds,
          zoom
        );

        if (cachedPins.length > 0) {
          console.log("Cache hit - loaded pins from cache:", cachedPins.length);
          setPins(cachedPins);
          setDebugInfo(integratedManager.current.getDebugInfo());
          return { pins: cachedPins, error: null, fromCache: true };
        }

        // Cache miss - fetch from API
        console.log("Cache miss - fetching pins from API");
        const { pins: fetchedPins, error: pinsError } =
          await pinService.getPins(bounds);

        if (pinsError) {
          setError(pinsError);
          return;
        }

        const pinsToReturn = fetchedPins || [];

        // Store in cache for future use
        integratedManager.current.setPinsInCache(bounds, zoom, pinsToReturn);

        console.log("Fetched and cached pins:", pinsToReturn.length);
        setPins(pinsToReturn);
        setDebugInfo(integratedManager.current.getDebugInfo());

        return { pins: pinsToReturn, error: null, fromCache: false };
      } catch (error) {
        console.error("loadPins error:", error);
        setError("Pin'ler yüklenirken hata oluştu");
      } finally {
        setLoading(false);
      }
    }, []);

    // Get pin comments with enhanced optimistic state
    const getPinComments = useCallback(
      async (pinId: string): Promise<EnhancedComment[] | null> => {
        try {
          const { comments, error: commentsError } =
            await pinService.getPinComments(pinId);

          if (commentsError) {
            setError(commentsError);
            return null;
          }

          if (!comments) return null;

          // Convert regular comments to enhanced comments with vote calculations
          const enhancedComments =
            integratedManager.current.getEnhancedComments(comments);

          // Add optimistic comments for this pin
          const optimisticComments =
            integratedManager.current.getOptimisticCommentsForPin(pinId);

          // Combine real and optimistic comments
          return [...enhancedComments, ...optimisticComments];
        } catch (err) {
          setError("Yorumlar yüklenirken beklenmeyen hata oluştu");
          return null;
        }
      },
      []
    );

    // Add comment with integrated cache management
    const addComment = useCallback(
      async (pinId: string, text: string): Promise<boolean> => {
        if (!user) {
          setError("Yorum eklemek için giriş yapmalısınız");
          return false;
        }

        // Get user display name from user metadata or email
        const userDisplayName =
          user.user_metadata?.display_name || user.email || "Anonymous";

        // Add optimistic comment with cache update
        const tempId =
          await integratedManager.current.addCommentWithCacheUpdate(
            pinId,
            text,
            user.id,
            userDisplayName
          );

        // Update pin comment count optimistically in local state
        setPins((prevPins) =>
          prevPins.map((pin) =>
            pin.id === pinId
              ? { ...pin, comments_count: (pin.comments_count || 0) + 1 }
              : pin
          )
        );

        try {
          // Send to backend
          const { comment, error: commentError } = await pinService.addComment(
            pinId,
            text
          );

          if (commentError) {
            console.error("addComment error:", commentError);

            // Rollback optimistic update with cache
            integratedManager.current.rollbackCommentWithCache(tempId, pinId);

            // Rollback pin comment count in local state
            setPins((prevPins) =>
              prevPins.map((pin) =>
                pin.id === pinId
                  ? {
                      ...pin,
                      comments_count: Math.max(
                        (pin.comments_count || 1) - 1,
                        0
                      ),
                    }
                  : pin
              )
            );

            setError(commentError);
            return false;
          }

          if (comment) {
            // Confirm optimistic update with cache
            integratedManager.current.confirmCommentWithCache(tempId, comment);
            return true;
          }

          // Rollback if no comment returned
          integratedManager.current.rollbackCommentWithCache(tempId, pinId);
          setPins((prevPins) =>
            prevPins.map((pin) =>
              pin.id === pinId
                ? {
                    ...pin,
                    comments_count: Math.max((pin.comments_count || 1) - 1, 0),
                  }
                : pin
            )
          );

          return false;
        } catch (err) {
          console.error("addComment error:", err);

          // Rollback optimistic update with cache
          integratedManager.current.rollbackCommentWithCache(tempId, pinId);

          // Rollback pin comment count in local state
          setPins((prevPins) =>
            prevPins.map((pin) =>
              pin.id === pinId
                ? {
                    ...pin,
                    comments_count: Math.max((pin.comments_count || 1) - 1, 0),
                  }
                : pin
            )
          );

          setError("Yorum eklenirken beklenmeyen hata oluştu");
          return false;
        }
      },
      [user]
    );

    // Vote comment with integrated cache management
    const voteComment = useCallback(
      async (commentId: string, value: number): Promise<boolean> => {
        if (!user) {
          setError("Oy vermek için giriş yapmalısınız");
          return false;
        }

        // Check if this is an optimistic comment
        if (optimisticManager.hasPendingComment(commentId)) {
          setError("Henüz kaydedilmemiş yorumlara oy verilemez");
          return false;
        }

        // Apply optimistic vote with cache integration
        integratedManager.current.voteCommentWithCache(
          commentId,
          value,
          user.id
        );

        try {
          // Send to backend
          const { success, error: voteError } = await pinService.voteComment(
            commentId,
            value
          );

          if (voteError) {
            console.error("voteComment error:", voteError);

            // Rollback optimistic vote with cache
            integratedManager.current.rollbackVoteWithCache(commentId, 0);
            setError(voteError);
            return false;
          }

          if (success) {
            // Confirm optimistic vote with cache
            const voteData = {
              commentId,
              likeCount: 0, // These will be recalculated on next comment fetch
              dislikeCount: 0,
              userVote: value,
              netScore: 0,
            };
            integratedManager.current.confirmVoteWithCache(commentId, voteData);
            return true;
          }

          // Rollback if not successful
          integratedManager.current.rollbackVoteWithCache(commentId, 0);
          return false;
        } catch (error) {
          console.error("voteComment error:", error);

          // Rollback optimistic vote with cache
          integratedManager.current.rollbackVoteWithCache(commentId, 0);
          setError("Oy verilirken beklenmeyen hata oluştu");
          return false;
        }
      },
      [user, optimisticManager]
    );

    // Delete pin with cache integration
    const deletePin = useCallback(async (pinId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const { success, error: deleteError } = await pinService.deletePin(
          pinId
        );

        if (deleteError) {
          setError(deleteError);
          return false;
        }

        if (success) {
          // Remove pin from local state
          setPins((prevPins) => prevPins.filter((pin) => pin.id !== pinId));

          // Update cache
          integratedManager.current.deletePinWithCache(pinId);

          return true;
        }

        return false;
      } catch (err) {
        setError("Pin silinirken beklenmeyen hata oluştu");
        return false;
      } finally {
        setLoading(false);
      }
    }, []);

    // Update pin with cache integration
    const updatePin = useCallback((pinId: string, updates: Partial<Pin>) => {
      // Update local state
      setPins((prevPins) =>
        prevPins.map((pin) => (pin.id === pinId ? { ...pin, ...updates } : pin))
      );

      // Update cache
      integratedManager.current.updatePinWithCache(pinId, updates);
    }, []);

    // Edit comment (no optimistic updates for now)
    const editComment = useCallback(
      async (commentId: string, newText: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
          const { success, error: editError } = await pinService.updateComment(
            commentId,
            newText
          );

          if (editError) {
            setError(editError);
            return false;
          }

          return success;
        } catch (error) {
          console.error("editComment error:", error);
          setError("Yorum düzenlenirken hata oluştu");
          return false;
        } finally {
          setLoading(false);
        }
      },
      []
    );

    // Delete comment (no optimistic updates for now)
    const deleteComment = useCallback(
      async (commentId: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
          const { success, error: deleteError } =
            await pinService.deleteComment(commentId);

          if (deleteError) {
            setError(deleteError);
            return false;
          }

          return success;
        } catch (error) {
          console.error("deleteComment error:", error);
          setError("Yorum silinirken hata oluştu");
          return false;
        } finally {
          setLoading(false);
        }
      },
      []
    );

    // Cache utilities
    const clearCache = useCallback(() => {
      integratedManager.current.clearAll();
      setDebugInfo(integratedManager.current.getDebugInfo());
    }, []);

    const getCacheStats = useCallback(() => {
      return integratedManager.current.getDebugInfo();
    }, []);

    // Error and state utilities
    const clearError = useCallback(() => {
      setError(null);
    }, []);

    const clearPins = useCallback(() => {
      setPins([]);
    }, []);

    return {
      // State
      pins,
      loading,
      error,

      // Actions
      createPin,
      loadPins,
      getPinComments,
      addComment,
      deletePin,
      updatePin,
      editComment,
      deleteComment,
      voteComment,

      // Cache utilities
      clearCache,
      getCacheStats,

      // Utilities
      clearError,
      clearPins,

      // Optimistic state info
      hasOptimisticUpdates,
      debugInfo,
    };
  };
