"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CommentItem } from "@/types/api";
import { AlertCircle, Loader2, MessageCircle } from "lucide-react";
import { useCallback } from "react";
import {
  useDeleteComment,
  useEditComment,
  useVoteComment,
} from "../hooks/useCommentMutations";
import type { usePinComments } from "../hooks/usePinComments";
import { nextVote } from "../lib/vote";
import { CommentCard } from "./CommentCard";

interface CommentListProps {
  pinId: string;
  query: ReturnType<typeof usePinComments>;
  currentUserId: string | null;
  onRequireSignIn: () => void;
  onPinDeleted: () => void;
}

export function CommentList({
  pinId,
  query,
  currentUserId,
  onRequireSignIn,
  onPinDeleted,
}: CommentListProps) {
  const vote = useVoteComment(pinId);
  const edit = useEditComment(pinId);
  const remove = useDeleteComment(pinId, { onPinDeleted });

  const voteMutate = vote.mutate;
  const onVote = useCallback(
    (comment: CommentItem, clicked: 1 | -1) => {
      if (!currentUserId) return onRequireSignIn();
      voteMutate({ commentId: comment.id, value: nextVote(comment.my_vote, clicked) });
    },
    [currentUserId, onRequireSignIn, voteMutate]
  );

  const editMutateAsync = edit.mutateAsync;
  const onEdit = useCallback(
    async (
      comment: CommentItem,
      values: { text: string; photo: File | null | undefined }
    ) => {
      try {
        await editMutateAsync({ commentId: comment.id, ...values });
        return true;
      } catch {
        return false; // toasted by the mutation
      }
    },
    [editMutateAsync]
  );

  const removeMutate = remove.mutate;
  const onDelete = useCallback(
    (comment: CommentItem) => removeMutate(comment.id),
    [removeMutate]
  );

  if (query.isPending) return <CommentSkeletons />;

  if (query.isError && query.comments.length === 0) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 px-4 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertCircle className="size-5 text-destructive" />
        </span>
        <div>
          <p className="text-sm font-semibold">Couldn&apos;t load comments</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Check your connection and try again.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-xl px-4"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          {query.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Retry
        </Button>
      </div>
    );
  }

  if (query.comments.length === 0) {
    return (
      <div className="flex flex-col items-center px-4 py-12 text-center">
        <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted">
          <MessageCircle className="size-5 text-muted-foreground" />
        </span>
        <p className="text-sm font-semibold">No comments yet</p>
        <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
          Be the first to share your opinion about this place.
        </p>
      </div>
    );
  }

  const editingId = edit.isPending ? edit.variables?.commentId : undefined;
  const deletingId = remove.isPending ? remove.variables : undefined;

  return (
    <div className="flex flex-col gap-3 py-4">
      {query.comments.map((comment) => (
        <CommentCard
          key={comment.id}
          comment={comment}
          currentUserId={currentUserId}
          isEditingPending={editingId === comment.id}
          isDeleting={deletingId === comment.id}
          onVote={onVote}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
      {query.hasNextPage ? (
        <Button
          variant="ghost"
          className="h-10 w-full rounded-xl text-xs text-muted-foreground"
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : null}
          Show more comments
        </Button>
      ) : null}
    </div>
  );
}

function CommentSkeletons() {
  return (
    <div className="flex flex-col gap-3 py-4" aria-busy="true" aria-label="Loading comments">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-border/50 p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2.5 w-14" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className={i === 1 ? "h-3 w-1/2" : "h-3 w-2/3"} />
          </div>
          <div className="mt-4 flex gap-2 border-t border-border/30 pt-3">
            <Skeleton className="h-6 w-12 rounded-lg" />
            <Skeleton className="h-6 w-12 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
