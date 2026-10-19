"use client";

import {
  adjustCommentsCount,
  removeCachedPin,
} from "@/features/pins/lib/cache";
import { uploadCommentPhoto } from "@/features/media/lib/upload";
import { errorMessage } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { CommentItem, VoteValue } from "@/types/api";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  deleteComment,
  patchComment as patchCommentRequest,
  postComment,
  putVote,
} from "../lib/api";
import {
  findComment,
  mapPages,
  patchComment,
  updateCommentLists,
} from "../lib/cache";
import { applyVote } from "../lib/vote";

/*
 * Toasts for comment actions live here and only here — components never
 * toast the outcome of these mutations themselves.
 */

function invalidateProfileLists(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.profile.comments });
  void queryClient.invalidateQueries({ queryKey: queryKeys.profile.pins });
  void queryClient.invalidateQueries({ queryKey: queryKeys.profile.stats });
}

export function useAddComment(pinId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ text, photo }: { text: string; photo?: File | null }) => {
      const photo_url = photo ? (await uploadCommentPhoto(photo)).url : undefined;
      return postComment(pinId, { text, photo_url });
    },
    onSuccess: ({ comment }) => {
      updateCommentLists(queryClient, pinId, (data, sort) =>
        mapPages(data, (page, i) => {
          const base = { ...page, total: page.total + 1, my_comment_id: comment.id };
          if (sort === "oldest") {
            const isLast = i === data.pages.length - 1;
            return isLast && !page.has_more
              ? { ...base, comments: [...page.comments, comment] }
              : base;
          }
          return i === 0 ? { ...base, comments: [comment, ...page.comments] } : base;
        })
      );
      adjustCommentsCount(queryClient, pinId, 1);
      // Background refresh puts it in the right place for "popular".
      void queryClient.invalidateQueries({
        queryKey: queryKeys.pins.commentsAll(pinId),
      });
      invalidateProfileLists(queryClient);
      toast.success("Comment posted");
    },
    onError: (error) => {
      toast.error("Couldn't post your comment", {
        description: errorMessage(error),
      });
    },
  });
}

export function useEditComment(pinId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      commentId,
      text,
      photo,
    }: {
      commentId: string;
      text: string;
      /** File = replace, null = remove, undefined = keep. */
      photo: File | null | undefined;
    }) => {
      const body: { text: string; photo_url?: string | null } = { text };
      if (photo === null) body.photo_url = null;
      else if (photo) body.photo_url = (await uploadCommentPhoto(photo)).url;
      return patchCommentRequest(commentId, body);
    },
    onSuccess: ({ comment }) => {
      updateCommentLists(queryClient, pinId, (data) =>
        patchComment(data, comment.id, (c) => ({
          ...comment,
          // keep the viewer's live vote state, the PATCH response may lag
          likes: c.likes,
          dislikes: c.dislikes,
          my_vote: c.my_vote,
        }))
      );
      invalidateProfileLists(queryClient);
      toast.success("Comment updated");
    },
    onError: (error) => {
      toast.error("Couldn't update your comment", {
        description: errorMessage(error),
      });
    },
  });
}

export function useDeleteComment(
  pinId: string,
  { onPinDeleted }: { onPinDeleted?: () => void } = {}
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: (result, commentId) => {
      if (result.pin_deleted) {
        removeCachedPin(queryClient, result.pin_id);
        onPinDeleted?.();
        toast.success("Comment deleted", {
          description: "It was the last comment, so the pin was removed too.",
        });
      } else {
        updateCommentLists(queryClient, pinId, (data) =>
          mapPages(data, (page) => ({
            ...page,
            total: Math.max(0, page.total - 1),
            my_comment_id:
              page.my_comment_id === commentId ? null : page.my_comment_id,
            comments: page.comments.filter((c) => c.id !== commentId),
          }))
        );
        adjustCommentsCount(queryClient, pinId, -1);
        toast.success("Comment deleted");
      }
      invalidateProfileLists(queryClient);
    },
    onError: (error) => {
      toast.error("Couldn't delete the comment", {
        description: errorMessage(error),
      });
    },
  });
}

type VoteVars = { commentId: string; value: VoteValue };
type VoteSnapshot = Pick<CommentItem, "likes" | "dislikes" | "my_vote">;

/**
 * Optimistic vote. Rollback restores only the voted comment's own fields
 * (never a whole-list snapshot), and a server response is only applied when
 * no newer vote on the same comment is still in flight.
 */
export function useVoteComment(pinId: string) {
  const queryClient = useQueryClient();
  const othersInFlight = (commentId: string) =>
    queryClient.isMutating({
      mutationKey: ["vote-comment"],
      predicate: (m) =>
        (m.state.variables as VoteVars | undefined)?.commentId === commentId,
    }) > 1;
  const setVoteState = (commentId: string, state: VoteSnapshot) =>
    updateCommentLists(queryClient, pinId, (data) =>
      patchComment(data, commentId, (c) => ({ ...c, ...state }))
    );

  return useMutation({
    mutationKey: ["vote-comment"],
    mutationFn: ({ commentId, value }: VoteVars) => putVote(commentId, value),
    onMutate: async ({ commentId, value }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.pins.commentsAll(pinId),
      });
      const current = findComment(queryClient, pinId, commentId);
      const previous: VoteSnapshot | undefined = current && {
        likes: current.likes,
        dislikes: current.dislikes,
        my_vote: current.my_vote,
      };
      updateCommentLists(queryClient, pinId, (data) =>
        patchComment(data, commentId, (c) => applyVote(c, value))
      );
      return { previous };
    },
    onSuccess: (server, { commentId }) => {
      if (!othersInFlight(commentId)) setVoteState(commentId, server);
    },
    onError: (error, { commentId }, context) => {
      if (context?.previous && !othersInFlight(commentId)) {
        setVoteState(commentId, context.previous);
      }
      toast.error("Couldn't save your vote", {
        description: errorMessage(error),
      });
    },
  });
}
