import { after, type NextRequest } from "next/server";
import {
  checkCsrfOrigin,
  enforceRateLimit,
  errorResponse,
  getSession,
  handleRouteError,
  json,
  parseFormData,
  parseQuery,
  requireSession,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { createPinFormSchema, pinsQuerySchema, PIN_PHOTO_MAX_BYTES } from "@/lib/validation/schemas";
import {
  createPin,
  getPinsInBounds,
  mapCacheHeaders,
  notifyFollowersOfNewPin,
} from "@/server/services/pins";
import { checkCreateDistance } from "@/server/services/pins/geo";
import { uploadCommentPhoto } from "@/server/services/photoService";
import { deleteUploadByUrl } from "@/server/uploads";
import type { CreatePinResponse, PinsInBoundsResponse } from "@/types/api";

/**
 * GET /api/pins?minLat&maxLat&minLng&maxLng&scope=all|following
 * → PinsInBoundsResponse (newest first, capped, `truncated` when capped).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const viewerId = session?.user.id ?? null;

    const rl = enforceRateLimit(request, "pins:list", RATE_LIMITS.map, viewerId);
    if (rl) return rl;

    const q = parseQuery(request, pinsQuerySchema);
    if (q.error) return q.error;

    const body: PinsInBoundsResponse = await getPinsInBounds({
      bounds: q.data,
      scope: q.data.scope,
      viewerId,
    });
    return json(body, { headers: mapCacheHeaders(viewerId, q.data.scope) });
  } catch (error) {
    return handleRouteError(error, "GET /api/pins");
  }
}

/**
 * POST /api/pins (multipart/form-data)
 *   name, comment, lat, lng, user_lat, user_lng, accuracy, photo?
 * → 201 CreatePinResponse | 422 TOO_FAR | 400 VALIDATION_ERROR
 */
export async function POST(request: NextRequest) {
  let uploadedPhotoUrl: string | null = null;
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error: authError } = await requireSession();
    if (authError) return authError;
    const userId = session.user.id;

    const rl = enforceRateLimit(request, "pins:create", RATE_LIMITS.write, userId);
    if (rl) return rl;

    const parsed = await parseFormData(request, createPinFormSchema, {
      maxBytes: PIN_PHOTO_MAX_BYTES + 64 * 1024,
    });
    if (parsed.error) return parsed.error;
    const input = parsed.data;

    const distance = checkCreateDistance(
      { lat: input.lat, lng: input.lng },
      { lat: input.user_lat, lng: input.user_lng },
      input.accuracy
    );
    if (!distance.ok) {
      return errorResponse(
        422,
        "TOO_FAR",
        `You must be within ${Math.round(distance.maxDistance)} m of the place to drop a pin`,
        {
          issues: {
            distance_m: Math.round(distance.distance),
            max_distance_m: Math.round(distance.maxDistance),
          },
        }
      );
    }

    const photoEntry = parsed.formData.get("photo");
    let photo: { url: string; metadata: Record<string, unknown> } | null = null;
    if (photoEntry instanceof File && photoEntry.size > 0) {
      if (photoEntry.size > PIN_PHOTO_MAX_BYTES) {
        return errorResponse(400, "VALIDATION_ERROR", "Photo must be 10 MB or smaller");
      }
      const uploaded = await uploadCommentPhoto(photoEntry, userId);
      if (!uploaded.success || !uploaded.url) {
        return errorResponse(
          400,
          "VALIDATION_ERROR",
          uploaded.error || "Photo could not be processed"
        );
      }
      uploadedPhotoUrl = uploaded.url;
      photo = { url: uploaded.url, metadata: { ...(uploaded.metadata ?? {}) } };
    } else if (photoEntry !== null && !(photoEntry instanceof File)) {
      return errorResponse(400, "VALIDATION_ERROR", "photo must be a file");
    }

    const body: CreatePinResponse = await createPin({
      userId,
      name: input.name,
      comment: input.comment,
      lat: input.lat,
      lng: input.lng,
      photo,
    });
    uploadedPhotoUrl = null; // now owned by the comment row

    after(() =>
      notifyFollowersOfNewPin({
        authorId: userId,
        pinId: body.pin.id,
        pinName: body.pin.name,
        lat: body.pin.lat,
        lng: body.pin.lng,
      })
    );

    return json(body, { status: 201 });
  } catch (error) {
    if (uploadedPhotoUrl) await deleteUploadByUrl(uploadedPhotoUrl);
    return handleRouteError(error, "POST /api/pins");
  }
}
