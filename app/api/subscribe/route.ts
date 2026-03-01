import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // 10 subscribe attempts per hour per IP — prevents EmailJS quota exhaustion from bots
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit(ip, 10, 3_600_000)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const normalized = email.toLowerCase().trim();
    const ref = doc(collection(db, "subscribers"), normalized);
    const existing = await getDoc(ref);

    const isNew = !existing.exists();
    if (isNew) {
      await setDoc(ref, { email: normalized, subscribedAt: serverTimestamp() });
    }

    // Welcome email is sent client-side via EmailJS after this responds
    return NextResponse.json({ ok: true, isNew });
  } catch (err) {
    console.error("[subscribe]", err);
    return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
  }
}
