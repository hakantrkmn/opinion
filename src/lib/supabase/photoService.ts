import { createClient } from "@/lib/supabase/client";
import type { PhotoUploadResult } from "@/types";
import { compressImage, needsCompression } from "@/utils/photoCompression";

const supabase = createClient();

/**
 * Upload photo to Supabase Storage
 * Handles compression, file naming, and storage upload
 */
export async function uploadCommentPhoto(
  file: File,
  userId: string,
  commentId?: string
): Promise<PhotoUploadResult> {
  try {
    console.log("Starting photo upload:", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      userId,
      commentId,
    });

    // Step 1: Compress image if needed
    let finalFile = file;
    let metadata: Record<string, unknown> = {
      original_size: file.size,
      format: file.type.split("/")[1],
    };

    if (needsCompression(file)) {
      console.log("Compressing photo...");
      const compressionResult = await compressImage(file);
      finalFile = compressionResult.file;
      metadata = { ...metadata, ...compressionResult.metadata };

      console.log("Photo compressed:", {
        originalSize: file.size,
        compressedSize: finalFile.size,
        compressionRatio: metadata.compression_ratio,
      });
    }

    // Step 2: Generate file path
    const fileName = generatePhotoFileName(finalFile.name, userId, commentId);
    const filePath = `${userId}/${fileName}`;

    console.log("Uploading to path:", filePath);

    // Step 3: Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("comment-photos")
      .upload(filePath, finalFile, {
        cacheControl: "3600", // Cache for 1 hour
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      console.error("Supabase storage upload error:", error);
      return {
        success: false,
        error: `Upload failed: ${error.message}`,
      };
    }

    // Step 4: Get public URL
    const { data: urlData } = supabase.storage
      .from("comment-photos")
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      return {
        success: false,
        error: "Failed to get public URL for uploaded photo",
      };
    }

    console.log("Photo uploaded successfully:", {
      path: data.path,
      url: urlData.publicUrl,
      finalSize: finalFile.size,
    });

    return {
      success: true,
      url: urlData.publicUrl,
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
 * Delete photo from Supabase Storage
 */
export async function deleteCommentPhoto(photoUrl: string): Promise<boolean> {
  try {
    // Extract file path from URL
    const filePath = extractFilePathFromUrl(photoUrl);
    if (!filePath) {
      console.error("Invalid photo URL for deletion:", photoUrl);
      return false;
    }

    const { error } = await supabase.storage
      .from("comment-photos")
      .remove([filePath]);

    if (error) {
      console.error("Photo deletion error:", error);
      return false;
    }

    console.log("Photo deleted successfully:", filePath);
    return true;
  } catch (error) {
    console.error("Delete photo error:", error);
    return false;
  }
}

/**
 * Generate unique filename for photo
 */
function generatePhotoFileName(
  originalName: string,
  userId: string,
  commentId?: string
): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split(".").pop() || "webp";

  // Include comment ID if provided for easier tracking
  const prefix = commentId ? `comment-${commentId}` : "photo";

  return `${prefix}_${timestamp}_${randomId}.${extension}`;
}

/**
 * Extract file path from Supabase Storage URL
 */
function extractFilePathFromUrl(url: string): string | null {
  try {
    // Expected format: https://xxx.supabase.co/storage/v1/object/public/comment-photos/path/to/file.webp
    const regex = /\/storage\/v1\/object\/public\/comment-photos\/(.+)$/;
    const match = url.match(regex);
    return match ? match[1] : null;
  } catch (error) {
    console.error("Error extracting file path from URL:", error);
    return null;
  }
}

/**
 * Validate photo URL format
 */
export function isValidPhotoUrl(url: string): boolean {
  const pattern =
    /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/comment-photos\/.+$/;
  return pattern.test(url);
}

/**
 * Get photo metadata from URL (if possible)
 */
export async function getPhotoMetadata(
  url: string
): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    if (!response.ok) return null;

    const contentLength = response.headers.get("content-length");
    const contentType = response.headers.get("content-type");

    return {
      size: contentLength ? parseInt(contentLength, 10) : null,
      type: contentType,
      lastModified: response.headers.get("last-modified"),
    };
  } catch (error) {
    console.error("Error getting photo metadata:", error);
    return null;
  }
}
