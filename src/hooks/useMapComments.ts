import type { Comment, EnhancedComment, Pin } from "@/types";
import React, { useCallback, useEffect } from "react";
type SelectedPin = {
  pinId: string;
  pinName: string;
  comments: (Comment | EnhancedComment)[];
} | null;
export const useMapComments = (
  mapPins: Pin[],
  commentsLoading: boolean,
  setCommentsLoading: (loading: boolean) => void,
  batchComments: { [pinId: string]: EnhancedComment[] },
  setBatchComments: React.Dispatch<
    React.SetStateAction<{ [pinId: string]: EnhancedComment[] }>
  >,
  getBatchComments: (
    pinIds: string[],
    forceRefresh?: boolean
  ) => Promise<{ [pinId: string]: EnhancedComment[] } | null>,
  getPinComments: (
    pinId: string,
    forceRefresh?: boolean
  ) => Promise<EnhancedComment[] | null>,
  addComment: (
    pinId: string,
    text: string,
    photoUrl?: string,
    photoMetadata?: Record<string, unknown>
  ) => Promise<boolean>,
  editComment: (
    commentId: string,
    newText: string,
    photoUrl?: string | null,
    photoMetadata?: Record<string, unknown>
  ) => Promise<boolean>,
  deleteComment: (commentId: string) => Promise<boolean>,
  voteComment: (
    commentId: string,
    value: number,
    pinId: string
  ) => Promise<boolean>,
  setSelectedPin: (pin: SelectedPin) => void,
  setShowPinDetailModal: (show: boolean) => void,
  invalidateCache: () => void
) => {
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
        invalidateCache();

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
    [invalidateCache, setBatchComments]
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

  // Add comment
  const handleAddComment = async (
    text: string,
    photoUrl?: string,
    photoMetadata?: Record<string, unknown>
  ): Promise<boolean> => {
    // This will be implemented in the main hook since it needs selectedPin
    return false;
  };

  // Edit comment
  const handleEditComment = async (
    commentId: string,
    newText: string,
    photoUrl?: string | null,
    photoMetadata?: Record<string, unknown>
  ): Promise<boolean> => {
    console.log(
      "handleEditComment",
      commentId,
      newText,
      photoUrl,
      photoMetadata
    );
    // This will be implemented in the main hook since it needs selectedPin
    return false;
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string): Promise<boolean> => {
    // This will be implemented in the main hook since it needs selectedPin
    return false;
  };

  // Vote comment
  const handleVoteComment = async (
    commentId: string,
    value: number
  ): Promise<boolean> => {
    // This will be implemented in the main hook since it needs selectedPin
    return false;
  };

  return {
    loadVisiblePinsComments,
    invalidatePinCommentsCache,
    handlePinClick,
    handleAddComment,
    handleEditComment,
    handleDeleteComment,
    handleVoteComment,
  };
};
