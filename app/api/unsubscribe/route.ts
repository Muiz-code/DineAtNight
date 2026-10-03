import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyHmacHex } from "@/lib/session";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://dineatnight.com").replace(/\/$/, "");

/** Deletes the subscriber if the HMAC token matches. Returns the outcome status. */
async function unsubscribe(email: string, token: string): Promise<"success" | "invalid" | "error"> {
  if (!email || !token) return "invalid";
  const normalized = email.toLowerCase().trim();
  if (!(await verifyHmacHex(normalized, token))) return "invalid";
  try {
    await adminDb().collection("subscribers").doc(normalized).delete();
    return "success";
  } catch (err) {
    console.error("[unsubscribe]", err);
    return "error";
  }
}

/** Link clicked from an email — unsubscribes and shows the result page. */
export async function GET(req: NextRequest) {
  const status = await unsubscribe(
    req.nextUrl.searchParams.get("email") ?? "",
    req.nextUrl.searchParams.get("token") ?? "",
  );
  return NextResponse.redirect(`${APP_URL}/unsubscribe?status=${status}`);
}

/** RFC 8058 one-click unsubscribe (Gmail/Yahoo "Unsubscribe" button). */
export async function POST(req: NextRequest) {
  const status = await unsubscribe(
    req.nextUrl.searchParams.get("email") ?? "",
    req.nextUrl.searchParams.get("token") ?? "",
  );
  return NextResponse.json({ status }, { status: status === "success" ? 200 : status === "invalid" ? 400 : 500 });
}
