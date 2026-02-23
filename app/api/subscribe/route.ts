import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req: NextRequest) {
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
