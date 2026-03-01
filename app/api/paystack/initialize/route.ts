import { NextRequest, NextResponse } from "next/server";
import { createPendingTicket } from "@/lib/firestore";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
if (!PAYSTACK_SECRET) throw new Error("Missing env var: PAYSTACK_SECRET_KEY");
if (!APP_URL) throw new Error("Missing env var: NEXT_PUBLIC_APP_URL");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, eventTitle, name, email, phone, quantity, ticketPrice, ticketType } = body;

    // ── Input validation ───────────────────────────────────────────────────
    if (!eventId || typeof eventId !== "string") {
      return NextResponse.json({ error: "Invalid eventId" }, { status: 400 });
    }
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      return NextResponse.json({ error: "Quantity must be between 1 and 20" }, { status: 400 });
    }
    const price = Number(ticketPrice);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "Invalid ticket price" }, { status: 400 });
    }
    // ──────────────────────────────────────────────────────────────────────

    const amountKobo = price * qty * 100; // Paystack uses kobo

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
            eventTitle: String(eventTitle ?? "").slice(0, 200),
            name: name.trim().slice(0, 100),
            phone: phone ? String(phone).slice(0, 20) : "",
            quantity: qty,
            ticketType: ticketType ? String(ticketType).slice(0, 50) : "",
          },
        }),
      }
    );

    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      return NextResponse.json(
        { error: paystackData.message || "Paystack error" },
        { status: 500 }
      );
    }

    const { reference, authorization_url } = paystackData.data;

    // Save a pending ticket in Firestore before redirecting
    await createPendingTicket({
      eventId,
      eventTitle: String(eventTitle ?? "").slice(0, 200),
      name: name.trim(),
      email,
      phone: phone ? String(phone).slice(0, 20) : "",
      quantity: qty,
      ticketType: ticketType ? String(ticketType).slice(0, 50) : undefined,
      amount: amountKobo,
      reference,
      status: "pending",
    });

    return NextResponse.json({ authorization_url, reference });
  } catch (err) {
    console.error("[paystack/initialize]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
