/**
 * Everything that happens once a ticket order is paid (server-only).
 *
 * Called by whichever of the Paystack webhook or /api/paystack/verify marks
 * the order paid first (markTicketPaid returns true exactly once), so the
 * emails go out once whichever path wins. Run it inside next/server `after()`.
 */

import { pushTicketToCheckin } from "./checkin";
import { getTicket } from "./payments";
import { sendTicketConfirmationEmail } from "./resend";

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function deliverPaidTicket(reference: string): Promise<void> {
  const ticket = await getTicket(reference);
  if (!ticket) return;
  const guestRefs = ticket.guestReferences ?? [];
  const guests = ticket.guests ?? [];

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
    });
  }
}
