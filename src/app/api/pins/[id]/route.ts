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
    const { success, error } = await pinService.deletePin(id, session.user.id);
    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ success });
  } catch (error) {
    console.error("Pin DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete pin" }, { status: 500 });
  }
}
