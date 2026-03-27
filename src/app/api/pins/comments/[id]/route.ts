import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { pinService } from "@/lib/services/pinService";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { success, error } = await pinService.updateComment(
      id,
      body.text,
      session.user.id,
      body.photoUrl,
      body.photoMetadata
    );
    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ success });
  } catch (error) {
    console.error("Comment PUT error:", error);
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { success, error } = await pinService.deleteComment(id, session.user.id);
    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ success });
  } catch (error) {
    console.error("Comment DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
