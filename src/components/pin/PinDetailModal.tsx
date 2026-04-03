"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  commentSortManager,
  type SortCriteria,
} from "@/lib/comment-sort-manager";
import type { Comment, EnhancedComment } from "@/types";
import { PinIcon } from "@/components/icons/PinIcon";
import { MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";
import CommentItem from "../map/CommentItem";
import CommentSortDropdown from "../map/CommentSortDropdown";
import CommentForm from "./CommentForm";
import PinActions from "./PinActions";

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
  const [sortBy, setSortBy] = useState<SortCriteria>("newest");

  const userAlreadyCommented = useMemo(() => {
    if (!currentUserId || !comments) return false;
    return comments.some((comment) => comment.user_id === currentUserId);
  }, [currentUserId, comments]);

  const sortedComments = useMemo(() => {
    return commentSortManager.sortComments(comments, sortBy);
  }, [comments, sortBy]);

  const commentCount = comments.length;
  const isHot = commentCount > 10;
  const isActive = commentCount > 0;

  const accentColor = isHot
    ? "bg-amber-500 shadow-[0_2px_8px_-2px_rgba(245,158,11,0.4)]"
    : isActive
    ? "bg-emerald-500 shadow-[0_2px_8px_-2px_rgba(16,185,129,0.4)]"
    : "bg-zinc-400 dark:bg-zinc-600";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl h-[85vh] sm:h-[80vh] flex flex-col p-0 gap-0 overflow-hidden border-none shadow-2xl">
        {/* Header */}
        <DialogHeader className="flex-shrink-0 px-5 pt-5 pb-4 space-y-0">
          <div className="flex items-start gap-3 mb-3">
            <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${accentColor} flex items-center justify-center`}>
              <PinIcon className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-bold text-foreground leading-tight tracking-tight">
                {pinName}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
                <MessageCircle className="h-3.5 w-3.5" />
                <span>
                  {commentCount}{" "}
                  {commentCount === 1 ? "comment" : "comments"}
                </span>
              </DialogDescription>
            </div>
          </div>

          {/* Actions row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/40">
            <PinActions
              pinCoordinates={pinCoordinates}
              pinId={pinId}
              pinName={pinName}
              onRefresh={onRefresh}
            />
            {comments.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground/70 hidden sm:inline">
                  Sort:
                </span>
                <CommentSortDropdown
                  currentSort={sortBy}
                  onSortChange={setSortBy}
                />
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Comments */}
        <ScrollArea className="flex-1 min-h-0 px-5">
          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl border border-border/50"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 w-24 bg-muted animate-pulse rounded-md" />
                      <div className="h-2.5 w-16 bg-muted animate-pulse rounded-md" />
                    </div>
                  </div>
                  <div className="space-y-2 pl-12">
                    <div className="h-3 w-full bg-muted animate-pulse rounded-md" />
                    <div className="h-3 w-2/3 bg-muted animate-pulse rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4 animate-[fadeSlideIn_0.4s_ease_both]">
              <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                <MessageCircle className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <h3 className="text-sm font-semibold mb-1.5 text-foreground">
                No comments yet
              </h3>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                Be the first to share your opinion about this place
              </p>
            </div>
          ) : (
            <div className="space-y-3 pb-2">
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
        <div className="border-t border-border/40 bg-muted/20 px-5 py-4 flex-shrink-0">
          <CommentForm
            onSubmit={onAddComment}
            pinId={pinId}
            currentUserId={currentUserId}
            userAlreadyCommented={userAlreadyCommented}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
