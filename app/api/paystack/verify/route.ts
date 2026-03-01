import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { markTicketPaid, type DanTicket } from "@/lib/firestore";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
if (!PAYSTACK_SECRET) throw new Error("Missing env var: PAYSTACK_SECRET_KEY");

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

  // ── Step 2: Mark ticket paid (idempotent transaction) ─────────────────
  // markTicketPaid uses a Firestore transaction that checks status first,
  // so a concurrent webhook call will not double-increment soldTickets.
  if (eventId) {
    try {
      await markTicketPaid(reference, eventId, quantity);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[verify] markTicketPaid failed:", msg);
      return NextResponse.json(
        { error: `Ticket update failed: ${msg}` },
        { status: 500 }
      );
    }
  }

  // ── Step 3: Return ticket data ────────────────────────────────────────
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
