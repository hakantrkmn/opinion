import { z } from "zod";

const MAX_COMMENT_LEN = 2000;
const MAX_PIN_NAME_LEN = 120;
const MAX_DISPLAY_NAME_LEN = 60;
const MAX_BATCH_PIN_IDS = 200;
const MAX_PHOTO_URL_LEN = 500;
const MAX_PHOTO_META_BYTES = 4_000;

const idSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid id");

const photoMetadataSchema = z
  .record(z.string(), z.unknown())
  .refine(
    (val) => JSON.stringify(val).length <= MAX_PHOTO_META_BYTES,
    "photoMetadata too large"
  )
  .optional()
  .nullable();

const photoUrlSchema = z
  .string()
  .max(MAX_PHOTO_URL_LEN)
  .refine(
    (val) => val.startsWith("/uploads/") || val.startsWith("http"),
    "Invalid photo url"
  )
  .optional()
  .nullable();

export const pinBoundsSchema = z.object({
  minLat: z.coerce.number().min(-90).max(90),
  maxLat: z.coerce.number().min(-90).max(90),
  minLng: z.coerce.number().min(-180).max(180),
  maxLng: z.coerce.number().min(-180).max(180),
});

export const createPinFormSchema = z.object({
  pinName: z.string().trim().min(1).max(MAX_PIN_NAME_LEN),
  comment: z.string().trim().min(1).max(MAX_COMMENT_LEN),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  photoMetadata: photoMetadataSchema,
});

export const batchCommentsSchema = z.object({
  pinIds: z.array(idSchema).min(1).max(MAX_BATCH_PIN_IDS),
});

export const createCommentSchema = z.object({
  text: z.string().trim().min(1).max(MAX_COMMENT_LEN),
  photoUrl: photoUrlSchema,
  photoMetadata: photoMetadataSchema,
});

export const updateCommentSchema = z.object({
  text: z.string().trim().min(1).max(MAX_COMMENT_LEN),
  photoUrl: photoUrlSchema,
  photoMetadata: photoMetadataSchema,
});

export const voteCommentSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1)]),
});

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(MAX_DISPLAY_NAME_LEN).optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const uploadTypeSchema = z.enum(["avatar", "comment-photo"]);

export const idParamSchema = z.object({ id: idSchema });
