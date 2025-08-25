"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Comment } from "@/types";
import { Loader2, MapPin, MessageCircle, RefreshCcw, Send } from "lucide-react";
import { useState } from "react";
import CommentItem from "./CommentItem";

interface PinDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  pinName: string;
  comments: Comment[];
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

  const handleRefresh = async () => {
    if (refreshing || !onRefresh) return;

    setRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
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
        <DialogHeader className="flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg sm:text-xl truncate">{pinName}</DialogTitle>
                <DialogDescription className="flex items-center gap-1 mt-1 text-xs sm:text-sm">
                  <MessageCircle className="h-3 w-3 flex-shrink-0" />
                  {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                </DialogDescription>
              </div>
            </div>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex-shrink-0"
              >
                <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline ml-2">Refresh</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Comments */}
        <ScrollArea className="flex-1 min-h-0 pr-2 sm:pr-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mb-4" />
              <p className="text-sm sm:text-base text-muted-foreground">Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center px-4">
              <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
              <h3 className="text-sm sm:text-base font-medium mb-2">No comments yet</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Be the first to share your thoughts!</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {comments.map((comment) => (
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
            <Button type="submit" disabled={!newComment.trim()} size="sm" className="px-3">
              <Send className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline ml-2">Send</span>
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
