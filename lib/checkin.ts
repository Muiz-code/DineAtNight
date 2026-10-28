/**
 * Check-in system integration (server-only).
 *
 * Two ways for an external check-in system to receive paid tickets:
 *  - PUSH: every newly paid ticket is POSTed to CHECKIN_WEBHOOK_URL, signed
 *          with HMAC-SHA256 using CHECKIN_WEBHOOK_SECRET (header X-DAN-Signature).
 *  - PULL: GET /api/checkin/tickets with `Authorization: Bearer CHECKIN_API_KEY`.
 * Each is disabled until its env vars are set. Spec: docs/CHECKIN_INTEGRATION.md
 */

import crypto from "crypto";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import type { DanTicket } from "./firestore";

export type CheckinTicket = {
  reference: string;
  eventId: string;
  eventTitle: string;
  name: string;
  email: string;
  phone: string;
  quantity: number;
  ticketType: string | null;
  amountNaira: number;
  currency: "NGN";
  status: "paid" | "confirmed";
  checkedIn: boolean;
  purchasedAt: string | null;
  paidAt: string | null;
  checkedInAt: string | null;
};

const iso = (t: unknown): string | null =>
  t && typeof (t as Timestamp).toDate === "function" ? (t as Timestamp).toDate().toISOString() : null;

export function toCheckinTicket(reference: string, t: DanTicket & { paidAt?: unknown }): CheckinTicket {
  return {
    reference,
    eventId: t.eventId,
    eventTitle: t.eventTitle,
    name: t.name,
    email: t.email,
    phone: t.phone ?? "",
    quantity: t.quantity,
    ticketType: t.ticketType ?? null,
    amountNaira: t.amount / 100,
    currency: "NGN",
    status: t.status === "confirmed" ? "confirmed" : "paid",
    checkedIn: t.status === "confirmed",
    purchasedAt: iso(t.purchasedAt),
    paidAt: iso(t.paidAt),
    checkedInAt: iso(t.confirmedAt),
  };
}

/** Constant-time check of a bearer API key against CHECKIN_API_KEY. */
export function isValidCheckinKey(authHeader: string | null): boolean {
  const expected = process.env.CHECKIN_API_KEY;
  if (!expected || !authHeader?.startsWith("Bearer ")) return false;
  const given = Buffer.from(authHeader.slice("Bearer ".length).trim());
  const want = Buffer.from(expected);
  return given.length === want.length && crypto.timingSafeEqual(given, want);
}

/**
 * Sends a newly paid ticket to the check-in system (PUSH). No-op unless
 * CHECKIN_WEBHOOK_URL and CHECKIN_WEBHOOK_SECRET are set. One retry; the
 * outcome is stored on the ticket (checkinPushedAt / checkinPushError) so
 * failures are visible and the PULL endpoint can be used to back-fill.
 */
export async function pushTicketToCheckin(reference: string): Promise<void> {
  const url = process.env.CHECKIN_WEBHOOK_URL;
  const secret = process.env.CHECKIN_WEBHOOK_SECRET;
  if (!url || !secret) return;

  const ref = adminDb().collection("tickets").doc(reference);
  const snap = await ref.get();
  if (!snap.exists) return;
  const ticket = snap.data() as DanTicket;
  if (ticket.status !== "paid" && ticket.status !== "confirmed") return;

  const body = JSON.stringify({ event: "ticket.paid", ticket: toCheckinTicket(reference, ticket) });
  const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");

  let lastError = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-DAN-Event": "ticket.paid",
          "X-DAN-Delivery": reference,
          "X-DAN-Signature": `sha256=${signature}`,
        },
        body,
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        await ref.update({ checkinPushedAt: FieldValue.serverTimestamp(), checkinPushError: FieldValue.delete() });
        return;
      }
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  console.error(`[checkin] push failed for ${reference}: ${lastError}`);
  await ref.update({ checkinPushError: lastError.slice(0, 200) }).catch(() => {});
}
