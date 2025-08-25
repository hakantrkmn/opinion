import { useAuth } from "@/contexts/AuthContext";
import { pinService } from "@/lib/supabase/database";
import type { CreatePinData, EnhancedComment, MapBounds, Pin } from "@/types";
import { useCallback, useState } from "react";
import { useOptimisticState } from "./useOptimisticState";

export interface UsePinsWithOptimisticReturn {
  // State
  pins: Pin[];
  loading: boolean;
  error: string | null;

  // Actions
  createPin: (data: CreatePinData) => Promise<boolean>;
  loadPins: (
    bounds: MapBounds
  ) => Promise<{ pins: Pin[]; error: string | null } | undefined>;
  getPinComments: (pinId: string) => Promise<EnhancedComment[] | null>;
  addComment: (pinId: string, text: string) => Promise<boolean>;
  deletePin: (pinId: string) => Promise<boolean>;
  updatePin: (pinId: string, updates: Partial<Pin>) => void;
  editComment: (commentId: string, newText: string) => Promise<boolean>;
  deleteComment: (commentId: string) => Promise<boolean>;
  voteComment: (commentId: string, value: number) => Promise<boolean>;

  // Utilities
  clearError: () => void;
  clearPins: () => void;

  // Optimistic state info
  hasOptimisticUpdates: boolean;
}

export const usePinsWithOptimistic = (): UsePinsWithOptimisticReturn => {
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const optimisticState = useOptimisticState();

  // Calculate if there are any optimistic updates
  const hasOptimisticUpdates =
    optimisticState.getPendingComments().size > 0 ||
    optimisticState.getPendingVotes().size > 0;

  // Pin oluştur
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
          // Yeni pin'i listeye ekle
          setPins((prevPins) => [pin, ...prevPins]);
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

  // Pin'leri yükle (harita alanına göre)
  const loadPins = useCallback(async (bounds: MapBounds) => {
    setLoading(true);
    setError(null);

    try {
      const { pins: fetchedPins, error: pinsError } = await pinService.getPins(
        bounds
      );

      if (pinsError) {
        setError(pinsError);
        return;
      }

      console.log("Fetched pins:", fetchedPins?.length);
      setPins(fetchedPins || []);
      return { pins: fetchedPins || [], error: null };
    } catch (error) {
      console.error("loadPins error:", error);
      setError("Pin'ler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, []);

  // Pin'in yorumlarını getir (enhanced with optimistic updates)
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
        const enhancedComments: EnhancedComment[] = comments.map((comment) => {
          const voteCounts = optimisticState.calculateVoteCounts(comment);

          return {
            ...comment,
            netScore: voteCounts.netScore,
            likeCount: voteCounts.likeCount,
            dislikeCount: voteCounts.dislikeCount,
            user_vote: voteCounts.userVote,
            isOptimistic: false,
          };
        });

        // Add optimistic comments for this pin
        const pendingComments = optimisticState.getPendingComments();
        const optimisticCommentsForPin: EnhancedComment[] = [];

        for (const [tempId, pendingComment] of pendingComments) {
          if (pendingComment.pinId === pinId) {
            const optimisticComment = optimisticState.createOptimisticComment(
              tempId,
              pendingComment.pinId,
              pendingComment.text,
              pendingComment.userId,
              pendingComment.userDisplayName
            );
            optimisticCommentsForPin.push(optimisticComment);
          }
        }

        // Combine real and optimistic comments
        return [...enhancedComments, ...optimisticCommentsForPin];
      } catch (err) {
        setError("Yorumlar yüklenirken beklenmeyen hata oluştu");
        return null;
      }
    },
    [optimisticState]
  );

  // Pin'e yorum ekle (with optimistic updates)
  const addComment = useCallback(
    async (pinId: string, text: string): Promise<boolean> => {
      if (!user) {
        setError("Yorum eklemek için giriş yapmalısınız");
        return false;
      }

      // Get user display name from user metadata or email
      const userDisplayName =
        user.user_metadata?.display_name || user.email || "Anonymous";

      // Add optimistic comment immediately
      const tempId = optimisticState.addCommentOptimistic(
        pinId,
        text,
        user.id,
        userDisplayName
      );

      // Update pin comment count optimistically
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

          // Rollback optimistic update
          optimisticState.rollbackComment(tempId);

          // Rollback pin comment count
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

          setError(commentError);
          return false;
        }

        if (comment) {
          // Confirm optimistic update with real comment
          optimisticState.confirmComment(tempId, comment);

          // Force refresh comments to show the real comment instead of optimistic one
          // This will trigger a re-render with the actual comment from DB
          setTimeout(() => {
            // The optimistic comment is now removed, and the real comment will be fetched
            // when getPinComments is called next time
          }, 100);

          return true;
        }

        // Rollback if no comment returned
        optimisticState.rollbackComment(tempId);
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

        // Rollback optimistic update
        optimisticState.rollbackComment(tempId);

        // Rollback pin comment count
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
    [user, optimisticState]
  );

  // Yorum oylama (with optimistic updates)
  const voteComment = useCallback(
    async (commentId: string, value: number): Promise<boolean> => {
      if (!user) {
        setError("Oy vermek için giriş yapmalısınız");
        return false;
      }

      // Check if this is an optimistic comment
      if (optimisticState.hasPendingComment(commentId)) {
        setError("Henüz kaydedilmemiş yorumlara oy verilemez");
        return false;
      }

      // Apply optimistic vote immediately
      optimisticState.voteOptimistic(commentId, value, user.id);

      try {
        // Send to backend
        const { success, error: voteError } = await pinService.voteComment(
          commentId,
          value
        );

        if (voteError) {
          console.error("voteComment error:", voteError);

          // Rollback optimistic vote
          optimisticState.rollbackVote(commentId, 0);
          setError(voteError);
          return false;
        }

        if (success) {
          // Confirm optimistic vote
          const voteData = {
            commentId,
            likeCount: 0, // These will be recalculated on next comment fetch
            dislikeCount: 0,
            userVote: value,
            netScore: 0,
          };
          optimisticState.confirmVote(commentId, voteData);
          return true;
        }

        // Rollback if not successful
        optimisticState.rollbackVote(commentId, 0);
        return false;
      } catch (error) {
        console.error("voteComment error:", error);

        // Rollback optimistic vote
        optimisticState.rollbackVote(commentId, 0);
        setError("Oy verilirken beklenmeyen hata oluştu");
        return false;
      }
    },
    [user, optimisticState]
  );

  // Pin'i sil
  const deletePin = useCallback(async (pinId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { success, error: deleteError } = await pinService.deletePin(pinId);

      if (deleteError) {
        setError(deleteError);
        return false;
      }

      if (success) {
        // Pin'i listeden kaldır
        setPins((prevPins) => prevPins.filter((pin) => pin.id !== pinId));
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

  // Pin'i güncelle (local state)
  const updatePin = useCallback((pinId: string, updates: Partial<Pin>) => {
    setPins((prevPins) =>
      prevPins.map((pin) => (pin.id === pinId ? { ...pin, ...updates } : pin))
    );
  }, []);

  // Hata temizle
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Pin'leri temizle
  const clearPins = useCallback(() => {
    setPins([]);
  }, []);

  // Yorum düzenleme (no optimistic updates for now)
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

  // Yorum silme (no optimistic updates for now)
  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const { success, error: deleteError } = await pinService.deleteComment(
          commentId
        );

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

    // Utilities
    clearError,
    clearPins,

    // Optimistic state info
    hasOptimisticUpdates,
  };
};
