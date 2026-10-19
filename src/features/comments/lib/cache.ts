import { queryKeys } from "@/lib/api/query-keys";
import type { CommentItem, PinCommentsResponse } from "@/types/api";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";

export type CommentsData = InfiniteData<PinCommentsResponse, number>;

/** Applies `update` to every cached comments list (all sorts) of a pin. */
export function updateCommentLists(
  queryClient: QueryClient,
  pinId: string,
  update: (data: CommentsData, sort: string) => CommentsData
) {
  for (const query of queryClient
    .getQueryCache()
    .findAll({ queryKey: queryKeys.pins.commentsAll(pinId) })) {
    const data = query.state.data as CommentsData | undefined;
    if (!data) continue;
    queryClient.setQueryData<CommentsData>(
      query.queryKey,
      update(data, String(query.queryKey[3]))
    );
  }
}

export function mapPages(
  data: CommentsData,
  fn: (page: PinCommentsResponse, index: number) => PinCommentsResponse
): CommentsData {
  return { ...data, pages: data.pages.map(fn) };
}

export function patchComment(
  data: CommentsData,
  commentId: string,
  fn: (comment: CommentItem) => CommentItem
): CommentsData {
  return mapPages(data, (page) =>
    page.comments.some((c) => c.id === commentId)
      ? { ...page, comments: page.comments.map((c) => (c.id === commentId ? fn(c) : c)) }
      : page
  );
}

export function findComment(
  queryClient: QueryClient,
  pinId: string,
  commentId: string
): CommentItem | undefined {
  for (const query of queryClient
    .getQueryCache()
    .findAll({ queryKey: queryKeys.pins.commentsAll(pinId) })) {
    const data = query.state.data as CommentsData | undefined;
    for (const page of data?.pages ?? []) {
      const found = page.comments.find((c) => c.id === commentId);
      if (found) return found;
    }
  }
  return undefined;
}
