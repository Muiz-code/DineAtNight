import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Server-side admin auth guard.
 *
 * Protects all /admin/* routes except /admin/login.
 * Checks for the `dan_admin` httpOnly cookie set by /api/admin/session.
 *
 * This runs on the Edge before any page renders, preventing:
 * - Flash of unauthenticated admin content
 * - Direct URL access without JavaScript
 * - Admin email list from appearing in the client bundle (moved to ADMIN_EMAILS server env var)
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the login page and all non-admin routes through
  if (!pathname.startsWith("/admin") || pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Check for the httpOnly session cookie (set by POST /api/admin/session)
  const session = request.cookies.get("dan_admin")?.value;
  if (!session) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
