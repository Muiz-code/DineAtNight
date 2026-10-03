import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createSessionValue,
  isAllowedAdmin,
} from "@/lib/session";

/**
 * POST /api/admin/session
 * Called after successful Firebase login. Verifies the Firebase ID token with
 * the Admin SDK, checks the email against the server-side ADMIN_EMAILS list
 * (empty list = nobody), and sets an httpOnly signed session cookie that
 * proxy.ts and admin API routes verify (see lib/session.ts).
 */
export async function POST(req: NextRequest) {
  // Name the missing env vars (names only, never values) so the login page can say what to fix
  const missing = ["SESSION_SECRET", "ADMIN_EMAILS", "FIREBASE_SERVICE_ACCOUNT"].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`[session] Missing env vars: ${missing.join(", ")} — admin login is disabled.`);
    return NextResponse.json({ error: "Server misconfiguration", missing }, { status: 500 });
  }

  let idToken: unknown;
  try {
    ({ idToken } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  let email: string | null;
  try {
    email = await verifyFirebaseIdToken(idToken);
  } catch (err) {
    // Usually a malformed FIREBASE_SERVICE_ACCOUNT (not valid one-line JSON)
    console.error("[session] Firebase Admin SDK failed to initialise:", err);
    return NextResponse.json({ error: "Server misconfiguration", missing: ["FIREBASE_SERVICE_ACCOUNT (invalid JSON)"] }, { status: 500 });
  }
  if (!email) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
  if (!isAllowedAdmin(email)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  // Set an httpOnly session cookie — cannot be read or forged by browser JS
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await createSessionValue(email.toLowerCase()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_SESSION_MAX_AGE,
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
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
