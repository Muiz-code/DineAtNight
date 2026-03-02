import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // 10 subscribe attempts per hour per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit(ip, 10, 3_600_000)) {
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

    // 404 = new subscriber; 403 = exists but no read permission; 200 = exists
    const checkRes = await fetch(docUrl);
    const isNew = checkRes.status === 404;

    // PATCH upserts: creates if 404, updates if already exists
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

    // Welcome email is sent client-side via EmailJS after this responds
    return NextResponse.json({ ok: true, isNew });
  } catch (err) {
    console.error("[subscribe]", err);
    return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
  }
}
