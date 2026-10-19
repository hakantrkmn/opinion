import { z } from "zod";

/** Single source of truth for display-name rules (server + client). */
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 50;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export const idSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid id");

export const idParamSchema = z.object({ id: idSchema });

// Control chars, zero-width chars and bidi overrides (built from escapes so
// the source stays ASCII).
const INVISIBLE_CHARS = new RegExp(
  "[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e\\u2066-\\u2069]",
  "g"
);

/** Collapse inner whitespace, strip control chars, trim. */
export function normalizeDisplayName(value: string): string {
  return value
    .replace(INVISIBLE_CHARS, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const displayNameSchema = z
  .string()
  .transform(normalizeDisplayName)
  .pipe(
    z
      .string()
      .min(
        DISPLAY_NAME_MIN,
        `Display name must be at least ${DISPLAY_NAME_MIN} characters`
      )
      .max(
        DISPLAY_NAME_MAX,
        `Display name must be at most ${DISPLAY_NAME_MAX} characters`
      )
  );

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
  .max(PASSWORD_MAX, `Password must be at most ${PASSWORD_MAX} characters`);

export const updateProfileSchema = z
  .object({ display_name: displayNameSchema.optional() })
  .strict();

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required").max(PASSWORD_MAX),
});

export const uploadTypeSchema = z.enum(["avatar", "comment-photo"]);

export const userSearchQuerySchema = z.object({
  q: z.string().trim().min(2, "Query must be at least 2 characters").max(50),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

export const registerPushTokenSchema = z.object({
  token: z.string().min(1).max(200),
  platform: z.enum(["ios", "android"]),
  device_name: z.string().trim().max(120).optional().nullable(),
});

export const unregisterPushTokenSchema = z.object({
  token: z.string().min(1).max(200),
});

export const reportTargetTypeSchema = z.enum(["pin", "comment", "user"]);
export const reportReasonSchema = z.enum([
  "spam",
  "harassment",
  "inappropriate",
  "other",
]);

export const createReportSchema = z.object({
  target_type: reportTargetTypeSchema,
  target_id: idSchema,
  reason: reportReasonSchema,
  note: z.string().trim().max(500).optional().nullable(),
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const adminListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
  q: z.string().trim().max(100).optional(),
});

export const adminReportsQuerySchema = adminListQuerySchema.extend({
  status: z
    .enum(["open", "resolved", "dismissed", "all"])
    .optional()
    .default("open"),
});

export const adminReportActionSchema = z.object({
  action: z.enum(["resolve", "dismiss", "delete_target"]),
});

export const sendNotificationSchema = z.object({
  target: z.discriminatedUnion("type", [
    z.object({ type: z.literal("user"), user_id: idSchema }),
    z.object({ type: z.literal("all") }),
  ]),
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(500),
  data: z
    .record(z.string(), z.unknown())
    .refine((v) => JSON.stringify(v).length <= 2_000, "data too large")
    .optional(),
});
