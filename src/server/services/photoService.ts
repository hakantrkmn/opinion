import "server-only";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import type { PhotoMetadata } from "@/types/api";
import { UPLOAD_DIR } from "@/server/storage";
import {
  deleteUploadByUrl,
  resolveUploadPath,
  type UploadFolder,
} from "@/server/uploads";
import {
  ImageProcessingError,
  MAX_UPLOAD_BYTES,
  processImage,
  type ImagePreset,
} from "@/server/services/imageProcessing";

export type PhotoUploadResult = {
  success: boolean;
  url?: string;
  metadata?: PhotoMetadata;
  error?: string;
};

const SAFE_USER_ID = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Re-encode `file` and store it as `/uploads/<folder>/<userId>/<uuid>.webp`.
 * The file name is always server-generated; the client's name/MIME type are
 * ignored. Throws ImageProcessingError for invalid input.
 */
export async function storeProcessedImage(
  file: File,
  userId: string,
  folder: UploadFolder,
  preset: ImagePreset
): Promise<{ url: string; metadata: PhotoMetadata }> {
  if (!SAFE_USER_ID.test(userId)) throw new Error("Invalid user id");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ImageProcessingError("File size must be less than 10MB");
  }

  const input = Buffer.from(await file.arrayBuffer());
  const { buffer, metadata } = await processImage(input, preset);

  const url = `/uploads/${folder}/${userId}/${randomUUID()}.webp`;
  const absolute = resolveUploadPath(url);
  if (!absolute) throw new Error("Invalid upload path");

  await mkdir(join(UPLOAD_DIR, folder, userId), { recursive: true });
  await writeFile(absolute, buffer, { flag: "wx" });
  return { url, metadata };
}

/** Upload a comment photo for `userId`. Never throws. */
export async function uploadCommentPhoto(
  file: File,
  userId: string
): Promise<PhotoUploadResult> {
  try {
    const { url, metadata } = await storeProcessedImage(
      file,
      userId,
      "comment-photos",
      "comment-photo"
    );
    return { success: true, url, metadata };
  } catch (error) {
    if (error instanceof ImageProcessingError) {
      return { success: false, error: error.message };
    }
    console.error("Photo upload error:", error);
    return { success: false, error: "Upload failed" };
  }
}

/** Delete a comment photo by its public URL (safe for any input). */
export async function deleteCommentPhoto(photoUrl: string): Promise<boolean> {
  await deleteUploadByUrl(photoUrl);
  return true;
}
