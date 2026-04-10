import type { PhotoUploadResult } from "@/types";
import { compressImage, needsCompression } from "@/utils/photoCompression";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { UPLOAD_DIR } from "@/lib/storage";

/**
 * Upload photo to local storage
 */
export async function uploadCommentPhoto(
  file: File,
  userId: string,
  commentId?: string
): Promise<PhotoUploadResult> {
  try {
    let finalFile = file;
    let metadata: Record<string, unknown> = {
      original_size: file.size,
      format: file.type.split("/")[1],
    };

    if (needsCompression(file)) {
      const compressionResult = await compressImage(file);
      finalFile = compressionResult.file;
      metadata = { ...metadata, ...compressionResult.metadata };
    }

    const fileName = generatePhotoFileName(finalFile.name, userId, commentId);
    const dirPath = join(UPLOAD_DIR, "comment-photos", userId);
    const filePath = join(dirPath, fileName);

    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }

    const buffer = Buffer.from(await finalFile.arrayBuffer());
    await writeFile(filePath, buffer);

    const url = `/uploads/comment-photos/${userId}/${fileName}`;

    return {
      success: true,
      url,
      metadata: {
        file_size: finalFile.size,
        width: (metadata.width as number) || 0,
        height: (metadata.height as number) || 0,
        format: (metadata.format as string) || "webp",
      },
    };
  } catch (error) {
    console.error("Photo upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown upload error",
    };
  }
}

/**
 * Delete photo from local storage
 */
export async function deleteCommentPhoto(photoUrl: string): Promise<boolean> {
  try {
    const relativePath = extractRelativePath(photoUrl);
    if (!relativePath) {
      console.error("Invalid photo URL for deletion:", photoUrl);
      return false;
    }

    const relative = relativePath.replace(/^\/uploads\//, "");
    const filePath = join(UPLOAD_DIR, relative);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    return true;
  } catch (error) {
    console.error("Delete photo error:", error);
    return false;
  }
}

function generatePhotoFileName(
  originalName: string,
  userId: string,
  commentId?: string
): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split(".").pop() || "webp";
  const prefix = commentId ? `comment-${commentId}` : "photo";
  return `${prefix}_${timestamp}_${randomId}.${extension}`;
}

function extractRelativePath(url: string): string | null {
  try {
    // Handle local URLs like /uploads/comment-photos/...
    if (url.startsWith("/uploads/")) {
      return url;
    }
    // Handle old Supabase URLs (for backward compatibility)
    const regex = /\/storage\/v1\/object\/public\/comment-photos\/(.+)$/;
    const match = url.match(regex);
    if (match) {
      return `/uploads/comment-photos/${match[1]}`;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate photo URL format
 */
export function isValidPhotoUrl(url: string): boolean {
  return url.startsWith("/uploads/comment-photos/");
}

/**
 * Get photo metadata from file
 */
export async function getPhotoMetadata(
  url: string
): Promise<Record<string, unknown> | null> {
  try {
    if (url.startsWith("/uploads/")) {
      const relative = url.replace(/^\/uploads\//, "");
      const filePath = join(UPLOAD_DIR, relative);
      const { stat } = await import("fs/promises");
      const stats = await stat(filePath);
      return {
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
      };
    }

    const response = await fetch(url, { method: "HEAD" });
    if (!response.ok) return null;
    return {
      size: response.headers.get("content-length")
        ? parseInt(response.headers.get("content-length")!, 10)
        : null,
      type: response.headers.get("content-type"),
      lastModified: response.headers.get("last-modified"),
    };
  } catch {
    return null;
  }
}
