import "server-only";
import { resolve, sep } from "path";
import { unlink } from "fs/promises";
import { UPLOAD_DIR } from "@/server/storage";

export type UploadFolder = "comment-photos" | "avatars";

const UPLOAD_ROOT = resolve(UPLOAD_DIR);
const SAFE_SEGMENT = /^[a-zA-Z0-9_.-]+$/;

/**
 * Resolve a public `/uploads/...` URL to an absolute path inside UPLOAD_DIR.
 * Returns null for anything that is not a well-formed local upload URL or
 * that would escape the upload root.
 */
export function resolveUploadPath(url: string): string | null {
  if (typeof url !== "string" || !url.startsWith("/uploads/")) return null;
  const segments = url.slice("/uploads/".length).split("/");
  if (
    segments.length === 0 ||
    segments.some((s) => !SAFE_SEGMENT.test(s) || s === "." || s === "..")
  ) {
    return null;
  }
  const absolute = resolve(UPLOAD_ROOT, ...segments);
  if (!absolute.startsWith(UPLOAD_ROOT + sep)) return null;
  return absolute;
}

/**
 * True when `url` is a local upload in `folder` that belongs to `userId`
 * (i.e. `/uploads/<folder>/<userId>/<file>`). Use this to validate any
 * client-supplied photo URL before storing it.
 */
export function isOwnedUploadUrl(
  url: string,
  userId: string,
  folder: UploadFolder
): boolean {
  if (!resolveUploadPath(url)) return false;
  const segments = url.slice("/uploads/".length).split("/");
  return (
    segments.length === 3 && segments[0] === folder && segments[1] === userId
  );
}

/**
 * Delete a local upload by its public URL. Silently ignores URLs that are
 * not safe local uploads and files that no longer exist.
 */
export async function deleteUploadByUrl(
  url: string | null | undefined
): Promise<void> {
  if (!url) return;
  const path = resolveUploadPath(url);
  if (!path) return;
  try {
    await unlink(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Failed to delete upload:", url, error);
    }
  }
}
