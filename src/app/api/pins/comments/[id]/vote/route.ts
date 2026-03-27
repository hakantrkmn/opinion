import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { pinService } from "@/lib/services/pinService";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    if (body.value !== 1 && body.value !== -1) {
      return NextResponse.json({ error: "Vote value must be 1 or -1" }, { status: 400 });
    }

    const { success, error } = await pinService.voteComment(
      id,
      body.value,
      session.user.id
    );
    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ success });
  } catch (error) {
    console.error("Vote POST error:", error);
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}
