import { apiFormData } from "@/lib/api/client";
import type { PhotoUploadResult } from "@/types";

export async function uploadCommentPhotoViaApi(
  file: File,
  commentId?: string
): Promise<PhotoUploadResult> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "comment-photo");
    if (commentId) formData.append("commentId", commentId);

    const data = await apiFormData<{
      url: string;
      metadata: PhotoUploadResult["metadata"];
    }>("/api/upload", formData);

    return { success: true, url: data.url, metadata: data.metadata };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}
