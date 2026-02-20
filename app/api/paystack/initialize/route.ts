import { NextRequest, NextResponse } from "next/server";
import { createPendingTicket } from "@/lib/firestore";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function POST(req: NextRequest) {
  try {
    const { eventId, eventTitle, name, email, phone, quantity, ticketPrice } =
      await req.json();

    if (!eventId || !name || !email || !quantity || !ticketPrice) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const amountKobo = ticketPrice * quantity * 100; // Paystack uses kobo

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
            eventTitle,
            name,
            phone,
            quantity,
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
      eventTitle,
      name,
      email,
      phone,
      quantity,
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
