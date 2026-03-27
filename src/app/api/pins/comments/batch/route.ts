import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { pinService } from "@/lib/services/pinService";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;

    const body = await request.json();
    const { comments, error } = await pinService.getBatchComments(
      body.pinIds,
      userId
    );
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Batch comments error:", error);
    return NextResponse.json({ error: "Failed to get comments" }, { status: 500 });
  }
}
