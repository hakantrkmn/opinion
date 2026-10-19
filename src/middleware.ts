import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

/**
 * Cheap gate for signed-in-only pages: only checks that a session cookie is
 * present (no DB / network). The real check — session validity and the
 * admin role — happens in the page's server component.
 */
const PROTECTED_PREFIXES = ["/profile", "/admin"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!isProtected(pathname)) return NextResponse.next();

  if (getSessionCookie(request)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/auth";
  url.search = "";
  url.searchParams.set("redirect", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

// Edge runtime. The build's "CompressionStream not supported in Edge"
// warning comes from better-auth/cookies' jose import and is harmless:
// getSessionCookie only reads the cookie.
export const config = {
  matcher: ["/profile/:path*", "/admin/:path*"],
};
