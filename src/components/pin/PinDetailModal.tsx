"use client";

import CameraCapture from "@/components/CameraCapture";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  commentSortManager,
  type SortCriteria,
} from "@/lib/comment-sort-manager";
import { uploadCommentPhoto } from "@/lib/supabase/photoService";
import type {
  CameraCapture as CameraCaptureType,
  Comment,
  EnhancedComment,
} from "@/types";
import {
  Loader2,
  LogIn,
  MapPin,
  MessageCircle,
  Navigation,
  RefreshCcw,
  Send,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import CommentItem from "../map/CommentItem";
import CommentSortDropdown from "../map/CommentSortDropdown";

interface PinDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  pinName: string;
  pinId: string;
  pinCoordinates?: { lat: number; lng: number };
  comments: (Comment | EnhancedComment)[];
  onAddComment: (
    text: string,
    photoUrl?: string,
    photoMetadata?: Record<string, unknown>
  ) => Promise<boolean>;
  onEditComment: (
    commentId: string,
    newText: string,
    photoUrl?: string | null,
    photoMetadata?: Record<string, unknown>
  ) => Promise<boolean>;
  onDeleteComment: (commentId: string) => Promise<boolean>;
  onVoteComment: (
    commentId: string,
    value: number,
    pinId: string
  ) => Promise<boolean>;
  currentUserId: string;
  loading?: boolean;
  onRefresh?: () => void;
}

