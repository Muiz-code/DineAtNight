import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";

/**
 * POST /api/admin/session
 * Called after successful Firebase login. Verifies the Firebase ID token
 * (via Admin SDK if configured, otherwise via Firebase REST API),
 * checks the email against the server-side ADMIN_EMAILS list, and sets an
 * httpOnly session cookie containing a signed token that middleware verifies.
 *
 * The cookie value is: `email:expiry:hmac`
 * where hmac = HMAC-SHA256(email + ":" + expiry, SESSION_SECRET).
 * This lets proxy.ts cryptographically verify the session without a database lookup.
 */

// Server-side only — NOT prefixed with NEXT_PUBLIC_ so it stays out of the browser bundle
const ADMIN_EMAILS = process.env.ADMIN_EMAILS ?? "";
const SESSION_SECRET = process.env.SESSION_SECRET ?? "";

/** Returns an HMAC-SHA256 hex digest of `data` using `secret`. */
async function hmacSign(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: NextRequest) {
  if (!SESSION_SECRET) {
    console.error("[session] SESSION_SECRET env var is not set — admin login is disabled.");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const { idToken } = await req.json();

  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  // Verify the Firebase ID token. Uses Admin SDK when FIREBASE_SERVICE_ACCOUNT is
  // set (local JWT verification), otherwise falls back to the Firebase REST API.
  const email = await verifyFirebaseIdToken(idToken);
  if (!email) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Check email against server-side allowlist
  if (ADMIN_EMAILS) {
    const allowed = ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase());
    if (!allowed.includes(email.toLowerCase())) {
      return NextResponse.json({ error: "Not authorised" }, { status: 403 });
    }
  }

  // Build a signed cookie value: `email:expiry:signature`
  // The expiry matches the cookie maxAge so they expire together.
  const maxAge = 60 * 60 * 24; // 24 hours in seconds
  const expiry = Math.floor(Date.now() / 1000) + maxAge;
  const payload = `${email}:${expiry}`;
  const signature = await hmacSign(payload, SESSION_SECRET);
  const cookieValue = `${payload}:${signature}`;

  // Set an httpOnly session cookie — cannot be read or forged by browser JS
  const res = NextResponse.json({ ok: true });
  res.cookies.set("dan_admin", cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  });
  return res;
}

/**
 * DELETE /api/admin/session
 * Clears the session cookie on sign out.
 */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("dan_admin");
  return res;
}
