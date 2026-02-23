import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { resend, FROM } from "@/lib/resend";
import { newsletterWelcomeEmail } from "@/lib/emails";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const normalized = email.toLowerCase().trim();

    // Store subscriber in Firestore (idempotent — doc ID is the email)
    const ref = doc(collection(db, "subscribers"), normalized);
    const existing = await getDoc(ref);

    if (!existing.exists()) {
      await setDoc(ref, {
        email: normalized,
        subscribedAt: serverTimestamp(),
      });

      // Send welcome email only on first subscription
      await resend.emails.send({
        from: FROM,
        to: normalized,
        subject: "Welcome to the Dine At Night community 🌙",
        html: newsletterWelcomeEmail(normalized),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[subscribe]", err);
    return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
  }
}
