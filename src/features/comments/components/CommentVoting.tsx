"use client";

import { cn } from "@/lib/utils";
import type { VoteValue } from "@/types/api";
import { ThumbsDown, ThumbsUp } from "lucide-react";

interface CommentVotingProps {
  likes: number;
  dislikes: number;
  myVote: VoteValue;
  /** Called with the clicked direction; the parent decides toggling. */
  onVote: (clicked: 1 | -1) => void;
  disabled?: boolean;
}

const base =
  "inline-flex h-8 min-w-12 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-medium tabular-nums transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation select-none pointer-coarse:h-10";

export function CommentVoting({
  likes,
  dislikes,
  myVote,
  onVote,
  disabled,
}: CommentVotingProps) {
  const net = likes - dislikes;
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onVote(1)}
        disabled={disabled}
        aria-pressed={myVote === 1}
        aria-label={myVote === 1 ? `Remove like (${likes})` : `Like (${likes})`}
        className={cn(
          base,
          myVote === 1
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        )}
      >
        <ThumbsUp className={cn("h-3.5 w-3.5", myVote === 1 && "fill-current")} />
        {likes}
      </button>
      <button
        type="button"
        onClick={() => onVote(-1)}
        disabled={disabled}
        aria-pressed={myVote === -1}
        aria-label={myVote === -1 ? `Remove dislike (${dislikes})` : `Dislike (${dislikes})`}
        className={cn(
          base,
          myVote === -1
            ? "bg-red-500/12 text-red-700 dark:text-red-400"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        )}
      >
        <ThumbsDown className={cn("h-3.5 w-3.5", myVote === -1 && "fill-current")} />
        {dislikes}
      </button>
      {likes > 0 || dislikes > 0 ? (
        <span
          title="Score (likes minus dislikes)"
          className={cn(
            "ml-1 rounded-md px-2 py-0.5 text-[10px] font-bold tabular-nums",
            net > 0
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : net < 0
                ? "bg-red-500/10 text-red-700 dark:text-red-400"
                : "bg-muted text-muted-foreground"
          )}
        >
          {net > 0 ? `+${net}` : net}
        </span>
      ) : null}
    </div>
  );
}
