import { NextRequest, NextResponse } from "next/server";
import { pinService } from "@/lib/services/pinService";
import {
  requireSession,
  enforceRateLimit,
  checkCsrfOrigin,
} from "@/lib/api-helpers";
import { idParamSchema } from "@/lib/validation/schemas";
import { RATE_LIMITS } from "@/lib/rate-limit";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error: authError } = await requireSession();
    if (authError) return authError;

    const rl = enforceRateLimit(request, "comment:cleanup", RATE_LIMITS.write, session.user.id);
    if (rl) return rl;

    const parsed = idParamSchema.safeParse(await params);
    if (!parsed.success) {
      return NextResponse.json({ success: false, pinDeleted: false, error: "Invalid id" }, { status: 400 });
    }

    const result = await pinService.deleteCommentWithCleanup(parsed.data.id, session.user.id);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Comment cleanup DELETE error:", error);
    return NextResponse.json(
      { success: false, pinDeleted: false, error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
