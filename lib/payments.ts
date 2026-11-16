/**
 * Server-only payment data layer (Firebase Admin SDK).
 * Used by /api/paystack/* routes — never import from client components.
 *
 * Every price is read from Firestore here; nothing the browser sends is
 * trusted for amounts. Paid-marking compares the amount Paystack actually
 * charged with the amount stored at checkout.
 */

import { ticketAvailability, RESERVATION_MS } from "./ticketInventory";
import { MAX_TICKET_QUANTITY } from "./constants";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import type { DanEvent, DanMerchOrder, DanProduct, DanTicket } from "./firestore";

/** Paystack references are alphanumeric with optional `-`, `_`, `.`. */
export function isValidReference(ref: unknown): ref is string {
  return typeof ref === "string" && /^[A-Za-z0-9._-]{1,100}$/.test(ref);
}

/** Calls Paystack's verify endpoint. Returns the transaction data on success, null otherwise. */
export async function fetchPaystackTransaction(
  reference: string,
): Promise<{ status: string; amount: number; metadata?: Record<string, unknown>; customer?: { email?: string } } | null> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("PAYSTACK_SECRET_KEY is not set");
  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" },
  );
  const body = await res.json();
  if (!body?.status || !body.data) return null;
  return body.data;
}

/* ═══════════════════════════════════════════════
   Tickets
═══════════════════════════════════════════════ */

export type TicketQuote = {
  eventTitle: string;
  ticketType?: string;
  unitPrice: number; // Naira
  minAge?: number | null;
  maxAge?: number | null;
};

/**
 * Validates a ticket purchase against the event in Firestore and returns the
 * server-side price. Throws an Error with a user-safe message on failure.
 */
function validateQuote(event: DanEvent, quantity: number, ticketType?: string): TicketQuote {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_TICKET_QUANTITY) throw new Error("Invalid ticket quantity.");
  if (event.status !== "active" || event.isPast) throw new Error("Tickets for this event are not on sale.");
  const tier = event.ticketTypes?.length ? event.ticketTypes.find(t => t.name === ticketType) : undefined;
  if (event.ticketTypes?.length && !tier) throw new Error("Please choose a valid ticket type.");
  const unitPrice = tier?.price ?? event.ticketPrice;
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error("This event has no valid ticket price.");
  return { eventTitle: event.title, ticketType: tier?.name, unitPrice, minAge: event.minAge, maxAge: event.maxAge };
}
function availableFor(event: DanEvent, tickets: DanTicket[], ticketType?: string, excludeReference?: string) {
  const inventory = ticketAvailability(event, tickets, Date.now(), excludeReference);
  return inventory.tiers.find(t => t.name === ticketType)?.available ?? inventory.available ?? Infinity;
}
function assertAvailable(available: number, quantity: number) {
  if (quantity > available) throw new Error(available <= 0 ? "This ticket type is sold out." : "Only " + available + " ticket" + (available === 1 ? "" : "s") + " left.");
}
export async function getEventTicketAvailability(eventId: string) {
  const db = adminDb();
  const event = await db.collection("events").doc(eventId).get();
  if (!event.exists) throw new Error("Event not found.");
  const tickets = await db.collection("tickets").where("eventId", "==", eventId).get();
  return ticketAvailability(event.data() as DanEvent, tickets.docs.map(d => d.data() as DanTicket));
}
export async function quoteTicket(eventId: string, quantity: number, ticketType?: string): Promise<TicketQuote> {
  const db = adminDb();
  const snap = await db.collection("events").doc(eventId).get();
  if (!snap.exists) throw new Error("Event not found.");
  const event = snap.data() as DanEvent;
  const quote = validateQuote(event, quantity, ticketType);
  const tickets = await db.collection("tickets").where("eventId", "==", eventId).get();
  assertAvailable(availableFor(event, tickets.docs.map(d => d.data() as DanTicket), quote.ticketType), quantity);
  return quote;
}
/** Lock the event and reserve inventory before returning a hosted checkout URL. */
export async function createPendingTicket(data: Omit<DanTicket, "id" | "purchasedAt" | "confirmedAt" | "status">): Promise<void> {
  const db = adminDb();
  await db.runTransaction(async tx => {
    const eventRef = db.collection("events").doc(data.eventId);
    const eventSnap = await tx.get(eventRef);
    if (!eventSnap.exists) throw new Error("Event not found.");
    const event = eventSnap.data() as DanEvent;
    const quote = validateQuote(event, data.quantity, data.ticketType);
    if (Math.round(quote.unitPrice * data.quantity * 100) !== data.amount) throw new Error("Ticket price changed. Please try again.");
    const tickets = await tx.get(db.collection("tickets").where("eventId", "==", data.eventId));
    assertAvailable(availableFor(event, tickets.docs.map(d => d.data() as DanTicket), data.ticketType), data.quantity);
    tx.create(db.collection("tickets").doc(data.reference), { ...data, status: "pending",
      reservationExpiresAt: Date.now() + RESERVATION_MS, purchasedAt: FieldValue.serverTimestamp(), confirmedAt: null });
    tx.update(eventRef, { inventoryRevision: FieldValue.increment(1) });
  });
}