export default function PinDetailModal({
  isOpen,
  onClose,
  pinName,
  pinId,
  pinCoordinates,
  comments,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onVoteComment,
  currentUserId,
  loading = false,
  onRefresh,
}: PinDetailModalProps) {
  const [newComment, setNewComment] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortCriteria>("newest");
  const [capturedPhoto, setCapturedPhoto] = useState<CameraCaptureType | null>(
    null
  );
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = "auto";
      // Set height based on content, with min and max constraints
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 60), 120);
      textarea.style.height = `${newHeight}px`;
    }
  }, [newComment]);

  // User comment info - calculated from existing comments
  const userCommentInfo = useMemo(() => {
    if (!currentUserId || !comments) {
      return { hasCommented: false, commentId: undefined };
    }

    const userComment = comments.find(
      (comment) => comment.user_id === currentUserId
    );
    return {
      hasCommented: !!userComment,
      commentId: userComment?.id,
    };
  }, [currentUserId, comments]);

  const userAlreadyCommented = userCommentInfo.hasCommented;

  // Sort comments based on selected criteria
  const sortedComments = useMemo(() => {
    return commentSortManager.sortComments(comments, sortBy);
  }, [comments, sortBy]);

  const handleRefresh = async () => {
    if (refreshing || !onRefresh) return;

    console.log("Refreshing comments...");
    setRefreshing(true);
    try {
      await onRefresh();
      console.log("Comments refreshed successfully");
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDirections = () => {
    if (!pinCoordinates) return;

    const { lat, lng } = pinCoordinates;
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

    window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
  };

  const handleShare = async () => {
    if (!pinCoordinates) return;

    const { lat, lng } = pinCoordinates;
    const currentUrl = window.location.origin;
    const shareUrl = `${currentUrl}/?lat=${lat.toFixed(6)}&long=${lng.toFixed(
      6
    )}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!", {
        description: "Share this link to show others this location",
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      // Fallback: show the URL in a toast for manual copying
      toast.info("Share URL", {
        description: shareUrl,
        duration: 5000,
      });
    }
  };

  // Handle photo capture from camera
  const handlePhotoCapture = (capture: CameraCaptureType) => {
    setCapturedPhoto(capture);
    console.log("Photo captured for comment:", {
      fileName: capture.file.name,
      fileSize: capture.file.size,
      hasPreview: !!capture.preview,
    });
  };

  // Handle photo removal
  const handleRemovePhoto = () => {
    if (capturedPhoto?.preview) {
      URL.revokeObjectURL(capturedPhoto.preview);
    }
    setCapturedPhoto(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() && !capturedPhoto) {
      toast.info("Add text or photo", {
        description: "Please write something or capture a photo",
      });
      return;
    }

    // Check if user is authenticated
    if (!currentUserId) {
      toast.info("Sign in to add comments", {
        description: "Create an account to share your thoughts",
        action: {
          label: "Sign In",
          onClick: () => (window.location.href = "/auth"),
        },
      });
      return;
    }

    const commentText = newComment.trim();
    setIsUploading(true);
    setNewComment(""); // Clear input immediately

    try {
      let photoUrl: string | undefined;
      let photoMetadata: Record<string, unknown> | undefined;

      // Upload photo if captured
      if (capturedPhoto) {
        console.log("Uploading photo with comment...");
        const uploadResult = await uploadCommentPhoto(
          capturedPhoto.file,
          currentUserId
        );

        if (uploadResult.success && uploadResult.url) {
          photoUrl = uploadResult.url;
          photoMetadata = uploadResult.metadata;
          console.log("Photo uploaded successfully:", photoUrl);
        } else {
          throw new Error(uploadResult.error || "Photo upload failed");
        }
      }

      // Submit comment with photo data
      const success = await onAddComment(commentText, photoUrl, photoMetadata);

      if (success) {
        // Clear photo after successful submission
        if (capturedPhoto) {
          handleRemovePhoto();
        }

        // Focus back to input after successful addition
        setTimeout(() => {
          const input = document.querySelector(
            'input[placeholder="Share your thoughts..."]'
          ) as HTMLInputElement;
          if (input) input.focus();
        }, 100);

        toast.success("Comment added successfully!", {
          description: capturedPhoto
            ? "Comment with photo posted"
            : "Comment posted",
        });
      } else {
        // Restore input on failure
        setNewComment(commentText);
      }
    } catch (error) {
      console.error("Comment submission error:", error);

      // Restore input on error
      setNewComment(commentText);

      toast.error("Failed to add comment", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl h-[85vh] sm:h-[80vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0 space-y-4">
          {/* Pin Title and Description */}
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-semibold text-foreground leading-tight">
                {pinName}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <MessageCircle className="h-4 w-4 flex-shrink-0" />
                <span>
                  {comments.length}{" "}
                  {comments.length === 1 ? "comment" : "comments"}
                </span>
              </DialogDescription>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
            {/* Primary Actions */}
            <div className="flex items-center gap-2">
              {pinCoordinates && (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleDirections}
                    title="Get directions in Google Maps"
                    className="flex items-center gap-2 h-8 px-3"
                  >
                    <Navigation className="h-4 w-4" />
                    <span className="hidden sm:inline text-sm">
                      Get Directions
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                    title="Share this location"
                    className="flex items-center gap-2 h-8 px-3"
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline text-sm">Share</span>
                  </Button>
                </>
              )}
            </div>

            {/* Secondary Actions */}
            <div className="flex items-center gap-2">
              {comments.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Sort by:
                  </span>
                  <CommentSortDropdown
                    currentSort={sortBy}
                    onSortChange={setSortBy}
                  />
                </div>
              )}
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  title="Refresh comments"
                  className="flex items-center gap-2 h-8 px-3"
                >
                  <RefreshCcw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  <span className="hidden sm:inline text-sm">Refresh</span>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Comments */}
        <ScrollArea className="flex-1 min-h-0 pr-2 sm:pr-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mb-4" />
              <p className="text-sm sm:text-base text-muted-foreground">
                Loading comments...
              </p>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center px-4">
              <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
              <h3 className="text-sm sm:text-base font-medium mb-2">
                No comments yet
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Be the first to share your thoughts!
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {sortedComments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={currentUserId}
                  onEdit={onEditComment}
                  onDelete={onDeleteComment}
                  onVote={onVoteComment}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Add Comment */}
        <div className="border-t pt-3 sm:pt-4 flex-shrink-0">
          {currentUserId ? (
            userAlreadyCommented ? (
              <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg border border-dashed">
                <div className="text-center">
                  <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <h3 className="text-sm font-medium mb-1">
                    You already commented on this pin
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Each user can only make one comment per pin. You can edit or
                    delete your existing comment.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Photo Preview */}
                {capturedPhoto && (
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <Image
                      src={capturedPhoto.preview}
                      alt="Captured photo preview"
                      width={48}
                      height={48}
                      className="w-12 h-12 object-cover rounded border"
                      sizes="48px"
                      style={{ width: '48px', height: '48px' }}
                      loading="lazy"
                    />
                    <div className="flex-1 text-sm text-muted-foreground">
                      Photo ready to upload
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemovePhoto}
                      className="h-8 w-8 p-0"
                    >
                      ×
                    </Button>
                  </div>
                )}

                {/* Comment Input Form */}
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Text Area at Top */}
                  <Textarea
                    ref={textareaRef}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your thoughts..."
                    className="min-h-[60px] max-h-[120px] text-sm sm:text-base resize-none overflow-hidden"
                    disabled={isUploading}
                    rows={2}
                  />

                  {/* Action Buttons at Bottom */}
                  <div className="flex items-center gap-2">
                    {/* Camera Capture Button */}
                    {!capturedPhoto && (
                      <CameraCapture
                        onPhotoCapture={handlePhotoCapture}
                        disabled={isUploading}
                        className="flex-shrink-0"
                      />
                    )}

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={
                        (!newComment.trim() && !capturedPhoto) || isUploading
                      }
                      size="sm"
                      className="px-4 ml-auto"
                    >
                      {isUploading ? (
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                      <span className="hidden sm:inline ml-2">
                        {isUploading ? "Posting..." : "Send"}
                      </span>
                    </Button>
                  </div>
                </form>
              </div>
            )
          ) : (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-dashed">
              <div className="flex items-center gap-2">
                <LogIn className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Sign in to share your thoughts
                </span>
              </div>
              <Button asChild size="sm" variant="default">
                <Link href="/auth">Sign In</Link>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
