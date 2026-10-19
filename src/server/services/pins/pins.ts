import "server-only";
import { db, sql } from "@/server/db";
import { PINS_MAX_RESULTS } from "@/constants/map";
import type {
  CreatePinResponse,
  PinClustersResponse,
  PinScope,
  PinSummary,
  PinsInBoundsResponse,
} from "@/types/api";
import { deleteUploadByUrl } from "@/server/uploads";
import {
  clampClusterZoom,
  clusterGridSize,
  clusterKey,
  expandBoundsByCell,
  MAX_MERCATOR_LAT,
  toEnvelopes,
  type Bounds,
} from "./geo";
import {
  commentColumnsSql,
  envelopesSql,
  pinColumnsSql,
  toCommentItem,
  toPinSummary,
  visibleToViewerSql,
  type CommentRow,
  type PinRow,
} from "./sql";
import { notFound } from "./errors";
import { HttpError } from "@/server/http/api-helpers";
import type { SQL } from "drizzle-orm";

export interface MapQuery {
  bounds: Bounds;
  scope: PinScope;
  viewerId: string | null;
}

/** Scope + block filters shared by the pins and clusters queries. */
function mapFiltersSql(scope: PinScope, viewerId: string | null): SQL {
  const following =
    scope === "following" && viewerId
      ? sql` AND p.user_id IN (SELECT f.following_id FROM user_follows f WHERE f.follower_id = ${viewerId})`
      : sql.empty();
  return sql`${following}${visibleToViewerSql(sql`p.user_id`, viewerId)}`;
}

/**
 * Pins inside the viewport, newest first, capped at PINS_MAX_RESULTS.
 * One query: GIST bbox scan + block/scope filters + LIMIT n+1 for
 * `truncated`.
 */
export async function getPinsInBounds(q: MapQuery): Promise<PinsInBoundsResponse> {
  if (q.scope === "following" && !q.viewerId) return { pins: [], truncated: false };

  const rows = (await db.execute(sql`
    SELECT ${pinColumnsSql}
    FROM pins p
    JOIN "user" u ON u.id = p.user_id
    WHERE ${envelopesSql(toEnvelopes(q.bounds))}
      AND p.comments_count > 0
      ${mapFiltersSql(q.scope, q.viewerId)}
    ORDER BY p.created_at DESC, p.id
    LIMIT ${PINS_MAX_RESULTS + 1}
  `)) as unknown as PinRow[];

  const truncated = rows.length > PINS_MAX_RESULTS;
  return {
    pins: (truncated ? rows.slice(0, PINS_MAX_RESULTS) : rows).map(toPinSummary),
    truncated,
  };
}

/**
 * Server-side grid clustering for zoom < PIN_DETAIL_MIN_ZOOM. Pins are
 * bucketed on the Web-Mercator pixel grid (CLUSTER_CELL_PX cells) so the
 * cell key `${zoom}:${ix}:${iy}` is stable while panning; the viewport is
 * grown by one cell so edge clusters are complete.
 */
