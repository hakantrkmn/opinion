/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Comment, CreatePinData, MapBounds, Pin } from "@/types";
import { db, sql } from "@/db";
import { pins, comments, commentVotes } from "@/db/schema/app";
import { user } from "@/db/schema/auth";
import { eq, and, inArray, asc, count } from "drizzle-orm";
import { pushService } from "./pushService";

const LIKE_MILESTONES = new Set([5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]);
const LIKE_NOTIFY_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

async function maybeNotifyCommentLike(params: {
  commentId: string;
  voterId: string;
}): Promise<void> {
  const { commentId, voterId } = params;

  const [comment] = await db
    .select({
      authorId: comments.userId,
      pinId: comments.pinId,
      text: comments.text,
      likeNotifiedCount: comments.likeNotifiedCount,
      likeNotifiedAt: comments.likeNotifiedAt,
    })
    .from(comments)
    .where(eq(comments.id, commentId));

  if (!comment) return;
  if (comment.authorId === voterId) return; // self-like

  const [{ total } = { total: 0 }] = await db
    .select({ total: count() })
    .from(commentVotes)
    .where(and(eq(commentVotes.commentId, commentId), eq(commentVotes.value, 1)));

  const currentLikes = Number(total);
  if (currentLikes <= 0) return;

  const isFirst = currentLikes === 1;
  const now = Date.now();
  const lastAt = comment.likeNotifiedAt ? comment.likeNotifiedAt.getTime() : 0;
  const withinCooldown = lastAt > 0 && now - lastAt < LIKE_NOTIFY_COOLDOWN_MS;
  const isMilestone =
    LIKE_MILESTONES.has(currentLikes) && currentLikes > comment.likeNotifiedCount;

  let shouldNotify = false;
  if (isFirst) {
    shouldNotify = true;
  } else if (!withinCooldown && isMilestone) {
    shouldNotify = true;
  }
  if (!shouldNotify) return;

  const tokens = await pushService.getActiveTokensForUser(comment.authorId);
  if (tokens.length === 0) return;

  const snippet =
    comment.text.length > 80 ? `${comment.text.slice(0, 80)}…` : comment.text;
  const title = isFirst
    ? "Yorumun beğenildi"
    : `Yorumun ${currentLikes} beğeni aldı`;

  const result = await pushService.sendToTokens(tokens, {
    title,
    body: snippet,
    data: {
      type: "comment_like",
      commentId,
      pinId: comment.pinId,
      count: currentLikes,
    },
  });

  if (result.sent > 0) {
    await db
      .update(comments)
      .set({ likeNotifiedCount: currentLikes, likeNotifiedAt: new Date() })
      .where(eq(comments.id, commentId));
  }
}

