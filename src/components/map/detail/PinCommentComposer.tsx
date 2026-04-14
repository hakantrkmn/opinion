"use client";

import CommentForm from "@/components/pin/CommentForm";

interface PinCommentComposerProps {
  pinId: string;
  currentUserId: string;
  userAlreadyCommented: boolean;
  onAddComment: (
    text: string,
    photoUrl?: string,
    photoMetadata?: Record<string, unknown>
  ) => Promise<boolean>;
}

export function PinCommentComposer({
  pinId,
  currentUserId,
  userAlreadyCommented,
  onAddComment,
}: PinCommentComposerProps) {
  return (
    <div className="border-t border-border/40 bg-background/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm sm:px-7 sm:pt-5">
      <CommentForm
        onSubmit={onAddComment}
        pinId={pinId}
        currentUserId={currentUserId}
        userAlreadyCommented={userAlreadyCommented}
      />
    </div>
  );
}
