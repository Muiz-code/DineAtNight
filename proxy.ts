import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionValue } from "@/lib/session";

/**
 * Server-side admin auth guard.
 *
 * Protects all /admin/* routes except /admin/login by verifying the signed
 * `dan_admin` httpOnly cookie set by /api/admin/session (see lib/session.ts).
 *
 * This only guards the admin UI. Admin data is protected by Firestore/Storage
 * security rules, and admin API routes check the cookie themselves.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the login page and all non-admin routes through
  if (!pathname.startsWith("/admin") || pathname === "/admin/login") {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!cookieValue) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (!(await verifySessionValue(cookieValue))) {
    // Cookie exists but is invalid, expired, forged or no longer allowlisted — clear it and redirect
    const res = NextResponse.redirect(new URL("/admin/login", request.url));
    res.cookies.delete(ADMIN_COOKIE);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