export const pinService = {
  async createPin(
    data: CreatePinData,
    userId: string
  ): Promise<{ pin: Pin | null; error: string | null }> {
    try {
      // Handle photo upload if provided
      let photoUrl: string | undefined;
      let photoMeta: Record<string, unknown> | undefined;

      if (data.photo) {
        try {
          const { uploadCommentPhoto } = await import("./photoService");
          const result = await uploadCommentPhoto(data.photo, userId);
          if (result.success && result.url) {
            photoUrl = result.url;
            photoMeta = result.metadata as Record<string, unknown>;
          }
        } catch (photoError) {
          console.error("Photo upload error:", photoError);
        }
      }

      // Create pin and first comment in a transaction
      const result = await db.transaction(async (tx) => {
        // Insert pin
        const [newPin] = await tx
          .insert(pins)
          .values({
            userId,
            name: data.pinName,
            location: sql`ST_Point(${data.lng}, ${data.lat})`,
          })
          .returning();

        // Insert first comment
        const commentData: any = {
          pinId: newPin.id,
          userId,
          text: data.comment,
          isFirstComment: true,
        };

        if (photoUrl) {
          commentData.photoUrl = photoUrl;
          commentData.photoMetadata = photoMeta || data.photoMetadata || {};
        }

        await tx.insert(comments).values(commentData);

        // Get user display name
        const [userData] = await tx
          .select({ displayName: user.displayName, avatarUrl: user.avatarUrl })
          .from(user)
          .where(eq(user.id, userId));

        return { pin: newPin, user: userData };
      });

      const pinWithInfo: Pin = {
        id: result.pin.id,
        user_id: result.pin.userId,
        name: result.pin.name,
        location: {
          type: "Point",
          coordinates: [data.lng, data.lat],
        } as any,
        created_at: result.pin.createdAt.toISOString(),
        updated_at: result.pin.updatedAt.toISOString(),
        user: {
          display_name: result.user?.displayName || "Anonim",
          avatar_url: result.user?.avatarUrl || undefined,
        },
        comments_count: 1,
      };

      return { pin: pinWithInfo, error: null };
    } catch (error) {
      console.error("createPin error:", error);
      return { pin: null, error: "Pin oluşturulurken hata oluştu" };
    }
  },

  async getPins(
    bounds: MapBounds
  ): Promise<{ pins: Pin[] | null; error: string | null }> {
    try {
      const result = await db.execute(
        sql`SELECT * FROM get_pins_in_bounds(${bounds.minLat}, ${bounds.maxLat}, ${bounds.minLng}, ${bounds.maxLng})`
      );

      const rows = result as any[];
      const formattedPins: Pin[] = (rows || []).map((pin: any) => ({
        id: pin.id,
        user_id: pin.user_id,
        name: pin.name,
        location: pin.location,
        created_at: pin.created_at,
        updated_at: pin.updated_at,
        user: { display_name: pin.user_display_name, avatar_url: pin.user_avatar_url || undefined },
        comments_count: Number(pin.comments_count),
      }));

      return { pins: formattedPins, error: null };
    } catch (error) {
      console.error("getPins error:", error);
      return { pins: null, error: "Pin'ler yüklenirken hata oluştu" };
    }
  },

  async getBatchComments(
    pinIds: string[],
    userId?: string
  ): Promise<{
    comments: { [pinId: string]: Comment[] };
    error: string | null;
  }> {
    try {
      if (pinIds.length === 0) {
        return { comments: {}, error: null };
      }

      const rows = await db
        .select({
          id: comments.id,
          pinId: comments.pinId,
          userId: comments.userId,
          text: comments.text,
          createdAt: comments.createdAt,
          isFirstComment: comments.isFirstComment,
          photoUrl: comments.photoUrl,
          photoMetadata: comments.photoMetadata,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        })
        .from(comments)
        .leftJoin(user, eq(comments.userId, user.id))
        .where(inArray(comments.pinId, pinIds))
        .orderBy(asc(comments.createdAt));

      // Get votes for these comments
      const commentIds = rows.map((r) => r.id);
      const votes =
        commentIds.length > 0
          ? await db
              .select()
              .from(commentVotes)
              .where(inArray(commentVotes.commentId, commentIds))
          : [];

      const votesByComment: Record<
        string,
        Array<{ value: number; userId: string }>
      > = {};
      for (const v of votes) {
        if (!votesByComment[v.commentId]) votesByComment[v.commentId] = [];
        votesByComment[v.commentId].push({
          value: v.value,
          userId: v.userId,
        });
      }

      const commentsByPin: { [pinId: string]: Comment[] } = {};
      pinIds.forEach((id) => {
        commentsByPin[id] = [];
      });

      for (const row of rows) {
        const cvotes = votesByComment[row.id] || [];
        const voteCount = cvotes.reduce((sum, v) => sum + v.value, 0);
        const userVote = userId
          ? cvotes.find((v) => v.userId === userId)?.value || 0
          : 0;

        const c: Comment = {
          id: row.id,
          pin_id: row.pinId,
          user_id: row.userId,
          text: row.text,
          created_at: row.createdAt.toISOString(),
          is_first_comment: row.isFirstComment,
          photo_url: row.photoUrl || undefined,
          photo_metadata: row.photoMetadata as any,
          users: {
            display_name: row.displayName || "Anonymous",
            avatar_url: row.avatarUrl || undefined,
          },
          vote_count: voteCount,
          user_vote: userVote,
          comment_votes: cvotes.map((v) => ({
            value: v.value,
            user_id: v.userId,
          })),
        };

        if (commentsByPin[row.pinId]) {
          commentsByPin[row.pinId].push(c);
        }
      }

      return { comments: commentsByPin, error: null };
    } catch (error) {
      console.error("getBatchComments error:", error);
      return { comments: {}, error: "Yorumlar yüklenirken hata oluştu" };
    }
  },

  async getPinComments(
    pinId: string,
    userId?: string
  ): Promise<{ comments: Comment[] | null; error: string | null }> {
    try {
      const rows = await db
        .select({
          id: comments.id,
          pinId: comments.pinId,
          userId: comments.userId,
          text: comments.text,
          createdAt: comments.createdAt,
          isFirstComment: comments.isFirstComment,
          photoUrl: comments.photoUrl,
          photoMetadata: comments.photoMetadata,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        })
        .from(comments)
        .leftJoin(user, eq(comments.userId, user.id))
        .where(eq(comments.pinId, pinId))
        .orderBy(asc(comments.createdAt));

      if (rows.length === 0) {
        return { comments: [], error: "PIN_AUTO_DELETED" };
      }

      const commentIds = rows.map((r) => r.id);
      const votes = await db
        .select()
        .from(commentVotes)
        .where(inArray(commentVotes.commentId, commentIds));

      const votesByComment: Record<
        string,
        Array<{ value: number; userId: string }>
      > = {};
      for (const v of votes) {
        if (!votesByComment[v.commentId]) votesByComment[v.commentId] = [];
        votesByComment[v.commentId].push({
          value: v.value,
          userId: v.userId,
        });
      }

      const result: Comment[] = rows.map((row) => {
        const cvotes = votesByComment[row.id] || [];
        const voteCount = cvotes.reduce((sum, v) => sum + v.value, 0);
        const userVote = userId
          ? cvotes.find((v) => v.userId === userId)?.value || 0
          : 0;

        return {
          id: row.id,
          pin_id: row.pinId,
          user_id: row.userId,
          text: row.text,
          created_at: row.createdAt.toISOString(),
          is_first_comment: row.isFirstComment,
          photo_url: row.photoUrl || undefined,
          photo_metadata: row.photoMetadata as any,
          users: {
            display_name: row.displayName || "Anonymous",
            avatar_url: row.avatarUrl || undefined,
          },
          vote_count: voteCount,
          user_vote: userVote,
          comment_votes: cvotes.map((v) => ({
            value: v.value,
            user_id: v.userId,
          })),
        };
      });

      return { comments: result, error: null };
    } catch (error) {
      console.error("getPinComments error:", error);
      return { comments: null, error: "Yorumlar yüklenirken hata oluştu" };
    }
  },

  async addComment(
    pinId: string,
    text: string,
    userId: string,
    photoUrl?: string,
    photoMetadata?: any
  ): Promise<{ comment: Comment | null; error: string | null }> {
    try {
      const commentData: any = {
        pinId,
        userId,
        text,
      };

      if (photoUrl) {
        commentData.photoUrl = photoUrl;
        if (photoMetadata) {
          commentData.photoMetadata = photoMetadata;
        }
      }

      // Use transaction to ensure atomicity
      const result = await db.transaction(async (tx) => {
        const [newComment] = await tx
          .insert(comments)
          .values(commentData)
          .returning();

        const [userData] = await tx
          .select({ displayName: user.displayName, avatarUrl: user.avatarUrl })
          .from(user)
          .where(eq(user.id, userId));

        return { newComment, userData };
      });

      const comment: Comment = {
        id: result.newComment.id,
        pin_id: result.newComment.pinId,
        user_id: result.newComment.userId,
        text: result.newComment.text,
        created_at: result.newComment.createdAt.toISOString(),
        is_first_comment: result.newComment.isFirstComment,
        photo_url: result.newComment.photoUrl || undefined,
        photo_metadata: result.newComment.photoMetadata as any,
        users: {
          display_name: result.userData?.displayName || "Anonymous",
          avatar_url: result.userData?.avatarUrl || undefined,
        },
        vote_count: 0,
        user_vote: 0,
      };

      return { comment, error: null };
    } catch {
      return { comment: null, error: "Yorum eklenirken hata oluştu" };
    }
  },

  async updateComment(
    commentId: string,
    newText: string,
    userId: string,
    photoUrl?: string | null,
    photoMetadata?: Record<string, unknown>
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const updateData: any = {
        text: newText,
        updatedAt: new Date(),
      };

      if (photoUrl !== undefined) {
        if (photoUrl === null) {
          updateData.photoUrl = null;
          updateData.photoMetadata = null;
        } else {
          updateData.photoUrl = photoUrl;
          updateData.photoMetadata = photoMetadata || {};
        }
      }

      await db
        .update(comments)
        .set(updateData)
        .where(and(eq(comments.id, commentId), eq(comments.userId, userId)));

      return { success: true, error: null };
    } catch {
      return { success: false, error: "Yorum güncellenirken hata oluştu" };
    }
  },

  async deleteComment(
    commentId: string,
    userId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const [comment] = await db
        .select({ photoUrl: comments.photoUrl })
        .from(comments)
        .where(and(eq(comments.id, commentId), eq(comments.userId, userId)));

      if (!comment) {
        return { success: false, error: "Yorum bulunamadı" };
      }

      if (comment.photoUrl) {
        const { deleteCommentPhoto } = await import("./photoService");
        await deleteCommentPhoto(comment.photoUrl);
      }

      await db
        .delete(comments)
        .where(and(eq(comments.id, commentId), eq(comments.userId, userId)));

      return { success: true, error: null };
    } catch {
      return { success: false, error: "Yorum silinirken hata oluştu" };
    }
  },

  async voteComment(
    commentId: string,
    value: number,
    userId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // Validate vote value
      if (value !== 1 && value !== -1) {
        return { success: false, error: "Vote value must be 1 or -1" };
      }

      // Pre-check: capture previous vote (if any) to detect 0→1 / -1→1 transitions
      const [prevVote] = await db
        .select({ value: commentVotes.value })
        .from(commentVotes)
        .where(
          and(
            eq(commentVotes.commentId, commentId),
            eq(commentVotes.userId, userId)
          )
        );
      const prevValue = prevVote?.value ?? null;

      // Use upsert (ON CONFLICT DO UPDATE) to avoid race conditions
      await db
        .insert(commentVotes)
        .values({
          commentId,
          userId,
          value,
        })
        .onConflictDoUpdate({
          target: [commentVotes.commentId, commentVotes.userId],
          set: { value },
        });

      // Fire-and-forget notification check; errors must not affect vote result
      if (value === 1 && prevValue !== 1) {
        try {
          await maybeNotifyCommentLike({
            commentId,
            voterId: userId,
          });
        } catch (notifyError) {
          console.error("maybeNotifyCommentLike error:", notifyError);
        }
      }

      return { success: true, error: null };
    } catch (error) {
      console.error("voteComment error:", error);
      return { success: false, error: "Oy verilirken hata oluştu" };
    }
  },

  async deletePin(
    pinId: string,
    userId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const [pin] = await db
        .select({ userId: pins.userId })
        .from(pins)
        .where(eq(pins.id, pinId));

      if (!pin || pin.userId !== userId) {
        return { success: false, error: "Bu pin'i silme yetkiniz yok" };
      }

      // Delete comment photos first
      const commentsWithPhotos = await db
        .select({ photoUrl: comments.photoUrl })
        .from(comments)
        .where(eq(comments.pinId, pinId));

      const { deleteCommentPhoto } = await import("./photoService");
      await Promise.all(
        commentsWithPhotos
          .filter((c) => !!c.photoUrl)
          .map((c) => deleteCommentPhoto(c.photoUrl as string))
      );

      // Cascade will handle comments
      await db.delete(pins).where(eq(pins.id, pinId));

      return { success: true, error: null };
    } catch {
      return { success: false, error: "Pin silinirken hata oluştu" };
    }
  },

  async deleteCommentWithCleanup(
    commentId: string,
    userId: string
  ): Promise<{
    success: boolean;
    pinDeleted: boolean;
    error: string | null;
    pinId?: string;
  }> {
    try {
      const [comment] = await db
        .select({
          pinId: comments.pinId,
          userId: comments.userId,
          photoUrl: comments.photoUrl,
        })
        .from(comments)
        .where(eq(comments.id, commentId));

      if (!comment) {
        return {
          success: false,
          pinDeleted: false,
          error: "Comment not found",
        };
      }

      if (comment.userId !== userId) {
        return {
          success: false,
          pinDeleted: false,
          error: "You can only delete your own comments",
        };
      }

      const pinId = comment.pinId;

      const [pinRow] = await db
        .select({ userId: pins.userId })
        .from(pins)
        .where(eq(pins.id, pinId));

      const voterRows = await db
        .select({ userId: commentVotes.userId })
        .from(commentVotes)
        .where(eq(commentVotes.commentId, commentId));

      if (comment.photoUrl) {
        const { deleteCommentPhoto } = await import("./photoService");
        await deleteCommentPhoto(comment.photoUrl);
      }

      // Count comments before deletion
      const commentsBefore = await db
        .select({ id: comments.id })
        .from(comments)
        .where(eq(comments.pinId, pinId));

      const commentCountBefore = commentsBefore.length;

      // Delete the comment (trigger will handle pin cleanup if last comment)
      await db
        .delete(comments)
        .where(and(eq(comments.id, commentId), eq(comments.userId, userId)));

      const affectedUserIds = new Set<string>([comment.userId]);
      if (pinRow?.userId) affectedUserIds.add(pinRow.userId);
      for (const v of voterRows) affectedUserIds.add(v.userId);

      const { userService } = await import("./userService");
      await Promise.all(
        [...affectedUserIds].map((uid) =>
          userService.refreshUserStats(uid).catch((err) => {
            console.error("refreshUserStats after comment delete:", uid, err);
          })
        )
      );

      const wasLastComment = commentCountBefore === 1;

      if (wasLastComment) {
        const pinExists = await db
          .select({ id: pins.id })
          .from(pins)
          .where(eq(pins.id, pinId));

        return {
          success: true,
          pinDeleted: pinExists.length === 0,
          error: null,
          pinId,
        };
      }

      return { success: true, pinDeleted: false, error: null, pinId };
    } catch (error) {
      console.error("deleteCommentWithCleanup error:", error);
      return {
        success: false,
        pinDeleted: false,
        error: "An error occurred while deleting comment",
      };
    }
  },

  async hasUserCommented(
    pinId: string,
    userId: string
  ): Promise<{
    hasCommented: boolean;
    commentId?: string;
    error: string | null;
  }> {
    try {
      const [existing] = await db
        .select({ id: comments.id })
        .from(comments)
        .where(and(eq(comments.pinId, pinId), eq(comments.userId, userId)));

      return {
        hasCommented: !!existing,
        commentId: existing?.id,
        error: null,
      };
    } catch {
      return { hasCommented: false, error: "Kontrol edilirken hata oluştu" };
    }
  },
};
