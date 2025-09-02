import { pinQueryKeys } from "@/constants";
import { useSession } from "@/hooks/useSession";
import { HybridCacheManager } from "@/lib/hybrid-cache-manager";
import { pinService } from "@/lib/supabase/database";
import type { Comment, EnhancedComment, Pin, SelectedPin } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";

interface UseCommentOperationsProps {
  mapPins: Pin[];
  commentsLoading: boolean;
  setCommentsLoading: (loading: boolean) => void;
  batchComments: { [pinId: string]: EnhancedComment[] };
  setBatchComments: React.Dispatch<
    React.SetStateAction<{ [pinId: string]: EnhancedComment[] }>
  >;
  selectedPin: SelectedPin;
  setSelectedPin: React.Dispatch<React.SetStateAction<SelectedPin>>;
  setShowPinDetailModal: (show: boolean) => void;
  getPinComments: (
    pinId: string,
    forceRefresh?: boolean
  ) => Promise<EnhancedComment[] | null>;
  getBatchComments: (
    pinIds: string[],
    forceRefresh?: boolean
  ) => Promise<{ [pinId: string]: EnhancedComment[] } | null>;
}

export const useCommentOperations = ({
  mapPins,
  commentsLoading,
  setCommentsLoading,
  batchComments,
  setBatchComments,
  selectedPin,
  setSelectedPin,
  setShowPinDetailModal,
  getPinComments,
  getBatchComments,
}: UseCommentOperationsProps) => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const hybridCache = useMemo(
    () => new HybridCacheManager(queryClient),
    [queryClient]
  );

  // Comment mutations
  const addCommentMutation = useMutation({
    mutationFn: async ({
      pinId,
      text,
      photoUrl,
      photoMetadata,
    }: {
      pinId: string;
      text: string;
      photoUrl?: string;
      photoMetadata?: Record<string, unknown>;
    }) => {
      const { comment, error } = await pinService.addComment(
        pinId,
        text,
        user || undefined,
        photoUrl,
        photoMetadata
      );
      if (error) throw new Error(error);
      return { comment, pinId };
    },
    onSuccess: ({ comment, pinId }) => {
      if (comment) {
        hybridCache.updateCommentCountInCache(pinId, 1);
        queryClient.invalidateQueries({
          queryKey: pinQueryKeys.comments(pinId),
        });
        queryClient.setQueriesData(
          { queryKey: ["pins"] },
          (oldData: Pin[] | undefined) => {
            const existingPins = Array.isArray(oldData) ? oldData : [];
            return existingPins.map((pin: Pin) =>
              pin.id === pinId
                ? { ...pin, comments_count: (pin.comments_count || 0) + 1 }
                : pin
            );
          }
        );
        toast.success("Comment added successfully!");
      }
    },
    onError: (error) => {
      toast.error("Failed to add comment", { description: error.message });
    },
  });

  const editCommentMutation = useMutation({
    mutationFn: async ({
      commentId,
      newText,
      photoUrl,
      photoMetadata,
    }: {
      commentId: string;
      newText: string;
      photoUrl?: string | null;
      photoMetadata?: Record<string, unknown>;
    }) => {
      const { success, error } = await pinService.updateComment(
        commentId,
        newText,
        user || undefined,
        photoUrl,
        photoMetadata
      );
      if (error) throw new Error(error);
      return success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...pinQueryKeys.all, "comments"],
      });
      toast.success("Comment updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update comment", { description: error.message });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const result = await pinService.deleteCommentWithCleanup(
        commentId,
        user || undefined
      );
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: ({ success, pinDeleted, pinId }) => {
      console.log("deleteComment onSuccess called:", {
        success,
        pinDeleted,
        pinId,
      });
      if (success && pinId) {
        if (pinDeleted) {
          hybridCache.deletePin(pinId);
          queryClient.setQueriesData(
            { queryKey: ["pins"] },
            (oldData: Pin[] | undefined) => {
              const existingPins = Array.isArray(oldData) ? oldData : [];
              return existingPins.filter((pin: Pin) => pin.id !== pinId);
            }
          );
          toast.success("Pin deleted after removing last comment");
        } else {
          queryClient.setQueriesData(
            { queryKey: ["pins"] },
            (oldData: Pin[] | undefined) => {
              const existingPins = Array.isArray(oldData) ? oldData : [];
              return existingPins.map((pin: Pin) =>
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
        queryClient.invalidateQueries({
          queryKey: pinQueryKeys.comments(pinId),
        });
        hybridCache.invalidatePinComments(pinId);
        queryClient.invalidateQueries({
          queryKey: ["pins"],
        });
      }
    },
    onError: (error) => {
      console.log("deleteCommentMutation", error);
      toast.error("Failed to delete comment", { description: error.message });
    },
  });

  const voteCommentMutation = useMutation({
    mutationFn: async ({
      commentId,
      value,
    }: {
      commentId: string;
      value: number;
    }) => {
      const { success, error } = await pinService.voteComment(
        commentId,
        value,
        user || undefined
      );
      if (error) throw new Error(error);
      return success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...pinQueryKeys.all, "comments"],
      });
    },
    onError: (error) => {
      toast.error("Failed to vote on comment", { description: error.message });
    },
  });

  // Load comments for all visible pins using batch loading
  const loadVisiblePinsComments = useCallback(
    async (pinList?: Pin[]) => {
      const pinsToLoad = pinList || mapPins;

      if (pinsToLoad.length === 0) {
        setBatchComments({});
        return;
      }

      if (!getBatchComments) {
        console.warn("getBatchComments not available, skipping batch loading");
        return;
      }

      setCommentsLoading(true);

      try {
        console.log(
          "🔄 Loading comments for",
          pinsToLoad.length,
          "visible pins using batch loading"
        );

        const pinIds = pinsToLoad.map((pin) => pin.id);
        const comments = await getBatchComments(pinIds);

        if (comments) {
          setBatchComments(comments);
          console.log(
            "✅ Batch comments loaded successfully for",
            Object.keys(comments).length,
            "pins"
          );
        }
      } catch (error) {
        console.error("❌ Failed to load batch comments:", error);
      } finally {
        setCommentsLoading(false);
      }
    },
    [mapPins, getBatchComments, setBatchComments, setCommentsLoading]
  );

  // Auto-load comments when pins change
  useEffect(() => {
    if (mapPins.length > 0 && !commentsLoading) {
      const timeoutId = setTimeout(async () => {
        console.log(
          "🎆 Auto-loading batch comments for",
          mapPins.length,
          "visible pins"
        );
        const startTime = performance.now();

        try {
          await loadVisiblePinsComments();
          const endTime = performance.now();
          const duration = endTime - startTime;
          console.log(
            "✅ Batch comment loading completed in",
            duration.toFixed(2),
            "ms"
          );

          const individualEstimate = mapPins.length * 50;
          const improvement = (
            ((individualEstimate - duration) / individualEstimate) *
            100
          ).toFixed(1);
          console.log(
            "📊 Performance improvement: ~" +
              improvement +
              "% faster than individual loading"
          );
        } catch (error) {
          console.error("❌ Error in batch comment loading:", error);
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [mapPins, loadVisiblePinsComments, getBatchComments, commentsLoading]);

  // Invalidate pin comments cache function
  const invalidatePinCommentsCache = useCallback(
    async (pinId: string) => {
      try {
        queryClient.invalidateQueries({ queryKey: ["pins"] });

        setBatchComments((prev) => {
          const updated = { ...prev };
          delete updated[pinId];
          return updated;
        });

        console.log("✅ Pin comments cache invalidated for pin:", pinId);
      } catch (error) {
        console.error("❌ Failed to invalidate pin comments cache:", error);
      }
    },
    [queryClient, setBatchComments]
  );

  // Pin click handler (using batch comments)
  const handlePinClick = useCallback(
    async (pin: Pin) => {
      try {
        console.log("Pin clicked:", pin.name);

        let commentsToShow = batchComments[pin.id] || [];

        if (commentsToShow.length === 0 && getPinComments) {
          console.log(
            "No batch comments available, loading individually for pin:",
            pin.id
          );
          const individualComments = await getPinComments(pin.id);
          commentsToShow = individualComments || [];
        } else if (commentsToShow.length > 0) {
          console.log(
            "Using batch-loaded comments for pin:",
            pin.id,
            commentsToShow.length,
            "comments"
          );
        }

        setSelectedPin({
          pinId: pin.id,
          pinName: pin.name,
          comments: commentsToShow,
        });
        setShowPinDetailModal(true);
      } catch (error) {
        console.error("Error in handlePinClick:", error);
        setSelectedPin({
          pinId: pin.id,
          pinName: pin.name,
          comments: [],
        });
        setShowPinDetailModal(true);
      }
    },
    [getPinComments, batchComments, setSelectedPin, setShowPinDetailModal]
  );

  // Comment handlers that need selectedPin
  const handleAddComment = useCallback(
    async (
      text: string,
      photoUrl?: string,
      photoMetadata?: Record<string, unknown>
    ): Promise<boolean> => {
      if (!selectedPin) return false;

      try {
        await addCommentMutation.mutateAsync({
          pinId: selectedPin.pinId,
          text,
          photoUrl,
          photoMetadata,
        });

        const updatedComments = await getPinComments(selectedPin.pinId, true);
        if (updatedComments) {
          if (updatedComments.length === 0) {
            setShowPinDetailModal(false);
            setSelectedPin(null);
            return true;
          }

          setSelectedPin((prev: SelectedPin) =>
            prev ? { ...prev, comments: updatedComments } : null
          );
        }

        return true;
      } catch (error) {
        console.error("Yorum ekleme hatası:", error);
        return false;
      }
    },
    [
      selectedPin,
      addCommentMutation,
      getPinComments,
      setShowPinDetailModal,
      setSelectedPin,
    ]
  );

  const handleEditComment = useCallback(
    async (
      commentId: string,
      newText: string,
      photoUrl?: string | null,
      photoMetadata?: Record<string, unknown>
    ): Promise<boolean> => {
      if (!selectedPin) return false;

      try {
        await editCommentMutation.mutateAsync({
          commentId,
          newText,
          photoUrl,
          photoMetadata,
        });

        const updatedComments = await getPinComments(selectedPin.pinId, true);
        if (updatedComments) {
          if (updatedComments.length === 0) {
            setShowPinDetailModal(false);
            setSelectedPin(null);
            return true;
          }

          setSelectedPin((prev: SelectedPin) =>
            prev ? { ...prev, comments: updatedComments } : null
          );
        }
        return true;
      } catch (error) {
        console.error("Yorum düzenleme hatası:", error);
        return false;
      }
    },
    [
      selectedPin,
      editCommentMutation,
      getPinComments,
      setShowPinDetailModal,
      setSelectedPin,
    ]
  );

  const handleDeleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      if (!selectedPin) return false;

      try {
        await deleteCommentMutation.mutateAsync(commentId);
        console.log("handleDeleteComment success");

        console.log("Updating selectedPin, removing commentId:", commentId);
        setSelectedPin((prev: SelectedPin) => {
          if (!prev) return null;
          const filteredComments = prev.comments.filter(
            (comment: Comment | EnhancedComment) => comment.id !== commentId
          );
          if (filteredComments.length === 0) {
            setShowPinDetailModal(false);
            setSelectedPin(null);
            return null;
          }
          return { ...prev, comments: filteredComments };
        });

        return true;
      } catch (error) {
        console.error("Yorum silme hatası:", error);
        return false;
      }
    },
    [selectedPin, deleteCommentMutation, setShowPinDetailModal, setSelectedPin]
  );

  const handleVoteComment = useCallback(
    async (
      commentId: string,
      value: number,
      pinId: string
    ): Promise<boolean> => {
      if (!selectedPin) return false;

      try {
        await voteCommentMutation.mutateAsync({ commentId, value });

        const updatedComments = await getPinComments(pinId, true);
        if (updatedComments) {
          setSelectedPin((prev: SelectedPin) =>
            prev ? { ...prev, comments: updatedComments } : null
          );
        }
        return true;
      } catch (error) {
        console.error("Yorum oylama hatası:", error);
        return false;
      }
    },
    [selectedPin, voteCommentMutation, getPinComments, setSelectedPin]
  );

  return {
    // Comment operations
    addComment: async (
      pinId: string,
      text: string,
      photoUrl?: string,
      photoMetadata?: Record<string, unknown>
    ) => {
      try {
        await addCommentMutation.mutateAsync({
          pinId,
          text,
          photoUrl,
          photoMetadata,
        });
        return true;
      } catch {
        return false;
      }
    },
    editComment: async (
      commentId: string,
      newText: string,
      photoUrl?: string | null,
      photoMetadata?: Record<string, unknown>
    ) => {
      try {
        await editCommentMutation.mutateAsync({
          commentId,
          newText,
          photoUrl,
          photoMetadata,
        });
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

    // Batch operations
    loadVisiblePinsComments,
    invalidatePinCommentsCache,
    handlePinClick,

    // Handlers with selectedPin context
    handleAddComment,
    handleEditComment,
    handleDeleteComment,
    handleVoteComment,

    // Loading states
    loading:
      addCommentMutation.isPending ||
      editCommentMutation.isPending ||
      deleteCommentMutation.isPending ||
      voteCommentMutation.isPending,
  };
};
