import { betterFetch } from "@better-fetch/fetch";
import type { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

type Session = typeof auth.$Infer.Session;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    pathname === "/googleb77d2e6c4cda70af.html"
  ) {
    return NextResponse.next();
  }

  const publicRoutes = ["/", "/pin", "/location", "/auth"];
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === "/" || pathname.startsWith(route)
  );

  const isAdminPage = pathname.startsWith("/admin");
  const isProfilePage = pathname.startsWith("/profile");

  if (isPublicRoute && !isAdminPage) {
    return NextResponse.next();
  }

  if (!isAdminPage && !isProfilePage) {
    return NextResponse.next();
  }

  // Self-fetch must hit the local HTTP listener, not the public origin.
  // Behind a TLS-terminating proxy (Dokploy/Traefik), request.nextUrl.origin
  // is https://... but the container serves plain HTTP — causing
  // ERR_SSL_PACKET_LENGTH_TOO_LONG. Prefer an explicit internal URL.
  const internalBaseUrl =
    process.env.INTERNAL_URL ||
    process.env.BETTER_AUTH_URL ||
    `http://127.0.0.1:${process.env.PORT || 3000}`;

  const { data: session } = await betterFetch<Session>(
    "/api/auth/get-session",
    {
      baseURL: internalBaseUrl,
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

  if (isAdminPage && session.user?.role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|uploads).*)"],
};
