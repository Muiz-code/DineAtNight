import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { markTicketPaid } from "@/lib/firestore";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET)
    .update(body)
    .digest("hex");

  if (hash !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);

  if (event.event === "charge.success") {
    const { reference, metadata } = event.data;
    const { eventId, quantity } = metadata;
    try {
      await markTicketPaid(reference, eventId, quantity);
    } catch (err) {
      console.error("[webhook] markTicketPaid failed:", err);
    }
    // Ticket confirmation email is sent client-side on /tickets/verify
  }

  return NextResponse.json({ received: true });
}
