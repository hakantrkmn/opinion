import { NextResponse } from "next/server";

export async function POST() {
  // Better Auth handles signout via the client SDK
  // This route just redirects to /auth
  return NextResponse.redirect(
    new URL(
      "/auth",
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    )
  );
}
