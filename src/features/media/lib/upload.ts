import { apiFormData } from "@/lib/api/client";
import type { UploadResponse } from "@/types/api";

/** Uploads an already compressed comment photo; returns its public URL. */
export function uploadCommentPhoto(file: File) {
  const form = new FormData();
  form.append("file", file);
  form.append("type", "comment-photo");
  return apiFormData<UploadResponse>("/api/upload", form);
}
