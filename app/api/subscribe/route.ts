import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { sendNewsletterWelcomeEmail } from "@/lib/resend";
import { SUBSCRIBE_RATE_LIMIT, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";

/** gRPC ALREADY_EXISTS — thrown by `create()` when the doc exists. */
const ALREADY_EXISTS = 6;

export async function POST(req: NextRequest) {
  if (!(await checkRateLimit(`subscribe:${clientIp(req)}`, SUBSCRIBE_RATE_LIMIT, RATE_LIMIT_WINDOW_MS))) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  let email: unknown;
  try {
    ({ email } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const normalized = email.toLowerCase().trim();
  let isNew = true;
  try {
    await adminDb().collection("subscribers").doc(normalized).create({
      email: normalized,
      subscribedAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    if ((err as { code?: number }).code === ALREADY_EXISTS) {
      isNew = false;
    } else {
      console.error("[subscribe]", err);
      return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
    }
  }

  // Send welcome email server-side for new subscribers only
  if (isNew) {
    sendNewsletterWelcomeEmail(normalized).catch(() => {});
  }
  return NextResponse.json({ ok: true, isNew });
}
