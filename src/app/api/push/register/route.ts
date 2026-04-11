import { NextRequest } from "next/server";
import {
  ApiErrorCode,
  errorResponse,
  json,
  requireSession,
  parseBody,
  enforceRateLimit,
  checkCsrfOrigin,
} from "@/lib/api-helpers";
import { registerPushTokenSchema } from "@/lib/validation/schemas";
import { pushService } from "@/lib/services/pushService";

export async function POST(request: NextRequest) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error } = await requireSession();
    if (error) return error;

    const rl = enforceRateLimit(
      request,
      "push:register",
      { limit: 10, windowMs: 60_000 },
      session.user.id
    );
    if (rl) return rl;

    const parsed = await parseBody(request, registerPushTokenSchema);
    if (parsed.error) return parsed.error;

    const result = await pushService.registerToken({
      userId: session.user.id,
      token: parsed.data.token,
      platform: parsed.data.platform,
      deviceName: parsed.data.deviceName ?? null,
    });

    if (!result.success) {
      return errorResponse(
        400,
        ApiErrorCode.BAD_REQUEST,
        result.error ?? "Failed to register token"
      );
    }
    return json({ success: true });
  } catch (err) {
    console.error("Push register API error:", err);
    return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, "Internal server error");
  }
}
