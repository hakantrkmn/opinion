import { NextRequest } from "next/server";
import {
  checkCsrfOrigin,
  enforceRateLimit,
  enforceBodyLimit,
  errors,
  errorResponse,
  handleRouteError,
  json,
  requireSession,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { uploadTypeSchema } from "@/lib/validation/user-schemas";
import { storeProcessedImage } from "@/server/services/photoService";
import {
  ImageProcessingError,
  MAX_UPLOAD_BYTES,
} from "@/server/services/imageProcessing";
import { setAvatar } from "@/server/services/users";
import type { UploadResponse } from "@/types/api";

/**
 * POST /api/upload (multipart: file, type=avatar|comment-photo)
 *   → 201 UploadResponse { url, metadata }
 *
 * Every upload is decoded and re-encoded to WebP server-side (EXIF-rotated,
 * metadata incl. GPS stripped, max 2048px for photos / 512px square for
 * avatars). The client's filename and MIME type are ignored.
 * - avatar: also becomes the user's avatar (previous file deleted).
 * - comment-photo: attach the returned url when creating/editing a comment.
 */
export async function POST(request: NextRequest) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "upload", RATE_LIMITS.upload, session.user.id);
    if (rl) return rl;

    // Reject oversized bodies before buffering them.
    const tooLarge = enforceBodyLimit(request, MAX_UPLOAD_BYTES + 64 * 1024);
    if (tooLarge) return tooLarge;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return errors.badRequest("Expected multipart/form-data");
    }

    const file = formData.get("file");
    if (!(file instanceof File)) return errors.badRequest("No file provided");
    if (file.size > MAX_UPLOAD_BYTES) {
      return errorResponse(413, "BAD_REQUEST", "File size must be less than 10MB");
    }
    const type = uploadTypeSchema.safeParse(formData.get("type"));
    if (!type.success) {
      return errors.badRequest("type must be 'avatar' or 'comment-photo'");
    }

    let result: UploadResponse;
    try {
      result =
        type.data === "avatar"
          ? await setAvatar(session.user.id, file)
          : await storeProcessedImage(
              file,
              session.user.id,
              "comment-photos",
              "comment-photo"
            );
    } catch (e) {
      if (e instanceof ImageProcessingError) {
        return errorResponse(422, "VALIDATION_ERROR", e.message);
      }
      throw e;
    }
    return json(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/upload");
  }
}
