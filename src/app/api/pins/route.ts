import { NextRequest } from "next/server";
import { pinService } from "@/lib/services/pinService";
import {
  ApiErrorCode,
  errorResponse,
  json,
  parseFormData,
  getSession,
  parseQuery,
  requireSession,
  enforceRateLimit,
  checkCsrfOrigin,
} from "@/lib/api-helpers";
import { createPinFormSchema, pinsQuerySchema } from "@/lib/validation/schemas";
import { RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const userId = session?.user?.id;
    const rl = enforceRateLimit(request, "pins:get", RATE_LIMITS.read, userId);
    if (rl) return rl;

    const parsed = parseQuery(request, pinsQuerySchema);
    if (parsed.error) return parsed.error;

    if (parsed.data.scope === "following" && !userId) {
      return json({ pins: [] });
    }

    const { pins, error } = await pinService.getPins(parsed.data, {
      requesterUserId: userId,
      scope: parsed.data.scope,
    });
    if (error) return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, error);
    return json({ pins });
  } catch (error) {
    console.error("Pins GET error:", error);
    return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, "Failed to get pins");
  }
}

export async function POST(request: NextRequest) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error: authError } = await requireSession();
    if (authError) return authError;

    const rl = enforceRateLimit(request, "pins:post", RATE_LIMITS.write, session.user.id);
    if (rl) return rl;

    const parsed = await parseFormData(request, createPinFormSchema);
    if (parsed.error) return parsed.error;

    const photoEntry = parsed.formData.get("photo");
    const photo = photoEntry instanceof File ? photoEntry : undefined;

    const { pin, error } = await pinService.createPin(
      {
        pinName: parsed.data.pinName,
        comment: parsed.data.comment,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        photo,
        photoMetadata: parsed.data.photoMetadata as never,
      },
      session.user.id
    );
    if (error) return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, error);
    return json({ pin });
  } catch (error) {
    console.error("Pins POST error:", error);
    return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, "Failed to create pin");
  }
}
