/**
 * Everything that happens once a ticket order is paid (server-only).
 *
 * Called by whichever of the Paystack webhook or /api/paystack/verify marks
 * the order paid first (markTicketPaid returns true exactly once), so the
 * emails go out once whichever path wins. Run it inside next/server `after()`.
 */

import { pushTicketToCheckin } from "./checkin";
import { adminDb } from "./firebase-admin";
import { entryLabel } from "./entryWindow";
import type { DanEvent, DanTicket } from "./firestore";
import { getTicket } from "./payments";
import { sendTicketConfirmationEmail } from "./resend";

/** The ticket's tier entry window for the email ("8:00 PM – 12:00 AM"), if it has one. */
async function entryTimeFor(ticket: DanTicket): Promise<{ entryTime?: string }> {
  try {
    if (!ticket.ticketType || !ticket.eventId) return {};
    const snap = await adminDb().collection("events").doc(ticket.eventId).get();
    const tier = (snap.data() as DanEvent | undefined)?.ticketTypes?.find((t) => t.name === ticket.ticketType);
    const label = entryLabel(tier);
    return label ? { entryTime: label } : {};
  } catch (err) {
    console.error("[ticketDelivery] couldn't read the entry time:", err);
    return {}; // the email still goes out, without the entry row
  }
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Re-sends the email for an existing ticket — the same reference and QR code,
 * never a new ticket. A guest's ticket goes out as the guest copy ("Ada got you
 * a ticket"); a buyer's lists their guests. `to` overrides the address (e.g. the
 * buyer mistyped it) without changing the ticket.
 */
export async function resendTicketEmail(
  reference: string,
  to?: string,
): Promise<{ ok: true; sentTo: string } | { ok: false; error: string }> {
  const ticket = await getTicket(reference);
  if (!ticket) return { ok: false, error: "Ticket not found." };
  if (ticket.status !== "paid" && ticket.status !== "confirmed") {
    return { ok: false, error: "This ticket hasn't been paid for." };
  }
  const email = to || ticket.email;
  const entry = await entryTimeFor(ticket);
  const sent = ticket.parentReference
    ? await sendTicketConfirmationEmail({
        name: ticket.name,
        email,
        eventTitle: ticket.eventTitle,
        quantity: 1,
        amount: 0,
        reference,
        sentBy: ticket.purchasedBy ?? (await getTicket(ticket.parentReference))?.name ?? "A friend",
        ...entry,
      })
    : await sendTicketConfirmationEmail({
        name: ticket.name,
        email,
        eventTitle: ticket.eventTitle,
        quantity: ticket.quantity,
        amount: ticket.amount,
        reference,
        ...(ticket.guests?.length ? { guests: ticket.guests } : {}),
        ...entry,
        ...(ticket.coupon && ticket.amount === 0 ? { free: true } : {}),
      });
  return sent ? { ok: true, sentTo: email } : { ok: false, error: "The email couldn't be sent. Try again." };
}

export async function deliverPaidTicket(reference: string): Promise<void> {
  const ticket = await getTicket(reference);
  if (!ticket || (ticket.status !== "paid" && ticket.status !== "confirmed")) return;
  const guestRefs = ticket.guestReferences ?? [];
  const guests = ticket.guests ?? [];
  const entry = await entryTimeFor(ticket);

  // External check-in system: the buyer's ticket and each guest's
  await Promise.all([reference, ...guestRefs].map((r) => pushTicketToCheckin(r).catch(() => {})));

  // The buyer's email (lists any guests), then one per guest — spaced out to
  // stay under Resend's per-second limit
  await sendTicketConfirmationEmail({
    name: ticket.name,
    email: ticket.email,
    eventTitle: ticket.eventTitle,
    quantity: ticket.quantity,
    amount: ticket.amount,
    reference,
    ...(guests.length ? { guests } : {}),
    ...entry,
    ...(ticket.coupon && ticket.amount === 0 ? { free: true } : {}),
  });
  for (const [i, guestRef] of guestRefs.entries()) {
    const guest = guests[i];
    if (!guest) continue;
    await pause(600);
    await sendTicketConfirmationEmail({
      name: guest.name,
      email: guest.email,
      eventTitle: ticket.eventTitle,
      quantity: 1,
      amount: 0,
      reference: guestRef,
      sentBy: ticket.name,
      ...entry, // guests share the buyer's ticket type
    });
  }
}
