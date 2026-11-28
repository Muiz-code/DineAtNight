import type { DanEvent, DanTicket } from "./firestore";
export const RESERVATION_MS = 15 * 60 * 1000;
export const isIssuedTicket = (t: DanTicket) => t.status === "paid" || t.status === "confirmed";

/** Count admissions, not QR documents. Split guest tickets each carry quantity 1. */
export function summarizeTickets(tickets: DanTicket[], now = Date.now(), excludeReference?: string) {
  const tiers: Record<string, { sold: number; reserved: number }> = Object.create(null);
  let sold = 0, reserved = 0;
  for (const t of tickets) {
    if (t.reference === excludeReference) continue;
    const issued = isIssuedTicket(t);
    const held = t.status === "pending" && !t.paymentReview && (t.reservationExpiresAt ?? 0) > now;
    if (!issued && !held) continue;
    const tier = tiers[t.ticketType ?? ""] ??= { sold: 0, reserved: 0 };
    if (issued) { sold += t.quantity; tier.sold += t.quantity; }
    if (held) { reserved += t.quantity; tier.reserved += t.quantity; }
  }
  return { sold, reserved, tiers };
}
export function ticketAvailability(event: DanEvent, tickets: DanTicket[], now = Date.now(), excludeReference?: string) {
  const counts = summarizeTickets(tickets, now, excludeReference);
  const sold = Math.max(counts.sold, event.soldTickets ?? 0);
  const available = event.totalTickets > 0 ? Math.max(0, event.totalTickets - sold - counts.reserved) : null;
  return { sold, reserved: counts.reserved, available,
    tiers: (event.ticketTypes ?? []).map(t => {
      const c = counts.tiers[t.name] ?? { sold: 0, reserved: 0 };
      return { name: t.name, limit: t.limit ?? null, ...c,
        available: t.limit == null ? available : Math.min(available ?? Infinity, Math.max(0, t.limit - c.sold - c.reserved)),
        overAllocation: t.limit == null ? 0 : Math.max(0, c.sold - t.limit) };
    }) };
}
export type TicketAvailability = ReturnType<typeof ticketAvailability>;
/**
 * How a ticket was bought, for the admin filters:
 *  - "single": one person, one QR code
 *  - "group":  one QR code that admits several people (bought together, kept together)
 *  - "guests": part of an order sent to different emails — the buyer's QR or a guest's
 */
export type TicketKind = "single" | "group" | "guests";
export const TICKET_KINDS: { key: TicketKind; label: string; hint: string }[] = [
  { key: "single", label: "Single", hint: "1 person, 1 QR code" },
  { key: "group", label: "Group QR", hint: "1 QR code admits several people" },
  { key: "guests", label: "Sent to guests", hint: "Separate QR code for each person" },
];
export function ticketKind(t: Pick<DanTicket, "quantity" | "parentReference" | "guestReferences">): TicketKind {
  if (t.parentReference || t.guestReferences?.length) return "guests";
  return t.quantity > 1 ? "group" : "single";
}
/** The same, for an order from groupTicketOrders. */
export function orderKind(order: { holders: DanTicket[]; quantity: number }): TicketKind {
  if (order.holders.length > 1 || order.holders.some((t) => t.parentReference || t.guestReferences?.length)) return "guests";
  return order.quantity > 1 ? "group" : "single";
}

export function groupTicketOrders(tickets: DanTicket[]) {
  const groups = new Map<string, DanTicket[]>();
  for (const t of tickets.filter(isIssuedTicket)) {
    const ref = t.parentReference ?? t.reference;
    const holders = groups.get(ref) ?? [];
    holders.push(t); groups.set(ref, holders);
  }
  return [...groups].map(([reference, holders]) => {
    const buyer = holders.find(t => !t.parentReference);
    return { reference, buyer, holders: holders.sort((a,b) => Number(!!a.parentReference)-Number(!!b.parentReference)),
      quantity: holders.reduce((n,t) => n+t.quantity,0),
      checkedIn: holders.filter(t => t.status === "confirmed").reduce((n,t) => n+t.quantity,0),
      amount: holders.reduce((n,t) => n+t.amount,0), purchasedAt: buyer?.purchasedAt };
  });
}
