import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { userService } from "@/lib/services/userService";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { comments, error } = await userService.getUserComments(session.user.id);
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Profile comments error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
