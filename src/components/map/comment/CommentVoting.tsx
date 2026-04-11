"use client";

import {
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface CommentVotingProps {
  commentId: string;
  pinId: string;
  voteCount?: number;
  userVote?: number;
  likeCount: number;
  dislikeCount: number;
  onVote: (commentId: string, value: number, pinId: string) => Promise<boolean>;
  currentUserId: string;
  isOptimistic?: boolean;
  commentVotes?: Array<{ value: number; user_id?: string }>;
}

export default function CommentVoting({
  commentId,
  pinId,
  userVote,
  likeCount: initialLikeCount,
  dislikeCount: initialDislikeCount,
  onVote,
  currentUserId,
  isOptimistic,
}: CommentVotingProps) {
  const [localVote, setLocalVote] = useState(userVote || 0);
  const [localLikeCount, setLocalLikeCount] = useState(initialLikeCount);
  const [localDislikeCount, setLocalDislikeCount] = useState(initialDislikeCount);

  // Update local states when props change
  useEffect(() => {
    setLocalLikeCount(initialLikeCount);
    setLocalDislikeCount(initialDislikeCount);
    setLocalVote(userVote || 0);
  }, [initialLikeCount, initialDislikeCount, userVote, commentId]);

  const currentVoteValue =
    localVote !== undefined ? localVote : userVote || 0;

  const handleVote = async (value: number) => {
    if (!currentUserId) {
      toast.info("Sign in to vote on comments", {
        description: "Create an account to like or dislike comments",
        action: {
          label: "Sign In",
          onClick: () => (window.location.href = "/auth"),
        },
      });
      return;
    }

    if (isOptimistic || commentId.startsWith("temp-")) {
      return;
    }

    const prevVote = currentVoteValue;
    const prevLike = localLikeCount;
    const prevDislike = localDislikeCount;

    // Optimistic update
    if (prevVote === value) {
      setLocalVote(0);
      if (value === 1) {
        setLocalLikeCount(Math.max(0, localLikeCount - 1));
      } else {
        setLocalDislikeCount(Math.max(0, localDislikeCount - 1));
      }
    } else {
      const newVote = value;
      if (prevVote === 0) {
        if (value === 1) {
          setLocalLikeCount(localLikeCount + 1);
        } else {
          setLocalDislikeCount(localDislikeCount + 1);
        }
      } else if (prevVote !== value) {
        if (prevVote === 1) {
          setLocalLikeCount(Math.max(0, localLikeCount - 1));
          setLocalDislikeCount(localDislikeCount + 1);
        } else {
          setLocalDislikeCount(Math.max(0, localDislikeCount - 1));
          setLocalLikeCount(localLikeCount + 1);
        }
      }
      setLocalVote(newVote);
    }

    try {
      const success = await onVote(commentId, value, pinId);
      if (!success) {
        setLocalVote(prevVote);
        setLocalLikeCount(prevLike);
        setLocalDislikeCount(prevDislike);
        toast.error("Failed to save your vote");
      }
    } catch (error) {
      console.error("Voting error:", error);
      setLocalVote(prevVote);
      setLocalLikeCount(prevLike);
      setLocalDislikeCount(prevDislike);
      toast.error("Failed to save your vote");
    }
  };

  const netScore = localLikeCount - localDislikeCount;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleVote(1)}
        disabled={isOptimistic || commentId.startsWith("temp-")}
        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
          currentVoteValue === 1
            ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        }`}
      >
        <ThumbsUp className={`h-3 w-3 ${currentVoteValue === 1 ? 'fill-current' : ''}`} />
        <span className="tabular-nums">{localLikeCount > 0 ? localLikeCount : 0}</span>
      </button>

      <button
        onClick={() => handleVote(-1)}
        disabled={isOptimistic || commentId.startsWith("temp-")}
        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
          currentVoteValue === -1
            ? "bg-red-500/12 text-red-600 dark:text-red-400"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        }`}
      >
        <ThumbsDown className={`h-3 w-3 ${currentVoteValue === -1 ? 'fill-current' : ''}`} />
        <span className="tabular-nums">{localDislikeCount > 0 ? localDislikeCount : 0}</span>
      </button>

      {/* Net score pill */}
      {(localLikeCount > 0 || localDislikeCount > 0) && (
        <span
          className={`ml-1 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tabular-nums ${
            netScore > 0
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : netScore < 0
              ? "bg-red-500/10 text-red-600 dark:text-red-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {netScore > 0 ? "+" : ""}
          {netScore}
        </span>
      )}
    </div>
  );
}
