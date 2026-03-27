import { betterFetch } from "@better-fetch/fetch";
import type { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

type Session = typeof auth.$Infer.Session;

export async function middleware(request: NextRequest) {
  // Public routes - no auth required
  const publicRoutes = ["/", "/pin", "/location", "/auth"];
  const isPublicRoute = publicRoutes.some(
    (route) =>
      request.nextUrl.pathname === "/" ||
      request.nextUrl.pathname.startsWith(route)
  );

  // Bypass for static files and special routes
  if (
    request.nextUrl.pathname === "/sitemap.xml" ||
    request.nextUrl.pathname === "/robots.txt" ||
    request.nextUrl.pathname === "/googleb77d2e6c4cda70af.html"
  ) {
    return NextResponse.next();
  }

  // Public routes don't need auth (except admin)
  if (isPublicRoute && !request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Protected routes: /admin, /profile
  if (
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/profile")
  ) {
    const { data: session } = await betterFetch<Session>(
      "/api/auth/get-session",
      {
        baseURL: request.nextUrl.origin,
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
      }
    );

    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|uploads).*)"],
};
