import { NextRequest } from "next/server";
import { uploadCommentPhoto } from "@/lib/services/photoService";
import { userService } from "@/lib/services/userService";
import {
  errorResponse,
  json,
  requireSession,
  enforceRateLimit,
  checkCsrfOrigin,
} from "@/lib/api-helpers";
import { uploadTypeSchema } from "@/lib/validation/schemas";
import { RATE_LIMITS } from "@/lib/rate-limit";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

export async function POST(request: NextRequest) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error: authError } = await requireSession();
    if (authError) return authError;

    const rl = enforceRateLimit(request, "upload", RATE_LIMITS.upload, session.user.id);
    if (rl) return rl;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return errorResponse(400, "Invalid form data");
    }

    const file = formData.get("file");
    if (!(file instanceof File)) return errorResponse(400, "No file provided");

    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(400, "File size must be less than 10MB");
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse(400, "Only image files are allowed (JPG, PNG, WebP, GIF)");
    }

    const typeValue = formData.get("type");
    const typeParsed = uploadTypeSchema.safeParse(typeValue);
    if (!typeParsed.success) return errorResponse(400, "Invalid upload type");

    if (typeParsed.data === "avatar") {
      const result = await userService.uploadAvatar(session.user.id, file);
      if (result.error) return errorResponse(400, result.error);
      return json({ url: result.avatarUrl });
    }

    const commentIdRaw = formData.get("commentId");
    const commentId = typeof commentIdRaw === "string" && commentIdRaw.length > 0
      ? commentIdRaw
      : undefined;
    if (commentId && !/^[a-zA-Z0-9_-]{1,64}$/.test(commentId)) {
      return errorResponse(400, "Invalid commentId");
    }

    const result = await uploadCommentPhoto(file, session.user.id, commentId);
    if (!result.success) return errorResponse(400, result.error || "Upload failed");
    return json({ url: result.url, metadata: result.metadata });
  } catch (error) {
    console.error("Upload error:", error);
    return errorResponse(500, "Upload failed");
  }
}
