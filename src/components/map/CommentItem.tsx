"use client";

import { Avatar } from "@/components/ui/Avatar";
import type { Comment, EnhancedComment } from "@/types";
import { Calendar } from "lucide-react";
import { useState } from "react";
import CommentActions from "./comment/CommentActions";
import CommentEditForm from "./comment/CommentEditForm";
import CommentImage from "./comment/CommentImage";
import CommentVoting from "./comment/CommentVoting";

interface CommentItemProps {
  comment: Comment | EnhancedComment;
  currentUserId: string;
  onEdit: (
    commentId: string,
    newText: string,
    photoUrl?: string | null,
    photoMetadata?: Record<string, unknown>
  ) => Promise<boolean>;
  onDelete: (commentId: string) => Promise<boolean>;
  onVote: (commentId: string, value: number, pinId: string) => Promise<boolean>;
}

export default function CommentItem({
  comment,
  currentUserId,
  onEdit,
  onDelete,
  onVote,
}: CommentItemProps) {
  const userData = comment.users
    ? Array.isArray(comment.users)
      ? comment.users[0]
      : comment.users
    : null;

  const userDisplayName =
    userData?.display_name || comment.profiles?.display_name || "Anonymous";
  const userAvatarUrl = userData?.avatar_url || comment.profiles?.avatar_url;

  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const CHARACTER_LIMIT = 200;

  const isEnhancedComment = "isOptimistic" in comment;
  const isOptimistic = isEnhancedComment && comment.isOptimistic;
  const isOwnComment = comment.user_id === currentUserId;

  const isLongComment = comment.text.length > CHARACTER_LIMIT;
  const displayText =
    isLongComment && !isExpanded
      ? comment.text.slice(0, CHARACTER_LIMIT) + "…"
      : comment.text;

  // Calculate initial like/dislike counts
  let likeCount = 0;
  let dislikeCount = 0;

  if (isEnhancedComment && comment.likeCount !== undefined) {
    likeCount = comment.likeCount;
    dislikeCount = comment.dislikeCount;
  } else if (comment.comment_votes) {
    likeCount = comment.comment_votes.filter((v) => v.value === 1).length;
    dislikeCount = comment.comment_votes.filter((v) => v.value === -1).length;
  }

  return (
    <div className={`group relative rounded-2xl border border-border/50 bg-card overflow-hidden min-w-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-border/80 hover:shadow-sm ${isOptimistic ? 'opacity-70' : ''}`}>
      <div className="p-4 min-w-0">
        {/* Header: avatar, name, date */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar
              src={userAvatarUrl}
              alt={userDisplayName}
              size="sm"
              fallbackText={userDisplayName}
            />
            <div className="min-w-0">
              <span className="font-semibold text-sm text-foreground truncate block leading-tight">
                {userDisplayName}
              </span>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground/60 mt-0.5">
                <Calendar className="h-2.5 w-2.5" />
                <span>
                  {new Date(comment.created_at).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Own comment actions - visible on hover */}
          {isOwnComment && !isOptimistic && !isEditing && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <CommentActions
                isOwner={isOwnComment}
                onEdit={() => setIsEditing(true)}
                onDelete={() => onDelete(comment.id)}
                isEditing={isEditing}
              />
            </div>
          )}
        </div>

        {isEditing ? (
          <CommentEditForm
            comment={comment}
            onSave={async (commentId, newText, photoUrl, photoMetadata) => {
              const success = await onEdit(
                commentId,
                newText,
                photoUrl,
                photoMetadata
              );
              if (success) {
                setIsEditing(false);
              }
              return success;
            }}
            onCancel={() => setIsEditing(false)}
            currentUserId={currentUserId}
          />
        ) : (
          <>
            {/* Comment text */}
            <div className="mb-3">
              <p className="text-sm leading-relaxed text-foreground/90 break-all overflow-hidden">
                {displayText}
              </p>
              {isLongComment && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-primary hover:text-primary/80 mt-1.5 font-semibold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-1 rounded-sm"
                >
                  {isExpanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>

            {/* Photo */}
            {comment.photo_url && (
              <div className="mb-3">
                <CommentImage
                  photoUrl={comment.photo_url}
                  commentId={comment.id}
                />
              </div>
            )}

            {/* Footer: voting */}
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <CommentVoting
                commentId={comment.id}
                pinId={comment.pin_id}
                voteCount={comment.vote_count}
                userVote={comment.user_vote}
                likeCount={likeCount}
                dislikeCount={dislikeCount}
                onVote={onVote}
                currentUserId={currentUserId}
                isOptimistic={isOptimistic}
                commentVotes={comment.comment_votes}
              />

              {/* Optimistic saving indicator */}
              {isOptimistic && isOwnComment && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <div className="w-3 h-3 border-2 border-muted-foreground/40 border-t-muted-foreground rounded-full animate-spin" />
                  <span>Saving…</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