/**
 * Validates the "send tickets to different emails" guest list from checkout:
 * one { name, email } per ticket after the buyer's own (quantity − 1 entries).
 * Returns the clean list, or a user-safe error message.
 */
export function parseGuests(input: unknown, quantity: number): { name: string; email: string }[] | string {
  if (!Array.isArray(input) || input.length !== quantity - 1) {
    return "Add a name and email for each extra ticket.";
  }
  const guests: { name: string; email: string }[] = [];
  for (const [i, g] of input.entries()) {
    const name = typeof g?.name === "string" ? g.name.trim().slice(0, 100) : "";
    const email = typeof g?.email === "string" ? g.email.trim().toLowerCase() : "";
    if (name.length < 2) return `Add a name for ticket ${i + 2}.`;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
      return `Add a valid email for ticket ${i + 2}.`;
    }
    guests.push({ name, email });
  }
  return guests;
}

/** Reference of guest ticket n (2, 3, …) split from an order. */
export const guestReference = (orderReference: string, n: number) => `${orderReference}-${n}`;

/**
 * Idempotently marks a ticket paid and increments the event's soldTickets.
 * Uses the quantity/eventId stored at checkout, not Paystack metadata.
 * Returns true only for the call that actually flipped the ticket to paid.
 *
 * If the buyer chose "send tickets to different emails", the order is split in
 * the same transaction: the buyer keeps a 1× ticket (with the payment) and each
 * guest gets their own paid 1× ticket (₦0, linked by parentReference) with its
 * own QR code. Being one transaction, the split happens exactly once.
 */
export async function markTicketPaid(reference: string, paidAmountKobo: number): Promise<boolean> {
  const db = adminDb();
  const ticketRef = db.collection("tickets").doc(reference);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ticketRef);
    if (!snap.exists) throw new Error(`Ticket not found: ${reference}`);
    const ticket = snap.data() as DanTicket;
    if (ticket.status === "paid" || ticket.status === "confirmed" || ticket.paymentReview) return false;
    if (paidAmountKobo < ticket.amount) {
      throw new Error(`Amount mismatch for ${reference}: paid ${paidAmountKobo}, expected ${ticket.amount}`);
    }
    const eventRef = db.collection("events").doc(ticket.eventId);
    const eventSnap = await tx.get(eventRef);
    if (!eventSnap.exists) throw new Error("Event not found.");
    const event = eventSnap.data() as DanEvent;
    const tickets = await tx.get(db.collection("tickets").where("eventId", "==", ticket.eventId));
    const inventory = tickets.docs.map(d => d.data() as DanTicket);
    const reserved = (ticket.reservationExpiresAt ?? 0) > Date.now();
    const tierExists = !event.ticketTypes?.length || event.ticketTypes.some(t => t.name === ticket.ticketType);
    if (!reserved && (!tierExists || ticket.quantity > availableFor(event, inventory, ticket.ticketType, reference))) {
      tx.update(ticketRef, { paymentReview: true, paymentReviewReason: "Payment received after reservation expiry; allocation unavailable. Review and refund in Paystack.", paidAt: FieldValue.serverTimestamp(), reservationExpiresAt: 0 });
      tx.update(eventRef, { inventoryRevision: FieldValue.increment(1) });
      return false;
    }
    const guests = ticket.guests ?? [];
    const guestRefs = guests.map((_, i) => guestReference(reference, i + 2));
    guests.forEach((g, i) => {
      tx.create(db.collection("tickets").doc(guestRefs[i]), {
        eventId: ticket.eventId,
        eventTitle: ticket.eventTitle,
        name: g.name,
        email: g.email,
        phone: "",
        quantity: 1,
        ...(ticket.ticketType ? { ticketType: ticket.ticketType } : {}),
        amount: 0, // paid on the buyer's ticket — keeps revenue totals right
        reference: guestRefs[i],
        status: "paid",
        parentReference: reference,
        purchasedBy: ticket.name,
        purchasedAt: ticket.purchasedAt ?? FieldValue.serverTimestamp(),
        paidAt: FieldValue.serverTimestamp(),
        confirmedAt: null,
      });
    });
    tx.update(ticketRef, {
      status: "paid",
      paidAt: FieldValue.serverTimestamp(),
      reservationExpiresAt: 0,
      ...(guests.length ? { quantity: 1, orderQuantity: ticket.quantity, guestReferences: guestRefs } : {}),
    });
    tx.update(db.collection("events").doc(ticket.eventId), {
      soldTickets: Math.max(event.soldTickets ?? 0, inventory.filter(t => t.status === "paid" || t.status === "confirmed").reduce((n,t) => n+t.quantity,0)) + ticket.quantity,
      inventoryRevision: FieldValue.increment(1),
    });
    return true;
  });
}

