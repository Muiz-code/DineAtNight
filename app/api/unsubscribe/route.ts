import { NextRequest, NextResponse } from "next/server";

const SESSION_SECRET = process.env.SESSION_SECRET ?? "";
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://dineatnight.com").replace(/\/$/, "");

async function verifyToken(email: string, token: string): Promise<boolean> {
  if (!SESSION_SECRET) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(email.toLowerCase()));
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return expected === token;
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email") ?? "";
  const token = req.nextUrl.searchParams.get("token") ?? "";

  if (!email || !token) {
    return NextResponse.redirect(`${APP_URL}/unsubscribe?status=invalid`);
  }

  const normalized = email.toLowerCase().trim();

  if (!(await verifyToken(normalized, token))) {
    return NextResponse.redirect(`${APP_URL}/unsubscribe?status=invalid`);
  }

  if (!projectId || !apiKey) {
    return NextResponse.redirect(`${APP_URL}/unsubscribe?status=error`);
  }

  try {
    const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/subscribers/${encodeURIComponent(normalized)}?key=${apiKey}`;
    await fetch(docUrl, { method: "DELETE" });
    return NextResponse.redirect(`${APP_URL}/unsubscribe?status=success&email=${encodeURIComponent(normalized)}`);
  } catch {
    return NextResponse.redirect(`${APP_URL}/unsubscribe?status=error`);
  }
}
