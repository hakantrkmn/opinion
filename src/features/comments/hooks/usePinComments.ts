"use client";

import { queryKeys } from "@/lib/api/query-keys";
import type { CommentSort } from "@/types/api";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { COMMENTS_PAGE_SIZE, fetchPinComments } from "../lib/api";

/** Comments of a pin, keyed ["pins", id, "comments", sort]. */
export function usePinComments(pinId: string | null, sort: CommentSort) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.pins.comments(pinId ?? "", sort),
    queryFn: ({ pageParam, signal }) =>
      fetchPinComments(pinId!, sort, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      last.has_more ? pages.length * COMMENTS_PAGE_SIZE : undefined,
    enabled: !!pinId,
    staleTime: 30_000,
  });

  const pages = query.data?.pages;
  const comments = useMemo(() => {
    if (!pages) return [];
    // Optimistic inserts can make pages overlap after a refetch; dedupe by id.
    const seen = new Set<string>();
    return pages.flatMap((p) =>
      p.comments.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
    );
  }, [pages]);

  const first = pages?.[0];
  return {
    ...query,
    comments,
    total: first?.total ?? 0,
    myCommentId: first?.my_comment_id ?? null,
  };
}
