import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public assets, login page, auth API routes, and cron API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-icon") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron") ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 2. Check for NextAuth session token cookies
  const token =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  // If no session token is found on a protected route, redirect to /login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
