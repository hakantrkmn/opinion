import type { CommentSort } from "@/types/api";

/** Server-side sort orders offered in the pin detail. */
export const COMMENT_SORTS: { value: CommentSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most popular" },
  { value: "oldest", label: "Oldest" },
];

export const DEFAULT_COMMENT_SORT: CommentSort = "newest";

export function isCommentSort(value: string): value is CommentSort {
  return COMMENT_SORTS.some((s) => s.value === value);
}
