import "server-only";
import { cache } from "react";
import { db, sql } from "@/server/db";
import { toIso } from "./sql";
import { escapeLike } from "./like";

/** Data loaders for the SSR pages (/pin/[id], /location/[slug], sitemap). */

const DELETED_USER_LABEL = "Deleted user";

export interface PinPageData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  createdAt: Date;
  updatedAt: Date;
  commentsCount: number;
  userId: string;
  /** Owner display name; "Deleted user" for soft-deleted owners. */
  displayName: string | null;
  avatarUrl: string | null;
}

/**
 * One pin for SSR. Wrapped in React `cache()` so generateMetadata and the
 * page component share a single query per request.
 */
export const getPinPageData = cache(async (id: string): Promise<PinPageData | null> => {
  const [row] = (await db.execute(sql`
    SELECT p.id, p.name, ST_Y(p.location) AS lat, ST_X(p.location) AS lng,
           p.created_at, p.updated_at, p.comments_count, p.user_id,
           u.deleted_at IS NOT NULL AS owner_deleted,
           COALESCE(u.display_name, u.name) AS display_name,
           u.avatar_url
    FROM pins p
    JOIN "user" u ON u.id = p.user_id
    WHERE p.id = ${id}
  `)) as unknown as Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    created_at: string;
    updated_at: string;
    comments_count: number;
    user_id: string;
    owner_deleted: boolean;
    display_name: string | null;
    avatar_url: string | null;
  }>;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    lat: Number(row.lat),
    lng: Number(row.lng),
    createdAt: new Date(toIso(row.created_at)),
    updatedAt: new Date(toIso(row.updated_at)),
    commentsCount: Number(row.comments_count),
    userId: row.user_id,
    displayName: row.owner_deleted ? DELETED_USER_LABEL : row.display_name,
    avatarUrl: row.owner_deleted ? null : row.avatar_url,
  };
});

export interface PinPageComment {
  id: string;
  text: string;
  createdAt: Date;
  isFirstComment: boolean;
  photoUrl: string | null;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  likeCount: number;
  dislikeCount: number;
}

/** Oldest-first comments for the SSR pin page (bounded). */
export async function getPinPageComments(
  pinId: string,
  limit = 200
): Promise<PinPageComment[]> {
  const rows = (await db.execute(sql`
    SELECT c.id, c.text, c.created_at, c.is_first_comment, c.photo_url, c.user_id,
           c.likes_count, c.dislikes_count,
           u.deleted_at IS NOT NULL AS user_deleted,
           COALESCE(u.display_name, u.name) AS display_name,
           u.avatar_url
    FROM comments c
    JOIN "user" u ON u.id = c.user_id
    WHERE c.pin_id = ${pinId}
    ORDER BY c.created_at ASC, c.id
    LIMIT ${limit}
  `)) as unknown as Array<{
    id: string;
    text: string;
    created_at: string;
    is_first_comment: boolean;
    photo_url: string | null;
    user_id: string;
    likes_count: number;
    dislikes_count: number;
    user_deleted: boolean;
    display_name: string | null;
    avatar_url: string | null;
  }>;
  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    createdAt: new Date(toIso(r.created_at)),
    isFirstComment: r.is_first_comment,
    photoUrl: r.photo_url,
    userId: r.user_id,
    displayName: r.user_deleted ? DELETED_USER_LABEL : r.display_name,
    avatarUrl: r.user_deleted ? null : r.avatar_url,
    likeCount: Number(r.likes_count),
    dislikeCount: Number(r.dislikes_count),
  }));
}

export interface LocationPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  createdAt: Date;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
}

/**
 * Pins whose name contains `term` (case-insensitive). Served by the
 * pg_trgm GIN index idx_pins_name_trgm for terms of 3+ characters.
 */
export async function searchPinsByName(term: string, limit = 50): Promise<LocationPin[]> {
  const needle = term.trim().slice(0, 100);
  if (!needle) return [];
  const rows = (await db.execute(sql`
    SELECT p.id, p.name, ST_Y(p.location) AS lat, ST_X(p.location) AS lng,
           p.created_at, p.user_id,
           CASE WHEN u.deleted_at IS NULL THEN COALESCE(u.display_name, u.name) END AS display_name,
           CASE WHEN u.deleted_at IS NULL THEN u.avatar_url END AS avatar_url
    FROM pins p
    JOIN "user" u ON u.id = p.user_id
    WHERE p.name ILIKE ${`%${escapeLike(needle)}%`}
      AND p.comments_count > 0
    ORDER BY p.created_at DESC
    LIMIT ${limit}
  `)) as unknown as Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    created_at: string;
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
  }>;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    lat: Number(r.lat),
    lng: Number(r.lng),
    createdAt: new Date(toIso(r.created_at)),
    userId: r.user_id,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
  }));
}

/** Newest pins for the sitemap; bounded and served by idx_pins_created_at. */
export async function getSitemapPins(
  limit: number
): Promise<Array<{ id: string; createdAt: Date; updatedAt: Date }>> {
  const rows = (await db.execute(sql`
    SELECT id, created_at, updated_at
    FROM pins
    ORDER BY created_at DESC
    LIMIT ${limit}
  `)) as unknown as Array<{ id: string; created_at: string; updated_at: string }>;
  return rows.map((r) => ({
    id: r.id,
    createdAt: new Date(toIso(r.created_at)),
    updatedAt: new Date(toIso(r.updated_at)),
  }));
}
