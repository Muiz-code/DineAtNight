import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Server-side admin auth guard.
 *
 * Protects all /admin/* routes except /admin/login.
 * Verifies the `dan_admin` httpOnly cookie set by /api/admin/session.
 *
 * Cookie format: `email:expiry:hmac`
 * where hmac = HMAC-SHA256(email + ":" + expiry, SESSION_SECRET).
 *
 * Verification happens on the Edge before any page renders, preventing:
 * - Flash of unauthenticated admin content
 * - Direct URL access without JavaScript
 * - Forged cookies (cryptographic check, not just existence check)
 */

const SESSION_SECRET = process.env.SESSION_SECRET ?? "";

/** Constant-time HMAC-SHA256 verification using the Web Crypto API (Edge-compatible). */
async function verifySessionCookie(cookieValue: string): Promise<boolean> {
  if (!SESSION_SECRET) return false;

  // Format: email:expiry:signature
  const lastColon = cookieValue.lastIndexOf(":");
  if (lastColon === -1) return false;
  const payload = cookieValue.slice(0, lastColon);     // "email:expiry"
  const signature = cookieValue.slice(lastColon + 1);  // hex hmac

  // Check expiry before doing crypto work
  const secondColon = payload.indexOf(":");
  if (secondColon === -1) return false;
  const expiry = Number(payload.slice(secondColon + 1));
  if (!expiry || Date.now() / 1000 > expiry) return false;

  // Verify HMAC signature
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const sigBytes = Uint8Array.from(
    signature.match(/.{2}/g)?.map((b) => parseInt(b, 16)) ?? [],
  );
  try {
    return await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(payload));
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the login page and all non-admin routes through
  if (!pathname.startsWith("/admin") || pathname === "/admin/login") {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get("dan_admin")?.value;
  if (!cookieValue) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const valid = await verifySessionCookie(cookieValue);
  if (!valid) {
    // Cookie exists but is invalid, expired, or forged — clear it and redirect
    const res = NextResponse.redirect(new URL("/admin/login", request.url));
    res.cookies.delete("dan_admin");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
