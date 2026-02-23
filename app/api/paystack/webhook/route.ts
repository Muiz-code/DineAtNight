import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { markTicketPaid, getTicketByReference } from "@/lib/firestore";
import { resend, FROM } from "@/lib/resend";
import { ticketConfirmationEmail } from "@/lib/emails";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  // Validate webhook signature
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET)
    .update(body)
    .digest("hex");

  if (hash !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);

  if (event.event === "charge.success") {
    const { reference, metadata, customer } = event.data;
    const { eventId, quantity } = metadata;

    try {
      await markTicketPaid(reference, eventId, quantity);
    } catch (err) {
      console.error("[webhook] markTicketPaid failed:", err);
    }

    // Send ticket confirmation email
    try {
      // Pull the full ticket from Firestore for accurate data
      const ticket = await getTicketByReference(reference);

      const recipientEmail = ticket?.email ?? customer?.email;
      if (recipientEmail) {
        const eventDate = metadata.eventDate as string | undefined;

        await resend.emails.send({
          from: FROM,
          to: recipientEmail,
          subject: `🎟️ Your Dine At Night Ticket — ${metadata.eventTitle ?? "Event"}`,
          html: ticketConfirmationEmail({
            name: ticket?.name ?? metadata.name ?? "Guest",
            email: recipientEmail,
            eventTitle: ticket?.eventTitle ?? metadata.eventTitle ?? "Dine At Night",
            eventDate,
            quantity: ticket?.quantity ?? Number(quantity),
            amount: ticket?.amount ?? event.data.amount,
            reference,
          }),
        });
      }
    } catch (err) {
      // Email failure should never block the webhook response
      console.error("[webhook] email send failed:", err);
    }
  }

  return NextResponse.json({ received: true });
}
