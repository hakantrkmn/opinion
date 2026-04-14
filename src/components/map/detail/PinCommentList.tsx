"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { Comment, EnhancedComment } from "@/types";
import { MessageCircle } from "lucide-react";
import CommentItem from "../CommentItem";

interface PinCommentListProps {
  comments: (Comment | EnhancedComment)[];
  currentUserId: string;
  loading?: boolean;
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
}

export function PinCommentList({
  comments,
  currentUserId,
  loading = false,
  onEditComment,
  onDeleteComment,
  onVoteComment,
}: PinCommentListProps) {
  return (
    <ScrollArea className="min-h-0 flex-1 px-5 sm:px-7">
      {loading ? (
        <div className="space-y-3 py-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-border/50 p-4"
              style={{ animationDelay: `${item * 100}ms` }}
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-24 rounded-md bg-muted animate-pulse" />
                  <div className="h-2.5 w-16 rounded-md bg-muted animate-pulse" />
                </div>
              </div>
              <div className="space-y-2 pl-12">
                <div className="h-3 w-full rounded-md bg-muted animate-pulse" />
                <div className="h-3 w-2/3 rounded-md bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center px-4 py-10 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/30">
            <MessageCircle className="h-8 w-8 text-muted-foreground/30" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No comments yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Be the first to share your opinion about this place.
          </p>
        </div>
      ) : (
        <div className="space-y-3 pb-4">
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
  );
}
