import { NextRequest, NextResponse } from "next/server";
import { createPendingTicket, quoteTicket } from "@/lib/payments";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { MIN_TICKET_QUANTITY, MAX_TICKET_QUANTITY, CHECKOUT_RATE_LIMIT, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
  if (!PAYSTACK_SECRET) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (!(await checkRateLimit(`checkout:${clientIp(req)}`, CHECKOUT_RATE_LIMIT, RATE_LIMIT_WINDOW_MS))) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || req.nextUrl.origin;

  try {
    const body = await req.json();
    const { eventId, name, email, phone, quantity, ticketType } = body;

    // ── Input validation ───────────────────────────────────────────────────
    if (!eventId || typeof eventId !== "string" || eventId.includes("/")) {
      return NextResponse.json({ error: "Invalid eventId" }, { status: 400 });
    }
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < MIN_TICKET_QUANTITY || qty > MAX_TICKET_QUANTITY) {
      return NextResponse.json({ error: `Quantity must be between ${MIN_TICKET_QUANTITY} and ${MAX_TICKET_QUANTITY}` }, { status: 400 });
    }

    // ── Price and availability come from Firestore, never from the client ──
    let quote;
    try {
      quote = await quoteTicket(eventId, qty, typeof ticketType === "string" ? ticketType : undefined);
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid ticket request" }, { status: 400 });
    }
    // ──────────────────────────────────────────────────────────────────────

    const amountKobo = Math.round(quote.unitPrice * qty * 100); // Paystack uses kobo
    const cleanName = name.trim().slice(0, 100);
    const cleanPhone = phone ? String(phone).slice(0, 20) : "";

    // Initialize Paystack transaction
    const paystackRes = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: amountKobo,
          currency: "NGN",
          callback_url: `${APP_URL}/tickets/verify`,
          metadata: {
            eventId,
            eventTitle: quote.eventTitle.slice(0, 200),
            name: cleanName,
            phone: cleanPhone,
            quantity: qty,
            ticketType: quote.ticketType ?? "",
          },
        }),
      }
    );

    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      console.error("[paystack/initialize] Paystack rejected:", paystackData.message);
      return NextResponse.json({ error: "Payment provider error. Please try again." }, { status: 502 });
    }

    const { reference, authorization_url } = paystackData.data;

    // Save a pending ticket in Firestore before redirecting
    await createPendingTicket({
      eventId,
      eventTitle: quote.eventTitle.slice(0, 200),
      name: cleanName,
      email,
      phone: cleanPhone,
      quantity: qty,
      ...(quote.ticketType ? { ticketType: quote.ticketType } : {}),
      amount: amountKobo,
      reference,
    });

    return NextResponse.json({ authorization_url, reference });
  } catch (err) {
    console.error("[paystack/initialize]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