export async function getTicket(reference: string): Promise<DanTicket | null> {
  const snap = await adminDb().collection("tickets").doc(reference).get();
  return snap.exists ? (snap.data() as DanTicket) : null;
}

/* ═══════════════════════════════════════════════
   Merch
═══════════════════════════════════════════════ */

export type CartLine = { productId: string; qty: number };
export type PricedLine = DanMerchOrder["items"][number];

export const MAX_ITEM_QTY = 50;

/**
 * Validates a cart against Firestore and returns priced lines built from the
 * product documents (name and price never come from the client).
 * Throws an Error with a user-safe message on failure.
 */
export async function priceCart(lines: unknown): Promise<{ items: PricedLine[]; total: number }> {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error("Your cart is empty.");

  // Merge duplicate product lines and validate quantities
  const qtyById = new Map<string, number>();
  for (const line of lines as Partial<CartLine>[]) {
    const id = line?.productId;
    const qty = Number(line?.qty);
    if (typeof id !== "string" || !id || id.includes("/")) throw new Error("Invalid product in cart.");
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_ITEM_QTY) throw new Error("Invalid quantity in cart.");
    qtyById.set(id, (qtyById.get(id) ?? 0) + qty);
  }

  const db = adminDb();
  const ids = [...qtyById.keys()];
  const snaps = await db.getAll(...ids.map((id) => db.collection("products").doc(id)));

  const items: PricedLine[] = [];
  for (const snap of snaps) {
    if (!snap.exists) throw new Error("One or more products were not found.");
    const prod = snap.data() as DanProduct;
    const name = prod.name ?? "A product";
    const qty = qtyById.get(snap.id)!;
    if (prod.active === false) throw new Error(`"${name}" is no longer available.`);
    if (!Number.isFinite(prod.price) || prod.price <= 0) throw new Error(`"${name}" has no valid price.`);
    if (prod.stock !== -1) {
      const available = Math.max(0, prod.stock - (prod.soldCount ?? 0));
      if (available <= 0) throw new Error(`"${name}" is sold out.`);
      if (qty > available) throw new Error(`Only ${available} unit${available === 1 ? "" : "s"} of "${name}" are available.`);
    }
    items.push({ productId: snap.id, productName: name, price: prod.price, qty });
  }

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  return { items, total };
}

export async function createMerchOrder(data: Omit<DanMerchOrder, "id" | "createdAt">): Promise<void> {
  await adminDb().collection("merch_orders").doc(data.reference).create({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Idempotently marks a merch order paid and increments soldCount per product.
 * Returns true only for the call that actually flipped the order to paid.
 */
export async function markMerchOrderPaid(reference: string, paidAmountKobo: number): Promise<boolean> {
  const db = adminDb();
  const orderRef = db.collection("merch_orders").doc(reference);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) throw new Error(`Merch order not found: ${reference}`);
    const order = snap.data() as DanMerchOrder;
    if (order.status === "paid") return false;
    if (paidAmountKobo < Math.round(order.total * 100)) {
      throw new Error(`Amount mismatch for ${reference}: paid ${paidAmountKobo}, expected ${Math.round(order.total * 100)}`);
    }
    tx.update(orderRef, { status: "paid", paidAt: FieldValue.serverTimestamp() });
    for (const item of order.items ?? []) {
      tx.update(db.collection("products").doc(item.productId), {
        soldCount: FieldValue.increment(item.qty),
      });
    }
    return true;
  });
}

export async function getMerchOrder(reference: string): Promise<DanMerchOrder | null> {
  const snap = await adminDb().collection("merch_orders").doc(reference).get();
  return snap.exists ? (snap.data() as DanMerchOrder) : null;
}
