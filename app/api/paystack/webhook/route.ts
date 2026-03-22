import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { markTicketPaid, markMerchOrderPaid } from "@/lib/firestore";

export async function POST(req: NextRequest) {
  const SECRET = process.env.PAYSTACK_SECRET_KEY;
  if (!SECRET) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  const hash = crypto
    .createHmac("sha512", SECRET)
    .update(body)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature ?? ""))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);

  if (event.event === "charge.success") {
    const { reference, metadata } = event.data;

    // Distinguish ticket payments (have eventId) from merch order payments (have items)
    if (metadata?.eventId) {
      const { eventId, quantity } = metadata;
      try {
        await markTicketPaid(reference, eventId, Number(quantity ?? 1));
      } catch (err) {
        console.error("[webhook] markTicketPaid failed:", err);
      }
      // Ticket confirmation email is sent client-side on /tickets/verify
    } else if (metadata?.items) {
      try {
        await markMerchOrderPaid(reference);
      } catch (err) {
        console.error("[webhook] markMerchOrderPaid failed:", err);
      }
    } else {
      console.warn("[webhook] charge.success with unrecognised metadata shape:", reference);
    }
  }

  return NextResponse.json({ received: true });
}
