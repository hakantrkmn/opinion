import "server-only";
import type { PhotoMetadata, UserSummary } from "@/types/api";

export function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

export function isoRequired(value: Date | string): string {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

/**
 * Embedded author representation. Soft-deleted users keep their id (so
 * links/ownership still work) but lose their name and avatar.
 */
export function toUserSummary(row: {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  deletedAt?: Date | string | null;
}): UserSummary {
  const deleted = !!row.deletedAt;
  return {
    id: row.id,
    display_name: deleted ? null : row.displayName,
    avatar_url: deleted ? null : row.avatarUrl,
  };
}

/** Normalise stored photo metadata (legacy rows may be `{}` or camelCase). */
export function toPhotoMetadata(value: unknown): PhotoMetadata | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const width = Number(v.width);
  const height = Number(v.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0) {
    return null;
  }
  return {
    width,
    height,
    file_size: Number(v.file_size ?? v.fileSize ?? 0) || 0,
    format: typeof v.format === "string" ? v.format : "webp",
  };
}
