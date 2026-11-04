import type { CommentSort } from "@/types/api";

/**
 * Server-side sort orders offered in the pin detail. Labels live in
 * messages (comments.sort.<value>).
 */
export const COMMENT_SORTS: readonly CommentSort[] = ["newest", "popular", "oldest"];

export const DEFAULT_COMMENT_SORT: CommentSort = "newest";

export function isCommentSort(value: string): value is CommentSort {
  return (COMMENT_SORTS as readonly string[]).includes(value);
}
