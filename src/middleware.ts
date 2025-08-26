import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // Auth sayfasına gidiyorsa middleware bypass - %40-60 hızlanma
  if (request.nextUrl.pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  // Sitemap ve robots.txt için middleware bypass
  if (
    request.nextUrl.pathname === "/sitemap.xml" ||
    request.nextUrl.pathname === "/robots.txt" ||
    request.nextUrl.pathname === "/googleb77d2e6c4cda70af.html"
  ) {
    return NextResponse.next();
  }

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

export const config = {
  // Auth, API routes ve static dosyalar için middleware çalışmasın
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
