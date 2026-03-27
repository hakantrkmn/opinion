import { queryKeys } from "@/lib/api/query-keys";
import { useMapStore } from "@/store/map-store";
import {
  useAddComment,
  useEditComment,
  useDeleteComment,
  useVoteComment,
} from "@/hooks/mutations/use-comment-mutations";
import type { Comment, EnhancedComment, Pin } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/hooks/useSession";
import { useCallback } from "react";

interface UseCommentOperationsProps {
  getPinComments: (pinId: string, forceRefresh?: boolean) => Promise<EnhancedComment[] | null>;
}

export const useCommentOperations = ({
  getPinComments,
}: UseCommentOperationsProps) => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const store = useMapStore();

  const addMutation = useAddComment();
  const editMutation = useEditComment();
  const deleteMutation = useDeleteComment();
  const voteMutation = useVoteComment();

  const invalidatePinCommentsCache = useCallback(
    (pinId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pins.comments(pinId) });
    },
    [queryClient]
  );

  const handlePinClick = useCallback(
    async (pin: Pin) => {
      // Show modal immediately with empty comments, then load
      store.setSelectedPin({ pinId: pin.id, pinName: pin.name, comments: [] });
      store.setShowPinDetailModal(true);
      store.setCommentsLoading(true);
      try {
        const comments = (await getPinComments(pin.id)) || [];
        store.setSelectedPin({ pinId: pin.id, pinName: pin.name, comments });
      } finally {
        store.setCommentsLoading(false);
      }
    },
    [getPinComments, store]
  );

  // --- Mutation Handlers (work with selectedPin from store) ---

  // Add comment: API call then single refetch to get server-generated fields (id, timestamps, etc.)
  const handleAddComment = useCallback(
    async (text: string, photoUrl?: string, photoMetadata?: Record<string, unknown>): Promise<boolean> => {
      const sp = store.selectedPin;
      if (!sp) return false;
      try {
        await addMutation.mutateAsync({ pinId: sp.pinId, text, photoUrl, photoMetadata });
        // Single refetch needed — server generates id, timestamps, profile data
        const updated = await getPinComments(sp.pinId, true);
        if (updated) {
          if (!updated.length) { store.setShowPinDetailModal(false); store.setSelectedPin(null); }
          else store.setSelectedPin({ ...sp, comments: updated });
        }
        return true;
      } catch { return false; }
    },
    [store, addMutation, getPinComments]
  );

  // Edit comment: API call then local state update (we know what changed)
  const handleEditComment = useCallback(
    async (commentId: string, newText: string, photoUrl?: string | null, photoMetadata?: Record<string, unknown>): Promise<boolean> => {
      const sp = store.selectedPin;
      if (!sp) return false;
      try {
        await editMutation.mutateAsync({ commentId, text: newText, pinId: sp.pinId, photoUrl, photoMetadata });
        // Local update — only text and photo changed, no need to refetch
        const updatedComments = sp.comments.map((c) =>
          c.id === commentId
            ? { ...c, text: newText, photo_url: photoUrl === null ? undefined : (photoUrl ?? c.photo_url) }
            : c
        );
        store.setSelectedPin({ ...sp, comments: updatedComments });
        return true;
      } catch { return false; }
    },
    [store, editMutation]
  );

  // Delete comment: API call then local state removal
  const handleDeleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      const sp = store.selectedPin;
      if (!sp) return false;
      try {
        const result = await deleteMutation.mutateAsync({ commentId, pinId: sp.pinId });
        if (result.pinDeleted) {
          // Pin was auto-deleted, remove from pins cache
          queryClient.setQueryData(queryKeys.pins.all, (old: Pin[] | undefined) =>
            (old || []).filter((p) => p.id !== sp.pinId)
          );
          store.setShowPinDetailModal(false);
          store.setSelectedPin(null);
        } else {
          const filtered = sp.comments.filter((c: Comment | EnhancedComment) => c.id !== commentId);
          if (!filtered.length) { store.setShowPinDetailModal(false); store.setSelectedPin(null); }
          else store.setSelectedPin({ ...sp, comments: filtered });
        }
        return true;
      } catch { return false; }
    },
    [store, deleteMutation, queryClient]
  );

  // Vote comment: optimistic local update, no refetch
  const handleVoteComment = useCallback(
    async (commentId: string, value: number, pinId: string): Promise<boolean> => {
      const sp = store.selectedPin;
      if (!sp) return false;

      const userId = user?.id;

      // Save previous state for rollback
      const previousComments = sp.comments;

      // Optimistic update
      const optimisticComments = sp.comments.map((c) => {
        if (c.id !== commentId) return c;
        const ec = c as EnhancedComment;

        const oldVote = ec.user_vote || 0;
        // Toggle: if same vote, remove it; otherwise set new value
        const newVote = oldVote === value ? 0 : value;

        // Calculate score delta
        let likeDelta = 0;
        let dislikeDelta = 0;

        // Remove old vote effect
        if (oldVote === 1) likeDelta--;
        if (oldVote === -1) dislikeDelta--;

        // Add new vote effect
        if (newVote === 1) likeDelta++;
        if (newVote === -1) dislikeDelta++;

        // Update comment_votes array
        const votes = (ec.comment_votes || []).filter((v) => v.user_id !== userId);
        if (newVote !== 0 && userId) {
          votes.push({ value: newVote, user_id: userId });
        }

        return {
          ...ec,
          user_vote: newVote,
          likeCount: ec.likeCount + likeDelta,
          dislikeCount: ec.dislikeCount + dislikeDelta,
          netScore: ec.netScore + likeDelta - dislikeDelta,
          comment_votes: votes,
        };
      });

      store.setSelectedPin({ ...sp, comments: optimisticComments });

      try {
        await voteMutation.mutateAsync({ commentId, value, pinId });
        return true;
      } catch {
        // Rollback on failure
        store.setSelectedPin({ ...sp, comments: previousComments });
        return false;
      }
    },
    [store, voteMutation, user?.id]
  );

  return {
    invalidatePinCommentsCache,
    handlePinClick,
    handleAddComment,
    handleEditComment,
    handleDeleteComment,
    handleVoteComment,
    loading: addMutation.isPending || editMutation.isPending || deleteMutation.isPending || voteMutation.isPending,
  };
};
