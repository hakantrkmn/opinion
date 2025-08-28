import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // Public routes - no auth required
  const publicRoutes = ["/", "/pin", "/location", "/auth"];
  const isPublicRoute = publicRoutes.some(
    (route) =>
      request.nextUrl.pathname === "/" ||
      request.nextUrl.pathname.startsWith(route)
  );

  // Sitemap ve robots.txt için middleware bypass
  if (
    request.nextUrl.pathname === "/sitemap.xml" ||
    request.nextUrl.pathname === "/robots.txt" ||
    request.nextUrl.pathname === "/googleb77d2e6c4cda70af.html"
  ) {
    return NextResponse.next();
  }

  // Public routes için auth kontrolü yapmadan geç
  if (isPublicRoute && !request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Admin routes için auth kontrol et
  if (
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/profile")
  ) {
    let response = NextResponse.next({
      request,
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth";
      return NextResponse.redirect(url);
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Auth, API routes ve static dosyalar için middleware çalışmasın
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
