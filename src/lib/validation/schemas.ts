import { z } from "zod";

const MAX_COMMENT_LEN = 2000;
const MAX_PHOTO_URL_LEN = 500;
const MAX_PIN_NAME_LEN = 120;

const idSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid id");

// ---------------------------------------------------------------------------
// Pins / comments / votes (contract: src/types/api.ts)
// ---------------------------------------------------------------------------

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const PIN_PHOTO_MAX_BYTES = MAX_PHOTO_BYTES;

// Longitudes may come straight from a wrapped map viewport (e.g. -190);
// the server normalises them into [-180, 180] and splits at the antimeridian.
const viewportBoundsSchema = z
  .object({
    minLat: z.coerce.number().min(-90).max(90),
    maxLat: z.coerce.number().min(-90).max(90),
    minLng: z.coerce.number().min(-1080).max(1080),
    maxLng: z.coerce.number().min(-1080).max(1080),
  })
  .refine((b) => b.minLat < b.maxLat, {
    message: "minLat must be lower than maxLat",
    path: ["minLat"],
  });

export const pinQueryScopeSchema = z.enum(["all", "following"]).default("all");

/** GET /api/pins */
export const pinsQuerySchema = viewportBoundsSchema.and(
  z.object({ scope: pinQueryScopeSchema })
);

/** GET /api/pins/clusters */
export const pinClustersQuerySchema = viewportBoundsSchema.and(
  z.object({
    scope: pinQueryScopeSchema,
    zoom: z.coerce.number().min(0).max(30),
  })
);

/** POST /api/pins (multipart text fields; `photo` file handled separately) */
export const createPinFormSchema = z.object({
  name: z.string().trim().min(1).max(MAX_PIN_NAME_LEN),
  comment: z.string().trim().min(1).max(MAX_COMMENT_LEN),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  user_lat: z.coerce.number().min(-90).max(90),
  user_lng: z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().min(0).max(100_000),
});

/** GET /api/pins/:id/comments */
export const pinCommentsQuerySchema = z.object({
  sort: z.enum(["popular", "newest", "oldest"]).default("popular"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

const commentPhotoUrlSchema = z.string().min(1).max(MAX_PHOTO_URL_LEN);

/** POST /api/pins/:id/comments */
export const createCommentSchema = z.object({
  text: z.string().trim().min(1).max(MAX_COMMENT_LEN),
  photo_url: commentPhotoUrlSchema.nullish(),
});

/** PATCH /api/comments/:id — `photo_url: null` removes the photo. */
export const updateCommentSchema = z
  .object({
    text: z.string().trim().min(1).max(MAX_COMMENT_LEN).optional(),
    photo_url: commentPhotoUrlSchema.nullable().optional(),
  })
  .refine((b) => b.text !== undefined || b.photo_url !== undefined, {
    message: "Nothing to update",
  });

/** PUT /api/comments/:id/vote — 0 removes the vote. */
export const voteCommentSchema = z.object({
  value: z.union([z.literal(1), z.literal(0), z.literal(-1)]),
});

export const idParamSchema = z.object({ id: idSchema });
