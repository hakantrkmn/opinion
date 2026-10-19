import { apiClient } from "@/lib/api/client";
import type {
  CommentResponse,
  CommentSort,
  DeleteCommentResponse,
  PinCommentsResponse,
  VoteResponse,
  VoteValue,
} from "@/types/api";

export const COMMENTS_PAGE_SIZE = 30;

export function fetchPinComments(
  pinId: string,
  sort: CommentSort,
  offset: number,
  signal?: AbortSignal
) {
  const params = new URLSearchParams({
    sort,
    limit: String(COMMENTS_PAGE_SIZE),
    offset: String(offset),
  });
  return apiClient<PinCommentsResponse>(
    `/api/pins/${encodeURIComponent(pinId)}/comments?${params}`,
    { signal }
  );
}

export function postComment(
  pinId: string,
  body: { text: string; photo_url?: string | null }
) {
  return apiClient<CommentResponse>(
    `/api/pins/${encodeURIComponent(pinId)}/comments`,
    { method: "POST", body: JSON.stringify(body) }
  );
}

export function patchComment(
  commentId: string,
  body: { text?: string; photo_url?: string | null }
) {
  return apiClient<CommentResponse>(
    `/api/comments/${encodeURIComponent(commentId)}`,
    { method: "PATCH", body: JSON.stringify(body) }
  );
}

export function deleteComment(commentId: string) {
  return apiClient<DeleteCommentResponse>(
    `/api/comments/${encodeURIComponent(commentId)}`,
    { method: "DELETE" }
  );
}

export function putVote(commentId: string, value: VoteValue) {
  return apiClient<VoteResponse>(
    `/api/comments/${encodeURIComponent(commentId)}/vote`,
    { method: "PUT", body: JSON.stringify({ value }) }
  );
}
