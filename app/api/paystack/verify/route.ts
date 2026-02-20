import { NextRequest, NextResponse } from "next/server";
import { doc, updateDoc, increment, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DanTicket } from "@/lib/firestore";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference");

  if (!reference) {
    return NextResponse.json({ error: "No reference provided" }, { status: 400 });
  }

  // ── Step 1: Verify with Paystack ──────────────────────────────────────
  let paystackData: Record<string, unknown>;
  try {
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
        cache: "no-store",
      }
    );
    paystackData = await paystackRes.json();
  } catch (err) {
    console.error("[verify] Paystack fetch failed:", err);
    return NextResponse.json({ error: "Could not reach Paystack. Check your internet connection." }, { status: 502 });
  }

  const txData = paystackData.data as Record<string, unknown> | undefined;

  if (!paystackData.status || txData?.status !== "success") {
    const paystackStatus = txData?.status ?? "unknown";
    console.error("[verify] Paystack status not success:", paystackStatus);
    return NextResponse.json(
      { error: `Payment not successful. Paystack status: ${paystackStatus}` },
      { status: 400 }
    );
  }

  const metadata = txData.metadata as Record<string, unknown> | undefined;
  const eventId = metadata?.eventId as string | undefined;
  const quantity = Number(metadata?.quantity ?? 1);

  // ── Step 2: Mark ticket as paid in Firestore ─────────────────────────
  try {
    await updateDoc(doc(db, "tickets", reference), { status: "paid" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[verify] Failed to update ticket status:", msg);
    return NextResponse.json(
      { error: `Ticket update failed: ${msg}` },
      { status: 500 }
    );
  }

  // ── Step 3: Increment soldTickets on event (best-effort) ──────────────
  if (eventId) {
    try {
      await updateDoc(doc(db, "events", eventId), {
        soldTickets: increment(quantity),
      });
    } catch (err) {
      // Non-fatal — ticket is already marked paid, just log this
      console.warn("[verify] Could not increment soldTickets:", err);
    }
  }

  // ── Step 4: Return ticket data ────────────────────────────────────────
  try {
    const snap = await getDoc(doc(db, "tickets", reference));
    const ticket = snap.exists() ? ({ id: snap.id, ...snap.data() } as DanTicket) : null;
    return NextResponse.json({ ok: true, ticket });
  } catch (err) {
    // Ticket was paid — just return success without the full data
    console.warn("[verify] Could not fetch ticket after paying:", err);
    return NextResponse.json({ ok: true, ticket: null });
  }
}
