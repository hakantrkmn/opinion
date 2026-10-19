import "server-only";
import { sql, type SQL } from "drizzle-orm";
import type {
  CommentItem,
  PhotoMetadata,
  PinSummary,
  UserSummary,
  VoteValue,
} from "@/types/api";
import type { Envelope } from "./geo";

/**
 * Shared raw-SQL fragments and row mappers for the pin / comment services.
 * Raw queries (db.execute) return timestamps as strings and bigint as
 * strings, so every mapper normalises explicitly.
 */

/** Ids of users the viewer must not see (blocked either way). */
export function invisibleUserIdsSql(viewerId: string): SQL {
  return sql`(
    SELECT b.blocked_id FROM user_blocks b WHERE b.blocker_id = ${viewerId}
    UNION ALL
    SELECT b.blocker_id FROM user_blocks b WHERE b.blocked_id = ${viewerId}
  )`;
}

/** `AND <col> NOT IN (invisible users)` or nothing for anonymous viewers. */
export function visibleToViewerSql(column: SQL, viewerId: string | null): SQL {
  if (!viewerId) return sql.empty();
  return sql` AND ${column} NOT IN ${invisibleUserIdsSql(viewerId)}`;
}

/** Bounding-box predicate on pins.location using the GIST index. */
export function envelopesSql(envelopes: Envelope[]): SQL {
  const parts = envelopes.map(
    (e) =>
      sql`p.location && ST_MakeEnvelope(${e.minLng}::float8, ${e.minLat}::float8, ${e.maxLng}::float8, ${e.maxLat}::float8, 4326)`
  );
  return sql`(${sql.join(parts, sql` OR `)})`;
}

/**
 * Owner columns for a joined `"user" u`. Soft-deleted users are rendered as
 * "deleted user": display_name and avatar_url null.
 */
export const userColumnsSql = sql`
  u.id AS user_id,
  CASE WHEN u.deleted_at IS NULL THEN COALESCE(u.display_name, u.name) END AS user_display_name,
  CASE WHEN u.deleted_at IS NULL THEN u.avatar_url END AS user_avatar_url`;

export function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number") {
    return new Date(value).toISOString();
  }
  throw new TypeError(`Not a timestamp: ${String(value)}`);
}

export interface UserRow {
  user_id: string;
  user_display_name: string | null;
  user_avatar_url: string | null;
}

export function toUserSummary(row: UserRow): UserSummary {
  return {
    id: row.user_id,
    display_name: row.user_display_name ?? null,
    avatar_url: row.user_avatar_url ?? null,
  };
}

/** Columns selected for a PinSummary from `pins p JOIN "user" u`. */
export const pinColumnsSql = sql`
  p.id,
  p.name,
  ST_Y(p.location) AS lat,
  ST_X(p.location) AS lng,
  p.comments_count,
  p.created_at,
  ${userColumnsSql}`;

export interface PinRow extends UserRow {
  id: string;
  name: string;
  lat: number | string;
  lng: number | string;
  comments_count: number | string;
  created_at: string | Date;
}

export function toPinSummary(row: PinRow): PinSummary {
  return {
    id: row.id,
    name: row.name,
    lat: Number(row.lat),
    lng: Number(row.lng),
    user: toUserSummary(row),
    comments_count: Number(row.comments_count),
    created_at: toIso(row.created_at),
  };
}

/** Columns selected for a CommentItem from `comments c JOIN "user" u`. */
export const commentColumnsSql = sql`
  c.id,
  c.pin_id,
  c.text,
  c.photo_url,
  c.photo_metadata,
  c.is_first_comment,
  c.created_at,
  c.updated_at,
  c.likes_count,
  c.dislikes_count,
  ${userColumnsSql}`;

export interface CommentRow extends UserRow {
  id: string;
  pin_id: string;
  text: string;
  photo_url: string | null;
  photo_metadata: unknown;
  is_first_comment: boolean;
  created_at: string | Date;
  updated_at: string | Date;
  likes_count: number | string;
  dislikes_count: number | string;
  my_vote?: number | string | null;
}

export function toPhotoMetadata(value: unknown): PhotoMetadata | null {
  if (!value || typeof value !== "object") return null;
  const m = value as Record<string, unknown>;
  const width = Number(m.width);
  const height = Number(m.height);
  if (!(width > 0) || !(height > 0)) return null;
  return {
    width,
    height,
    file_size: Number(m.file_size ?? m.size ?? 0) || 0,
    format: typeof m.format === "string" ? m.format : "webp",
  };
}

export function toVoteValue(value: unknown): VoteValue {
  const n = Number(value);
  return n === 1 ? 1 : n === -1 ? -1 : 0;
}

export function toCommentItem(row: CommentRow): CommentItem {
  return {
    id: row.id,
    pin_id: row.pin_id,
    text: row.text,
    photo_url: row.photo_url ?? null,
    photo_metadata: row.photo_url ? toPhotoMetadata(row.photo_metadata) : null,
    is_first_comment: row.is_first_comment,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
    user: toUserSummary(row),
    likes: Number(row.likes_count),
    dislikes: Number(row.dislikes_count),
    my_vote: toVoteValue(row.my_vote),
  };
}
