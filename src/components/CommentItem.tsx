"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/Avatar";
import type { Comment, EnhancedComment } from "@/types";
import { Calendar, Edit2, Save, ThumbsDown, ThumbsUp, Trash2, TrendingDown, TrendingUp, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface CommentItemProps {
  comment: Comment | EnhancedComment;
  currentUserId: string;
  onEdit: (commentId: string, newText: string) => Promise<boolean>;
  onDelete: (commentId: string) => Promise<boolean>;
  onVote: (commentId: string, value: number) => Promise<boolean>;
}

export default function CommentItem({
  comment,
  currentUserId,
  onEdit,
  onDelete,
  onVote,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [isExpanded, setIsExpanded] = useState(false);

  // Character limit for comment text
  const CHARACTER_LIMIT = 200;

  // Check if this is an enhanced comment with optimistic data
  const isEnhancedComment = 'isOptimistic' in comment;
  const isOptimistic = isEnhancedComment && comment.isOptimistic;

  // Local state for optimistic updates
  const [localVote, setLocalVote] = useState(comment.user_vote || 0);

  // Use enhanced comment data if available, otherwise calculate from comment_votes
  let initialLikeCount = 0;
  let initialDislikeCount = 0;

  if (isEnhancedComment && comment.likeCount !== undefined) {
    // Use pre-calculated values from EnhancedComment
    initialLikeCount = comment.likeCount;
    initialDislikeCount = comment.dislikeCount;
  } else if (comment.comment_votes) {
    // Calculate from comment_votes for regular comments
    const getLikeDislikeCounts = (
      commentVotes: Array<{ value: number; user_id?: string }>
    ) => {
      const likeCount = commentVotes.filter((vote) => vote.value === 1).length;
      const dislikeCount = commentVotes.filter(
        (vote) => vote.value === -1
      ).length;
      return { likeCount, dislikeCount };
    };

    const counts = getLikeDislikeCounts(comment.comment_votes);
    initialLikeCount = counts.likeCount;
    initialDislikeCount = counts.dislikeCount;
  }

  const [localLikeCount, setLocalLikeCount] = useState(initialLikeCount);
  const [localDislikeCount, setLocalDislikeCount] = useState(initialDislikeCount);

  // Helper function to calculate like/dislike counts
  const getLikeDislikeCounts = (
    commentVotes: Array<{ value: number; user_id?: string }>
  ) => {
    const likeCount = commentVotes.filter((vote) => vote.value === 1).length;
    const dislikeCount = commentVotes.filter(
      (vote) => vote.value === -1
    ).length;
    return { likeCount, dislikeCount };
  };

  // Update local states when comment prop changes
  useEffect(() => {
    if (isEnhancedComment && comment.likeCount !== undefined) {
      // Use pre-calculated values from EnhancedComment
      setLocalLikeCount(comment.likeCount);
      setLocalDislikeCount(comment.dislikeCount);
    } else if (comment.comment_votes) {
      const { likeCount, dislikeCount } = getLikeDislikeCounts(
        comment.comment_votes
      );
      setLocalLikeCount(likeCount);
      setLocalDislikeCount(dislikeCount);
    } else {
      setLocalLikeCount(0);
      setLocalDislikeCount(0);
    }
    setLocalVote(comment.user_vote || 0);
  }, [comment.comment_votes, comment.user_vote, comment.id, isEnhancedComment]);

  const isOwnComment = comment.user_id === currentUserId;

  // Use local state, fallback to comment props
  const currentVote =
    localVote !== undefined ? localVote : comment.user_vote || 0;

  // Check if comment text exceeds character limit
  const isLongComment = comment.text.length > CHARACTER_LIMIT;
  const displayText = isLongComment && !isExpanded
    ? comment.text.slice(0, CHARACTER_LIMIT) + "..."
    : comment.text;

  const handleEdit = async () => {
    if (!editText.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    try {
      const success = await onEdit(comment.id, editText.trim());
      if (success) {
        setIsEditing(false);
        toast.success("Comment updated successfully");
      } else {
        toast.error("Failed to update comment");
      }
    } catch (error) {
      console.error("Edit error:", error);
      toast.error("Failed to update comment");
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const success = await onDelete(comment.id);
      if (success) {
        toast.success("Comment deleted successfully");
      } else {
        toast.error("Failed to delete comment");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete comment");
    }
  };

  const handleVote = async (value: number) => {
    // Don't allow voting on optimistic comments
    if (isOptimistic || comment.id.startsWith("temp-")) {
      console.log("Optimistic comment - voting temporarily disabled");
      return;
    }

    // Optimistic update - immediately update UI
    const currentVote =
      localVote !== undefined ? localVote : comment.user_vote || 0;

    // If same button pressed again (toggle) - remove vote
    if (currentVote === value) {
      setLocalVote(0);
      if (value === 1) {
        // Like vote being removed
        setLocalLikeCount(Math.max(0, localLikeCount - 1));
      } else {
        // Dislike vote being removed
        setLocalDislikeCount(Math.max(0, localDislikeCount - 1));
      }
    } else {
      // Different button pressed - change or new vote
      const newVote = value;

      if (currentVote === 0) {
        // First time voting
        if (value === 1) {
          setLocalLikeCount(localLikeCount + 1);
        } else {
          setLocalDislikeCount(localDislikeCount + 1);
        }
      } else if (currentVote !== value) {
        // Changing vote (like to dislike or vice versa)
        if (currentVote === 1) {
          // Like to dislike
          setLocalLikeCount(Math.max(0, localLikeCount - 1));
          setLocalDislikeCount(localDislikeCount + 1);
        } else {
          // Dislike to like
          setLocalDislikeCount(Math.max(0, localDislikeCount - 1));
          setLocalLikeCount(localLikeCount + 1);
        }
      }

      setLocalVote(newVote);
    }

    try {
      const success = await onVote(comment.id, value);
      if (!success) {
        // Revert on failure
        setLocalVote(currentVote || 0);
        // Revert like/dislike counts too
        if (currentVote === 1) {
          setLocalLikeCount(Math.max(0, localLikeCount - 1));
        } else if (currentVote === -1) {
          setLocalDislikeCount(Math.max(0, localDislikeCount - 1));
        }
        toast.error("Failed to save your vote");
      }
    } catch (error) {
      console.error("Voting error:", error);
      // Revert on error
      setLocalVote(currentVote || 0);
      // Revert like/dislike counts too
      if (currentVote === 1) {
        setLocalLikeCount(Math.max(0, localLikeCount - 1));
      } else if (currentVote === -1) {
        setLocalDislikeCount(Math.max(0, localDislikeCount - 1));
      }
      toast.error("Failed to save your vote");
    }
  };

  return (
    <Card className="mb-3 sm:mb-4">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 mb-3">
          <div className="flex items-center space-x-2 min-w-0">
            <Avatar
              src={comment.users?.avatar_url || comment.profiles?.avatar_url}
              alt={comment.users?.display_name || comment.profiles?.display_name || "Anonymous"}
              size="sm"
              fallbackText={comment.users?.display_name || comment.profiles?.display_name || "Anonymous"}
            />
            <span className="font-medium text-xs sm:text-sm truncate">
              {comment.users?.display_name || comment.profiles?.display_name || "Anonymous"}
            </span>
          </div>
          <div className="flex items-center space-x-1 text-xs text-muted-foreground flex-shrink-0">
            <Calendar className="h-3 w-3" />
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

        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Edit your comment..."
              rows={3}
            />
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 sm:justify-end">
              <Button onClick={handleEdit} size="sm" className="text-xs sm:text-sm">
                <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setEditText(comment.text);
                }}
                className="text-xs sm:text-sm"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3 p-2 sm:p-3 bg-muted/50 rounded-lg">
              <p className="text-xs sm:text-sm leading-relaxed">
                {displayText}
              </p>
              {isLongComment && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-blue-600 hover:text-blue-800 mt-2 font-medium transition-colors"
                >
                  {isExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:items-center sm:justify-between">
              {/* Vote buttons and net score */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVote(1)}
                  disabled={isOptimistic || comment.id.startsWith("temp-")}
                  className={`h-7 sm:h-8 text-xs sm:text-sm transition-colors ${currentVote === 1
                    ? "bg-green-100 border-green-500 text-green-700 hover:bg-green-200"
                    : "hover:bg-green-50 hover:border-green-300"
                    }`}
                >
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  {localLikeCount > 0 ? localLikeCount : 0}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVote(-1)}
                  disabled={isOptimistic || comment.id.startsWith("temp-")}
                  className={`h-7 sm:h-8 text-xs sm:text-sm transition-colors ${currentVote === -1
                    ? "bg-red-100 border-red-500 text-red-700 hover:bg-red-200"
                    : "hover:bg-red-50 hover:border-red-300"
                    }`}
                >
                  <ThumbsDown className="h-3 w-3 mr-1" />
                  {localDislikeCount > 0 ? localDislikeCount : 0}
                </Button>

                {/* Net Score Badge */}
                {(localLikeCount > 0 || localDislikeCount > 0) && (
                  <Badge
                    variant="secondary"
                    className={`h-7 text-xs flex items-center space-x-1 ${(localLikeCount - localDislikeCount) > 0
                      ? "bg-green-50 text-green-700 border-green-200"
                      : (localLikeCount - localDislikeCount) < 0
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                  >
                    {(localLikeCount - localDislikeCount) > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (localLikeCount - localDislikeCount) < 0 ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : null}
                    <span>{localLikeCount - localDislikeCount > 0 ? '+' : ''}{localLikeCount - localDislikeCount}</span>
                  </Badge>
                )}
              </div>

              {/* Edit/Delete buttons */}
              {isOwnComment && !isOptimistic && (
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="h-7 sm:h-8 text-xs sm:text-sm"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 sm:h-8 text-xs sm:text-sm text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this comment? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteConfirm}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}

              {/* Show loading indicator for optimistic comments */}
              {isOptimistic && isOwnComment && (
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
