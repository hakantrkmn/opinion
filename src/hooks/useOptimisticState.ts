import {
  getOptimisticStateManager,
  type EnhancedComment,
  type OptimisticStateManager,
  type PendingComment,
  type PendingVote,
  type VoteData,
} from "@/lib/optimistic-state-manager";
import type { Comment } from "@/types";
import { useCallback, useEffect, useState } from "react";

export interface UseOptimisticStateReturn {
  // State getters
  getPendingComments: () => Map<string, PendingComment>;
  getPendingVotes: () => Map<string, PendingVote>;
  hasPendingComment: (tempId: string) => boolean;
  hasPendingVote: (commentId: string) => boolean;

  // Comment operations
  addCommentOptimistic: (
    pinId: string,
    text: string,
    userId: string,
    userDisplayName: string
  ) => string;
  confirmComment: (tempId: string, realComment: Comment) => Comment;
  rollbackComment: (tempId: string) => void;

  // Vote operations
  voteOptimistic: (commentId: string, value: number, userId: string) => void;
  confirmVote: (commentId: string, newVoteData: VoteData) => void;
  rollbackVote: (commentId: string, previousVote: number) => void;

  // Enhanced comment utilities
  createOptimisticComment: (
    tempId: string,
    pinId: string,
    text: string,
    userId: string,
    userDisplayName: string
  ) => EnhancedComment;
  calculateVoteCounts: (comment: Comment) => {
    likeCount: number;
    dislikeCount: number;
    netScore: number;
    userVote: number;
  };

  // Utility methods
  clearAllPendingOperations: () => void;

  // State for triggering re-renders
  updateCounter: number;
}

export function useOptimisticState(): UseOptimisticStateReturn {
  const [updateCounter, setUpdateCounter] = useState(0);
  const [manager] = useState<OptimisticStateManager>(() =>
    getOptimisticStateManager()
  );

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = manager.subscribe(() => {
      setUpdateCounter((prev) => prev + 1);
    });

    return unsubscribe;
  }, [manager]);

  // State getters
  const getPendingComments = useCallback(() => {
    return manager.getPendingComments();
  }, [manager]);

  const getPendingVotes = useCallback(() => {
    return manager.getPendingVotes();
  }, [manager]);

  const hasPendingComment = useCallback(
    (tempId: string) => {
      return manager.hasPendingComment(tempId);
    },
    [manager]
  );

  const hasPendingVote = useCallback(
    (commentId: string) => {
      return manager.hasPendingVote(commentId);
    },
    [manager]
  );

  // Comment operations
  const addCommentOptimistic = useCallback(
    (pinId: string, text: string, userId: string, userDisplayName: string) => {
      return manager.addCommentOptimistic(pinId, text, userId, userDisplayName);
    },
    [manager]
  );

  const confirmComment = useCallback(
    (tempId: string, realComment: Comment) => {
      return manager.confirmComment(tempId, realComment);
    },
    [manager]
  );

  const rollbackComment = useCallback(
    (tempId: string) => {
      manager.rollbackComment(tempId);
    },
    [manager]
  );

  // Vote operations
  const voteOptimistic = useCallback(
    (commentId: string, value: number, userId: string) => {
      manager.voteOptimistic(commentId, value, userId);
    },
    [manager]
  );

  const confirmVote = useCallback(
    (commentId: string, newVoteData: VoteData) => {
      manager.confirmVote(commentId, newVoteData);
    },
    [manager]
  );

  const rollbackVote = useCallback(
    (commentId: string, previousVote: number) => {
      manager.rollbackVote(commentId, previousVote);
    },
    [manager]
  );

  // Enhanced comment utilities
  const createOptimisticComment = useCallback(
    (
      tempId: string,
      pinId: string,
      text: string,
      userId: string,
      userDisplayName: string
    ) => {
      return manager.createOptimisticComment(
        tempId,
        pinId,
        text,
        userId,
        userDisplayName
      );
    },
    [manager]
  );

  const calculateVoteCounts = useCallback(
    (comment: Comment) => {
      return manager.calculateVoteCounts(comment);
    },
    [manager, updateCounter]
  );

  // Utility methods
  const clearAllPendingOperations = useCallback(() => {
    manager.clearAllPendingOperations();
  }, [manager]);

  return {
    // State getters
    getPendingComments,
    getPendingVotes,
    hasPendingComment,
    hasPendingVote,

    // Comment operations
    addCommentOptimistic,
    confirmComment,
    rollbackComment,

    // Vote operations
    voteOptimistic,
    confirmVote,
    rollbackVote,

    // Enhanced comment utilities
    createOptimisticComment,
    calculateVoteCounts,

    // Utility methods
    clearAllPendingOperations,

    // State for triggering re-renders
    updateCounter,
  };
}
