import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { pinService } from "@/lib/services/pinService";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const result = await pinService.deleteCommentWithCleanup(id, session.user.id);
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
