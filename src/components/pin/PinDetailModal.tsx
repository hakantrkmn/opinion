"use client";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogPanel,
} from "@/components/ui/responsive-dialog";
import {
  commentSortManager,
  type SortCriteria,
} from "@/lib/comment-sort-manager";
import type { Comment, EnhancedComment } from "@/types";
import { useMemo, useState } from "react";
import { PinCommentComposer } from "../map/detail/PinCommentComposer";
import { PinCommentList } from "../map/detail/PinCommentList";
import { PinDetailHeader } from "../map/detail/PinDetailHeader";

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

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onClose}>
      <ResponsiveDialogContent
        mobileClassName="max-h-[92dvh] overflow-hidden"
        desktopClassName="overflow-hidden sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:h-[min(39rem,calc(100dvh-8rem))] sm:max-h-[calc(100dvh-8rem)] sm:w-[min(50rem,calc(100vw-10rem))] sm:max-w-[min(50rem,calc(100vw-10rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.75rem]"
      >
        <ResponsiveDialogPanel title={pinName} headerClassName="sr-only">
          <div className="flex min-h-0 flex-1 flex-col">
            <PinDetailHeader
              pinId={pinId}
              pinName={pinName}
              pinCoordinates={pinCoordinates}
              commentCount={commentCount}
              sortBy={sortBy}
              onSortChange={setSortBy}
              onRefresh={onRefresh}
            />
            <PinCommentList
              comments={sortedComments}
              currentUserId={currentUserId}
              loading={loading}
              onEditComment={onEditComment}
              onDeleteComment={onDeleteComment}
              onVoteComment={onVoteComment}
            />
            <PinCommentComposer
              pinId={pinId}
              currentUserId={currentUserId}
              userAlreadyCommented={userAlreadyCommented}
              onAddComment={onAddComment}
            />
          </div>
        </ResponsiveDialogPanel>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
