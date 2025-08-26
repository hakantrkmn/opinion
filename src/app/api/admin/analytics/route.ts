import { adminService } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

async function checkAdminAuth(request: NextRequest) {
  try {
    // Get email from request headers (sent by client)
    const userEmail = request.headers.get("x-user-email");

    if (!userEmail || userEmail !== ADMIN_EMAIL) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Auth check error:", error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await adminService.getAnalytics();

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Admin analytics API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
