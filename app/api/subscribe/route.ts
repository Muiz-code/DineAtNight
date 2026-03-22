import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { sendNewsletterWelcomeEmail } from "@/lib/resend";
import { SUBSCRIBE_RATE_LIMIT, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";

export async function POST(req: NextRequest) {
  // 10 subscribe attempts per hour per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!(await checkRateLimit(ip, SUBSCRIBE_RATE_LIMIT, RATE_LIMIT_WINDOW_MS))) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!projectId || !apiKey) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const normalized = email.toLowerCase().trim();
    const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/subscribers/${encodeURIComponent(normalized)}?key=${apiKey}`;

    // PATCH upserts: creates if doc doesn't exist, updates if it does.
    // Firestore returns createTime === updateTime for newly created docs.
    const patchRes = await fetch(docUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          email: { stringValue: normalized },
          subscribedAt: { timestampValue: new Date().toISOString() },
        },
      }),
    });

    if (!patchRes.ok) {
      const errBody = await patchRes.json().catch(() => ({}));
      console.error("[subscribe] Firestore error:", patchRes.status, errBody);
      return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
    }

    // Detect new vs existing: Firestore sets createTime == updateTime on creation
    const patchData = await patchRes.json().catch(() => ({}));
    const isNew = patchData.createTime === patchData.updateTime;

    // Send welcome email server-side for new subscribers only
    if (isNew) {
      sendNewsletterWelcomeEmail(normalized).catch(() => {});
    }
    return NextResponse.json({ ok: true, isNew });
  } catch (err) {
    console.error("[subscribe]", err);
    return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
  }
}
