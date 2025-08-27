"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  commentSortManager,
  type SortCriteria,
} from "@/lib/comment-sort-manager";
import type { Comment, EnhancedComment } from "@/types";
import {
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  RefreshCcw,
  Send,
} from "lucide-react";
import { useMemo, useState } from "react";
import CommentItem from "./CommentItem";
import CommentSortDropdown from "./CommentSortDropdown";

interface PinDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  pinName: string;
  pinCoordinates?: { lat: number; lng: number };
  comments: (Comment | EnhancedComment)[];
  onAddComment: (text: string) => Promise<boolean>;
  onEditComment: (commentId: string, newText: string) => Promise<boolean>;
  onDeleteComment: (commentId: string) => Promise<boolean>;
  onVoteComment: (commentId: string, value: number) => Promise<boolean>;
  currentUserId: string;
  loading?: boolean;
  onRefresh?: () => void;
}

export default function PinDetailModal({
  isOpen,
  onClose,
  pinName,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const commentText = newComment.trim();
    setNewComment(""); // Clear input immediately

    try {
      const success = await onAddComment(commentText);
      if (success) {
        // Focus back to input after successful addition
        setTimeout(() => {
          const input = document.querySelector(
            'input[placeholder="Share your thoughts..."]'
          ) as HTMLInputElement;
          if (input) input.focus();
        }, 100);
      } else {
        // Restore input on failure
        setNewComment(commentText);
      }
    } catch (error) {
      console.error("Comment addition error:", error);
      // Restore input on error
      setNewComment(commentText);
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
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts..."
              className="flex-1 text-sm sm:text-base"
            />
            <Button
              type="submit"
              disabled={!newComment.trim()}
              size="sm"
              className="px-3"
            >
              <Send className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline ml-2">Send</span>
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
