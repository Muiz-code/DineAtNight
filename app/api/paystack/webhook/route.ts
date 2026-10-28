import { NextRequest, NextResponse, after } from "next/server";
import crypto from "crypto";
import { isValidReference, markMerchOrderPaid, markTicketPaid } from "@/lib/payments";
import { pushTicketToCheckin } from "@/lib/checkin";

/**
 * Paystack webhook — the authoritative payment confirmation channel.
 * Configure in Paystack Dashboard → Settings → API Keys & Webhooks:
 *   https://<your-domain>/api/paystack/webhook
 */
export async function POST(req: NextRequest) {
  const SECRET = process.env.PAYSTACK_SECRET_KEY;
  if (!SECRET) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const body = await req.text();
  const signature = Buffer.from(req.headers.get("x-paystack-signature") ?? "");
  const expected = Buffer.from(crypto.createHmac("sha512", SECRET).update(body).digest("hex"));

  if (signature.length !== expected.length || !crypto.timingSafeEqual(expected, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);
  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  const { reference, amount, metadata } = event.data ?? {};
  if (!isValidReference(reference) || typeof amount !== "number") {
    console.warn("[webhook] charge.success with invalid reference/amount:", reference);
    return NextResponse.json({ received: true });
  }

  try {
    // Ticket payments carry eventId; merch payments carry items
    if (metadata?.eventId) {
      if (await markTicketPaid(reference, amount)) {
        // Forward to the external check-in system once, after responding to Paystack
        after(() => pushTicketToCheckin(reference));
      }
    } else if (metadata?.items) {
      await markMerchOrderPaid(reference, amount);
    } else {
      console.warn("[webhook] charge.success with unrecognised metadata shape:", reference);
    }
  } catch (err) {
    // Return 500 so Paystack retries (transient Firestore errors)
    console.error("[webhook] failed to mark paid:", reference, err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
