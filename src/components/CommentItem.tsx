"use client";

import CameraCapture from "@/components/CameraCapture";
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
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteCommentPhoto,
  uploadCommentPhoto,
} from "@/lib/supabase/photoService";
import type {
  CameraCapture as CameraCaptureType,
  Comment,
  EnhancedComment,
} from "@/types";
import {
  Calendar,
  Edit2,
  Image as ImageIcon,
  Loader2,
  Save,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface CommentItemProps {
  comment: Comment | EnhancedComment;
  currentUserId: string; // Will be empty string for non-authenticated users
  onEdit: (
    commentId: string,
    newText: string,
    photoUrl?: string | null,
    photoMetadata?: Record<string, unknown>
  ) => Promise<boolean>;
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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageTimeout, setImageTimeout] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  // Photo management for editing
  const [editPhotoAction, setEditPhotoAction] = useState<
    "keep" | "remove" | "replace"
  >("keep");
  const [editCapturedPhoto, setEditCapturedPhoto] =
    useState<CameraCaptureType | null>(null);
  const [isUploadingEdit, setIsUploadingEdit] = useState(false);

  // Timeout refs for proper cleanup
  const imageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cacheCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Character limit for comment text
  const CHARACTER_LIMIT = 200;

  // Check if this is an enhanced comment with optimistic data
  const isEnhancedComment = "isOptimistic" in comment;
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
  const [localDislikeCount, setLocalDislikeCount] =
    useState(initialDislikeCount);

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

  // Reset image states when photo URL changes and setup timeout
  useEffect(() => {
    if (comment.photo_url) {
      console.log("CommentItem: Photo URL changed:", {
        commentId: comment.id,
        photoUrl: comment.photo_url,
        isValid: comment.photo_url.includes("supabase"),
      });
    }

    // Clear any existing timeouts
    if (imageTimeoutRef.current) {
      clearTimeout(imageTimeoutRef.current);
      imageTimeoutRef.current = null;
    }
    if (cacheCheckTimeoutRef.current) {
      clearTimeout(cacheCheckTimeoutRef.current);
      cacheCheckTimeoutRef.current = null;
    }

    setImageLoaded(false);
    setImageError(false);
    setImageTimeout(false);

    // Set a timeout for image loading (15 seconds, increased for slower connections)
    if (comment.photo_url) {
      imageTimeoutRef.current = setTimeout(() => {
        // Check if timeout ref is still valid (not cleared by successful load)
        if (imageTimeoutRef.current) {
          console.warn(
            "Image loading timeout triggered - will check current state in render",
            comment.photo_url
          );
          setImageTimeout(true);
        }
      }, 15000); // 15 seconds
    }

    return () => {
      if (imageTimeoutRef.current) {
        clearTimeout(imageTimeoutRef.current);
        imageTimeoutRef.current = null;
      }
      if (cacheCheckTimeoutRef.current) {
        clearTimeout(cacheCheckTimeoutRef.current);
        cacheCheckTimeoutRef.current = null;
      }
    };
  }, [comment.photo_url, comment.id]);

  // Additional check for cached images after a short delay
  useEffect(() => {
    if (comment.photo_url && !imageLoaded && !imageError && !imageTimeout) {
      cacheCheckTimeoutRef.current = setTimeout(() => {
        // Only proceed if still not loaded and no timeout yet
        if (!imageLoaded && !imageError && !imageTimeout) {
          // Create a test image to check if it's already in browser cache
          const testImg = new Image();
          testImg.onload = () => {
            console.log(
              "Image detected in cache, forcing display:",
              comment.photo_url
            );
            setImageLoaded(true);
            setImageTimeout(false);
            // Clear the main timeout since image is now loaded
            if (imageTimeoutRef.current) {
              clearTimeout(imageTimeoutRef.current);
              imageTimeoutRef.current = null;
            }
          };
          testImg.onerror = () => {
            console.log("Image not in cache or failed to load");
          };
          testImg.src = comment.photo_url!;
        }
      }, 1000); // Check after 1 second
    }

    return () => {
      if (cacheCheckTimeoutRef.current) {
        clearTimeout(cacheCheckTimeoutRef.current);
        cacheCheckTimeoutRef.current = null;
      }
    };
  }, [comment.photo_url, imageLoaded, imageError, imageTimeout]);

  // Handle keyboard events for full image modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showFullImage) {
        setShowFullImage(false);
      }
    };

    if (showFullImage) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [showFullImage]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (imageTimeoutRef.current) {
        clearTimeout(imageTimeoutRef.current);
        imageTimeoutRef.current = null;
      }
      if (cacheCheckTimeoutRef.current) {
        clearTimeout(cacheCheckTimeoutRef.current);
        cacheCheckTimeoutRef.current = null;
      }
    };
  }, []);

  const isOwnComment = comment.user_id === currentUserId;

  // Use local state, fallback to comment props
  const currentVote =
    localVote !== undefined ? localVote : comment.user_vote || 0;

  // Check if comment text exceeds character limit
  const isLongComment = comment.text.length > CHARACTER_LIMIT;
  const displayText =
    isLongComment && !isExpanded
      ? comment.text.slice(0, CHARACTER_LIMIT) + "..."
      : comment.text;

  const handleEdit = async () => {
    if (!editText.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    setIsUploadingEdit(true);

    try {
      let photoUrl: string | null | undefined;
      let photoMetadata: Record<string, unknown> | undefined;

      // Handle photo operations based on edit action
      if (editPhotoAction === "remove") {
        // Remove existing photo
        photoUrl = null; // null means remove existing photo

        // Delete from storage if there was an existing photo
        if (comment.photo_url) {
          await deleteCommentPhoto(comment.photo_url);
        }
      } else if (editPhotoAction === "replace" && editCapturedPhoto) {
        // Replace with new photo
        console.log("Uploading new photo for comment edit...");
        const uploadResult = await uploadCommentPhoto(
          editCapturedPhoto.file,
          currentUserId
        );

        if (uploadResult.success && uploadResult.url) {
          photoUrl = uploadResult.url;
          photoMetadata = uploadResult.metadata;
          console.log("New photo uploaded successfully:", photoUrl);

          // Delete old photo if it exists
          if (comment.photo_url) {
            await deleteCommentPhoto(comment.photo_url);
          }
        } else {
          throw new Error(uploadResult.error || "Photo upload failed");
        }
      }
      // If editPhotoAction === 'keep', photoUrl stays undefined (no change)

      const success = await onEdit(
        comment.id,
        editText.trim(),
        photoUrl,
        photoMetadata
      );
      if (success) {
        setIsEditing(false);
        // Reset photo edit state
        setEditPhotoAction("keep");
        setEditCapturedPhoto(null);
        toast.success("Comment updated successfully");
      } else {
        toast.error("Failed to update comment");
      }
    } catch (error) {
      console.error("Edit error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update comment"
      );
    } finally {
      setIsUploadingEdit(false);
    }
  };

  // Photo management handlers for edit mode
  const handleEditPhotoCapture = (capturedPhoto: CameraCaptureType) => {
    setEditCapturedPhoto(capturedPhoto);
    setEditPhotoAction("replace");
  };

  const handleRemoveEditPhoto = () => {
    setEditCapturedPhoto(null);
    if (comment.photo_url) {
      setEditPhotoAction("remove");
    } else {
      setEditPhotoAction("keep");
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(comment.text);
    setEditPhotoAction("keep");
    setEditCapturedPhoto(null);
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
    // Check if user is authenticated
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
              alt={
                comment.users?.display_name ||
                comment.profiles?.display_name ||
                "Anonymous"
              }
              size="sm"
              fallbackText={
                comment.users?.display_name ||
                comment.profiles?.display_name ||
                "Anonymous"
              }
            />
            <span className="font-medium text-xs sm:text-sm truncate">
              {comment.users?.display_name ||
                comment.profiles?.display_name ||
                "Anonymous"}
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
            {/* Text editing */}
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Edit your comment..."
              rows={3}
            />

            {/* Photo management section */}
            <div className="space-y-2">
              {/* Current photo display */}
              {comment.photo_url && editPhotoAction !== "remove" && (
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                  <img
                    src={comment.photo_url}
                    alt="Current photo"
                    className="w-12 h-12 object-cover rounded border"
                  />
                  <div className="flex-1 text-sm text-muted-foreground">
                    Current photo
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditPhotoAction("remove")}
                    className="h-8 text-xs"
                  >
                    Remove
                  </Button>
                </div>
              )}

              {/* New photo preview */}
              {editCapturedPhoto && (
                <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                  <img
                    src={editCapturedPhoto.preview}
                    alt="New photo preview"
                    className="w-12 h-12 object-cover rounded border"
                  />
                  <div className="flex-1 text-sm text-green-700">
                    {comment.photo_url
                      ? "Replacing with new photo"
                      : "New photo ready"}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveEditPhoto}
                    className="h-8 w-8 p-0"
                  >
                    ×
                  </Button>
                </div>
              )}

              {/* Photo removed indicator */}
              {editPhotoAction === "remove" && comment.photo_url && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <div className="w-12 h-12 flex items-center justify-center bg-red-100 rounded border">
                    <X className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="flex-1 text-sm text-red-700">
                    Photo will be removed
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditPhotoAction("keep")}
                    className="h-8 text-xs"
                  >
                    Undo
                  </Button>
                </div>
              )}

              {/* Camera capture for adding/replacing photo */}
              {(!comment.photo_url || editPhotoAction === "remove") &&
                !editCapturedPhoto && (
                  <CameraCapture
                    onPhotoCapture={handleEditPhotoCapture}
                    className="w-full"
                  />
                )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 sm:justify-end">
              <Button
                onClick={handleEdit}
                size="sm"
                disabled={isUploadingEdit}
                className="text-xs sm:text-sm"
              >
                {isUploadingEdit ? (
                  <>
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Save
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isUploadingEdit}
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

            {/* Photo Thumbnail Display */}
            {comment.photo_url && (
              <div className="mb-3 relative">
                <div className="relative inline-block">
                  {/* Show timeout only if image genuinely hasn't loaded and no error */}
                  {!imageError && (!imageTimeout || imageLoaded) ? (
                    <>
                      {!imageLoaded && (
                        <div className="w-20 h-20 flex items-center justify-center bg-muted rounded-lg">
                          <ImageIcon className="h-6 w-6 text-muted-foreground animate-pulse" />
                        </div>
                      )}
                      <img
                        src={comment.photo_url}
                        alt="Comment photo"
                        className={`w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity duration-200 ${
                          imageLoaded ? "opacity-100" : "opacity-0"
                        }`}
                        onClick={() => setShowFullImage(true)}
                        onLoad={(e) => {
                          const img = e.target as HTMLImageElement;
                          console.log("Image loaded successfully:", {
                            url: comment.photo_url,
                            naturalWidth: img.naturalWidth,
                            naturalHeight: img.naturalHeight,
                            complete: img.complete,
                          });
                          setImageLoaded(true);
                          setImageTimeout(false);
                          // Clear the timeout since image loaded successfully
                          if (imageTimeoutRef.current) {
                            clearTimeout(imageTimeoutRef.current);
                            imageTimeoutRef.current = null;
                          }
                        }}
                        onError={(e) => {
                          console.error("Failed to load comment photo:", {
                            url: comment.photo_url,
                            error: e,
                            naturalWidth: (e.target as HTMLImageElement)
                              ?.naturalWidth,
                            naturalHeight: (e.target as HTMLImageElement)
                              ?.naturalHeight,
                          });
                          setImageError(true);
                        }}
                        loading="lazy"
                        style={{
                          display: imageLoaded ? "block" : "none",
                          minHeight: "1px",
                        }}
                        // Check if image is already loaded (cached)
                        ref={(img) => {
                          if (img && img.complete && img.naturalWidth > 0) {
                            console.log(
                              "Image already loaded (cached):",
                              comment.photo_url
                            );
                            setImageLoaded(true);
                            setImageTimeout(false);
                            // Clear timeout for cached images
                            if (imageTimeoutRef.current) {
                              clearTimeout(imageTimeoutRef.current);
                              imageTimeoutRef.current = null;
                            }
                          }
                        }}
                      />
                    </>
                  ) : (
                    <div className="w-20 h-20 flex items-center justify-center bg-muted rounded-lg">
                      <div className="flex flex-col items-center space-y-1">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground text-center">
                          {imageTimeout && !imageLoaded && !imageError
                            ? "Timeout"
                            : "Error"}
                        </span>
                        {comment.photo_url && (
                          <button
                            onClick={() => {
                              setImageError(false);
                              setImageTimeout(false);
                              setImageLoaded(false);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Full Image Modal */}
                {showFullImage && (
                  <div
                    className="fixed inset-0 backdrop-blur-md bg-white/20 z-50 flex items-center justify-center p-4"
                    onClick={() => setShowFullImage(false)}
                  >
                    <div className="relative max-w-4xl max-h-full">
                      <img
                        src={comment.photo_url}
                        alt="Comment photo - full size"
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={() => setShowFullImage(false)}
                        className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full bg-black bg-opacity-50"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:items-center sm:justify-between">
              {/* Vote buttons and net score */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVote(1)}
                  disabled={isOptimistic || comment.id.startsWith("temp-")}
                  className={`h-7 sm:h-8 text-xs sm:text-sm transition-colors ${
                    currentVote === 1
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
                  className={`h-7 sm:h-8 text-xs sm:text-sm transition-colors ${
                    currentVote === -1
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
                    className={`h-7 text-xs flex items-center space-x-1 ${
                      localLikeCount - localDislikeCount > 0
                        ? "bg-green-50 text-green-700 border-green-200"
                        : localLikeCount - localDislikeCount < 0
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    {localLikeCount - localDislikeCount > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : localLikeCount - localDislikeCount < 0 ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : null}
                    <span>
                      {localLikeCount - localDislikeCount > 0 ? "+" : ""}
                      {localLikeCount - localDislikeCount}
                    </span>
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
                          Are you sure you want to delete this comment? This
                          action cannot be undone.
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
