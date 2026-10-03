import { NextRequest, NextResponse, after } from "next/server";
import { fetchPaystackTransaction, getTicket, isValidReference, markTicketPaid } from "@/lib/payments";
import { pushTicketToCheckin } from "@/lib/checkin";
import { sendTicketConfirmationEmail } from "@/lib/resend";

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference");
  if (!isValidReference(reference)) {
    return NextResponse.json({ error: "Invalid payment reference" }, { status: 400 });
  }

  // ── Step 1: Verify with Paystack ──────────────────────────────────────
  let tx;
  try {
    tx = await fetchPaystackTransaction(reference);
  } catch (err) {
    console.error("[verify] Paystack fetch failed:", err);
    return NextResponse.json({ error: "Could not reach Paystack. Please refresh in a moment." }, { status: 502 });
  }
  if (!tx || tx.status !== "success") {
    return NextResponse.json(
      { error: `Payment not successful. Paystack status: ${tx?.status ?? "unknown"}` },
      { status: 400 }
    );
  }

  // ── Step 2: Mark ticket paid (idempotent transaction, amount-checked) ──
  let newlyPaid: boolean;
  try {
    newlyPaid = await markTicketPaid(reference, tx.amount);
  } catch (err) {
    console.error("[verify] markTicketPaid failed:", reference, err);
    return NextResponse.json(
      { error: "We couldn't confirm this ticket. Please contact support with your reference." },
      { status: 500 }
    );
  }

  // ── Step 3: Return ticket data; send confirmation email once ────────────
  const ticket = await getTicket(reference).catch(() => null);
  if (!ticket) return NextResponse.json({ ok: true, ticket: null });

  if (newlyPaid) {
    // Forward to the external check-in system once, after the response is sent
    after(() => pushTicketToCheckin(reference));
    sendTicketConfirmationEmail({
      name: ticket.name,
      email: ticket.email,
      eventTitle: ticket.eventTitle,
      quantity: ticket.quantity,
      amount: ticket.amount,
      reference,
    }).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    ticket: {
      reference,
      eventTitle: ticket.eventTitle,
      name: ticket.name,
      email: ticket.email,
      phone: ticket.phone,
      quantity: ticket.quantity,
      amount: ticket.amount,
      status: ticket.status === "pending" ? "paid" : ticket.status,
    },
  });
}
