import { adminService } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

async function checkAdminAuth(request: Request) {
  try {
    const userEmail = request.headers.get("x-user-email");
    return userEmail === ADMIN_EMAIL;
  } catch (error) {
    return false;
  }
}

export async function GET(request: Request) {
  try {
    const isAdmin = await checkAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await adminService.getAllUsers();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Admin users API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
