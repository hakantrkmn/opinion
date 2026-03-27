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
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const result = await pinService.hasUserCommented(id, session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Has commented error:", error);
    return NextResponse.json({ error: "Failed to check" }, { status: 500 });
  }
}
