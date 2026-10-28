/**
 * Server-only payment data layer (Firebase Admin SDK).
 * Used by /api/paystack/* routes — never import from client components.
 *
 * Every price is read from Firestore here; nothing the browser sends is
 * trusted for amounts. Paid-marking compares the amount Paystack actually
 * charged with the amount stored at checkout.
 */

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
};

/**
 * Validates a ticket purchase against the event in Firestore and returns the
 * server-side price. Throws an Error with a user-safe message on failure.
 */
export async function quoteTicket(eventId: string, quantity: number, ticketType?: string): Promise<TicketQuote> {
  const snap = await adminDb().collection("events").doc(eventId).get();
  if (!snap.exists) throw new Error("Event not found.");
  const event = snap.data() as DanEvent;

  if (event.status !== "active" || event.isPast) throw new Error("Tickets for this event are not on sale.");

  let unitPrice = event.ticketPrice;
  let tierName: string | undefined;
  let tierLimit: number | undefined;
  if (event.ticketTypes?.length) {
    const tier = event.ticketTypes.find((t) => t.name === ticketType);
    if (!tier) throw new Error("Please choose a valid ticket type.");
    unitPrice = tier.price;
    tierName = tier.name;
    tierLimit = tier.limit;
  }
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error("This event has no valid ticket price.");

  // Overall capacity (when set) and the tier's limit are enforced independently
  let cap = Infinity;
  if (event.totalTickets > 0) cap = event.totalTickets - (event.soldTickets ?? 0);
  if (tierLimit != null) cap = Math.min(cap, tierLimit);
  if (quantity > cap) {
    throw new Error(cap <= 0 ? "This event is sold out." : `Only ${cap} ticket${cap === 1 ? "" : "s"} left.`);
  }

  return { eventTitle: event.title, ticketType: tierName, unitPrice };
}

export async function createPendingTicket(
  data: Omit<DanTicket, "id" | "purchasedAt" | "confirmedAt" | "status">,
): Promise<void> {
  await adminDb().collection("tickets").doc(data.reference).create({
    ...data,
    status: "pending",
    purchasedAt: FieldValue.serverTimestamp(),
    confirmedAt: null,
  });
}

/**
 * Idempotently marks a ticket paid and increments the event's soldTickets.
 * Uses the quantity/eventId stored at checkout, not Paystack metadata.
 * Returns true only for the call that actually flipped the ticket to paid.
 */
export async function markTicketPaid(reference: string, paidAmountKobo: number): Promise<boolean> {
  const db = adminDb();
  const ticketRef = db.collection("tickets").doc(reference);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ticketRef);
    if (!snap.exists) throw new Error(`Ticket not found: ${reference}`);
    const ticket = snap.data() as DanTicket;
    if (ticket.status === "paid" || ticket.status === "confirmed") return false;
    if (paidAmountKobo < ticket.amount) {
      throw new Error(`Amount mismatch for ${reference}: paid ${paidAmountKobo}, expected ${ticket.amount}`);
    }
    tx.update(ticketRef, { status: "paid", paidAt: FieldValue.serverTimestamp() });
    tx.update(db.collection("events").doc(ticket.eventId), {
      soldTickets: FieldValue.increment(ticket.quantity),
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