export async function getPinClusters(
  q: MapQuery & { zoom: number }
): Promise<PinClustersResponse> {
  if (q.scope === "following" && !q.viewerId) return { clusters: [] };

  const zoom = clampClusterZoom(q.zoom);
  const n = clusterGridSize(zoom);
  const envelopes = toEnvelopes(expandBoundsByCell(q.bounds, zoom));

  // Tile-space x/y in [0,1) on the Web-Mercator plane (same maths as
  // clusterCellOf in geo.ts), bucketed into n×n cells.
  const query = sql`
    SELECT
      g.ix, g.iy,
      count(*)::int AS count,
      avg(g.lat) AS lat,
      avg(g.lng) AS lng,
      CASE WHEN count(*) = 1 THEN min(g.id) END AS pin_id
    FROM (
      SELECT
        p.id, c.lat, c.lng,
        GREATEST(0, LEAST(${n - 1}::int, floor((c.lng + 180.0) / 360.0 * ${n}::float8)::int)) AS ix,
        GREATEST(0, LEAST(${n - 1}::int, floor(
          (0.5 - ln(tan(pi() / 4.0 + radians(LEAST(${MAX_MERCATOR_LAT}::float8, GREATEST(-${MAX_MERCATOR_LAT}::float8, c.lat))) / 2.0)) / (2.0 * pi()))
          * ${n}::float8
        )::int)) AS iy
      FROM pins p
      CROSS JOIN LATERAL (SELECT ST_Y(p.location) AS lat, ST_X(p.location) AS lng) c
      WHERE ${envelopesSql(envelopes)}
        AND p.comments_count > 0
        ${mapFiltersSql(q.scope, q.viewerId)}
    ) g
    GROUP BY g.ix, g.iy
  `;

  // The planner cannot estimate the number of grid cells and would pick a
  // sort-based aggregate that spills to disk at ~100k pins; give the hash
  // aggregate enough memory for this one statement.
  const rows = (await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL work_mem = '32MB'`);
    return tx.execute(query);
  })) as unknown as Array<{
    ix: number;
    iy: number;
    count: number;
    lat: number | string;
    lng: number | string;
    pin_id: string | null;
  }>;

  return {
    clusters: rows.map((r) => ({
      key: clusterKey(zoom, Number(r.ix), Number(r.iy)),
      lat: Number(r.lat),
      lng: Number(r.lng),
      count: Number(r.count),
      pin_id: r.pin_id ?? null,
    })),
  };
}

/** Single pin; 404 when missing or owned by a user invisible to the viewer. */
export async function getPinById(
  pinId: string,
  viewerId: string | null
): Promise<PinSummary> {
  const [row] = (await db.execute(sql`
    SELECT ${pinColumnsSql}
    FROM pins p
    JOIN "user" u ON u.id = p.user_id
    WHERE p.id = ${pinId}
      ${visibleToViewerSql(sql`p.user_id`, viewerId)}
  `)) as unknown as PinRow[];
  if (!row) throw notFound("Pin");
  return toPinSummary(row);
}

export interface CreatePinInput {
  userId: string;
  name: string;
  comment: string;
  lat: number;
  lng: number;
  photo?: { url: string; metadata: Record<string, unknown> } | null;
}

/** Pin + first comment in one transaction. Distance rule is checked by the route. */
export async function createPin(input: CreatePinInput): Promise<CreatePinResponse> {
  const { pinId, commentId } = await db.transaction(async (tx) => {
    const [pin] = (await tx.execute(sql`
      INSERT INTO pins (id, user_id, name, location)
      VALUES (${crypto.randomUUID()}, ${input.userId}, ${input.name},
              ST_SetSRID(ST_MakePoint(${input.lng}::float8, ${input.lat}::float8), 4326))
      RETURNING id
    `)) as unknown as Array<{ id: string }>;

    const [comment] = (await tx.execute(sql`
      INSERT INTO comments (id, pin_id, user_id, text, is_first_comment, photo_url, photo_metadata)
      VALUES (${crypto.randomUUID()}, ${pin.id}, ${input.userId}, ${input.comment}, true,
              ${input.photo?.url ?? null},
              ${input.photo ? JSON.stringify(input.photo.metadata) : null}::jsonb)
      RETURNING id
    `)) as unknown as Array<{ id: string }>;

    return { pinId: pin.id, commentId: comment.id };
  });

  const [pin, comment] = await Promise.all([
    getPinById(pinId, null),
    (async () => {
      const [row] = (await db.execute(sql`
        SELECT ${commentColumnsSql}, 0 AS my_vote
        FROM comments c JOIN "user" u ON u.id = c.user_id
        WHERE c.id = ${commentId}
      `)) as unknown as CommentRow[];
      if (!row) throw new Error(`created comment ${commentId} not found`);
      return toCommentItem(row);
    })(),
  ]);
  return { pin, comment };
}

/**
 * Owner-only hard delete. Comments and votes cascade; triggers keep every
 * counter and user_stats row correct. Photo files are removed after commit.
 */
export async function deletePin(
  pinId: string,
  userId: string
): Promise<{ pin_deleted: true; pin_id: string }> {
  const photoUrls = await db.transaction(async (tx) => {
    const [pin] = (await tx.execute(sql`
      SELECT user_id FROM pins WHERE id = ${pinId} FOR UPDATE
    `)) as unknown as Array<{ user_id: string }>;
    if (!pin) throw notFound("Pin");
    if (pin.user_id !== userId) {
      throw HttpError.forbidden("You can only delete your own pins");
    }
    const photos = (await tx.execute(sql`
      SELECT photo_url FROM comments WHERE pin_id = ${pinId} AND photo_url IS NOT NULL
    `)) as unknown as Array<{ photo_url: string }>;
    await tx.execute(sql`DELETE FROM pins WHERE id = ${pinId}`);
    return photos.map((p) => p.photo_url);
  });

  await Promise.all(photoUrls.map((url) => deleteUploadByUrl(url)));
  return { pin_deleted: true, pin_id: pinId };
}
