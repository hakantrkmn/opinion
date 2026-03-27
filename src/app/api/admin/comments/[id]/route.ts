import { adminService } from "@/lib/services/adminService";
import { checkAdminAuth } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await checkAdminAuth();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await adminService.deleteComment(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete comment API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
