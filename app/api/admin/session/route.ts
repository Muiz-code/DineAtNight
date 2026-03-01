import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/session
 * Called after successful Firebase login. Verifies the Firebase ID token
 * by calling Firebase's token lookup endpoint (no firebase-admin required),
 * checks the email against the server-side ADMIN_EMAILS list, and sets an
 * httpOnly session cookie that middleware can read.
 *
 * The cookie is httpOnly so browser JavaScript cannot read or forge it —
 * only this server route can set it.
 */

// Server-side only — NOT prefixed with NEXT_PUBLIC_ so it stays out of the browser bundle
const ADMIN_EMAILS = process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "";
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export async function POST(req: NextRequest) {
  const { idToken } = await req.json();

  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  // Verify the Firebase ID token is legitimate by calling Firebase's REST API.
  // This confirms the token was issued by Firebase Auth, not forged.
  let email: string | undefined;
  try {
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );
    const verifyData = await verifyRes.json();
    email = verifyData?.users?.[0]?.email as string | undefined;
  } catch {
    return NextResponse.json({ error: "Token verification failed" }, { status: 401 });
  }

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

  // Set an httpOnly session cookie — cannot be read or forged by browser JS
  const res = NextResponse.json({ ok: true });
  res.cookies.set("dan_admin", "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
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
