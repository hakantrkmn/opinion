import type { CommentItem, VoteValue } from "@/types/api";

type VoteState = Pick<CommentItem, "likes" | "dislikes" | "my_vote">;

/** Clicking the active vote again removes it (sends 0). */
export function nextVote(current: VoteValue, clicked: 1 | -1): VoteValue {
  return current === clicked ? 0 : clicked;
}

/** The single place that does like/dislike arithmetic. */
export function applyVote<T extends VoteState>(comment: T, vote: VoteValue): T {
  const prev = comment.my_vote;
  if (prev === vote) return comment;
  return {
    ...comment,
    likes: Math.max(0, comment.likes - (prev === 1 ? 1 : 0) + (vote === 1 ? 1 : 0)),
    dislikes: Math.max(
      0,
      comment.dislikes - (prev === -1 ? 1 : 0) + (vote === -1 ? 1 : 0)
    ),
    my_vote: vote,
  };
}
