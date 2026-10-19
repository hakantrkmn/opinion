import "server-only";
import { db, sql } from "@/server/db";
import type { VoteResponse, VoteValue } from "@/types/api";
import { isBlockedRelation } from "@/server/services/blocks";
import { notFound } from "./errors";
import { HttpError } from "@/server/http/api-helpers";
import { toVoteValue } from "./sql";

export interface VoteResult extends VoteResponse {
  /** True when this request turned the viewer's vote into a like. */
  became_like: boolean;
  author_id: string;
}

/**
 * PUT /api/comments/:id/vote. One transaction: the comment row is locked
 * first (FOR NO KEY UPDATE — serialises with concurrent votes and with the
 * comment's deletion), the vote is upserted/removed, and the trigger-
 * maintained counters are read back. Voting on your own comment is allowed
 * (unchanged behaviour); it never notifies.
 */
export async function voteComment(params: {
  commentId: string;
  userId: string;
  value: VoteValue;
}): Promise<VoteResult> {
  const { commentId, userId, value } = params;

  const [target] = (await db.execute(sql`
    SELECT user_id FROM comments WHERE id = ${commentId}
  `)) as unknown as Array<{ user_id: string }>;
  if (!target) throw notFound("Comment");
  if (await isBlockedRelation(userId, target.user_id)) {
    throw HttpError.forbidden("You cannot vote on this comment");
  }

  return db.transaction(async (tx) => {
    const [locked] = (await tx.execute(sql`
      SELECT user_id FROM comments WHERE id = ${commentId} FOR NO KEY UPDATE
    `)) as unknown as Array<{ user_id: string }>;
    if (!locked) throw notFound("Comment");

    const [prev] = (await tx.execute(sql`
      SELECT value FROM comment_votes WHERE comment_id = ${commentId} AND user_id = ${userId}
    `)) as unknown as Array<{ value: number }>;
    const prevValue = toVoteValue(prev?.value);

    if (value === 0) {
      if (prev) {
        await tx.execute(sql`
          DELETE FROM comment_votes WHERE comment_id = ${commentId} AND user_id = ${userId}
        `);
      }
    } else if (prevValue !== value) {
      await tx.execute(sql`
        INSERT INTO comment_votes (id, comment_id, user_id, value)
        VALUES (${crypto.randomUUID()}, ${commentId}, ${userId}, ${value})
        ON CONFLICT (comment_id, user_id) DO UPDATE SET value = EXCLUDED.value
      `);
    }

    const [counts] = (await tx.execute(sql`
      SELECT likes_count, dislikes_count FROM comments WHERE id = ${commentId}
    `)) as unknown as Array<{ likes_count: number; dislikes_count: number }>;

    return {
      likes: Number(counts.likes_count),
      dislikes: Number(counts.dislikes_count),
      my_vote: value,
      became_like: value === 1 && prevValue !== 1,
      author_id: locked.user_id,
    };
  });
}
