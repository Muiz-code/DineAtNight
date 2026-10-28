import { NextRequest, NextResponse } from "next/server";
import { setAdminClaim, setDisplayName, verifyFirebaseIdToken, type VerifiedUser } from "@/lib/firebase-admin";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createSessionValue,
  adminNameFor,
  isAllowedAdmin,
} from "@/lib/session";

/**
 * POST /api/admin/session
 * Called after Firebase login (and by the admin layout to self-heal). Verifies
 * the Firebase ID token with the Admin SDK and checks the email against
 * ADMIN_EMAILS — the single admin list (empty = nobody). Then:
 *  - syncs the `admin` custom claim that firestore.rules/storage.rules check
 *    (granted for listed admins, revoked for anyone no longer listed),
 *  - syncs the display name from ADMIN_EMAILS (`Name <email>` entries),
 *  - sets the httpOnly signed session cookie that proxy.ts and admin API
 *    routes verify (see lib/session.ts).
 * Returns `refreshToken: true` when claims changed, so the client must call
 * getIdToken(true) before using Firestore as an admin.
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

  let user: VerifiedUser | null;
  try {
    user = await verifyFirebaseIdToken(idToken);
  } catch (err) {
    // Usually a malformed FIREBASE_SERVICE_ACCOUNT (not valid one-line JSON)
    console.error("[session] Firebase Admin SDK failed to initialise:", err);
    return NextResponse.json({ error: "Server misconfiguration", missing: ["FIREBASE_SERVICE_ACCOUNT (invalid JSON)"] }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
  const email = user.email.toLowerCase();

  if (!isAllowedAdmin(email)) {
    // Removed from ADMIN_EMAILS: take away database access too
    if (user.isAdminClaim) await setAdminClaim(user.uid, false).catch((err) => console.error("[session] revoke claim:", err));
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  let refreshToken = false;
  try {
    if (!user.isAdminClaim) {
      await setAdminClaim(user.uid, true);
      refreshToken = true;
    }
    const name = adminNameFor(email);
    if (name && name !== user.name) {
      await setDisplayName(user.uid, name);
      refreshToken = true;
    }
  } catch (err) {
    console.error("[session] Failed to sync admin claim/name:", err);
    return NextResponse.json({ error: "Server misconfiguration", missing: ["Firebase Auth admin permission"] }, { status: 500 });
  }

  // Set an httpOnly session cookie — cannot be read or forged by browser JS
  const res = NextResponse.json({ ok: true, refreshToken });
  res.cookies.set(ADMIN_COOKIE, await createSessionValue(email), {
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
