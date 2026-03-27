import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { pinService } from "@/lib/services/pinService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;

    const { id } = await params;
    const { comments, error } = await pinService.getPinComments(id, userId);
    return NextResponse.json({ comments, error });
  } catch (error) {
    console.error("Pin comments GET error:", error);
    return NextResponse.json({ error: "Failed to get comments" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { comment, error } = await pinService.addComment(
      id,
      body.text,
      session.user.id,
      body.photoUrl,
      body.photoMetadata
    );
    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ comment });
  } catch (error) {
    console.error("Pin comment POST error:", error);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}
