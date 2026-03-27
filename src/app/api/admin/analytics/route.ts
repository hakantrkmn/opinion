import { adminService } from "@/lib/services/adminService";
import { checkAdminAuth } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const isAdmin = await checkAdminAuth();
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
