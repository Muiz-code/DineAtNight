/**
 * Ticket coupon codes — the rules, as pure functions (safe on client and server).
 *
 * A campaign (e.g. "Naira card – 40 free tickets") has a percentage off and
 * either many unique single-use codes or one shared code with a use limit.
 * A code takes its percentage off ONE ticket in an order: 3 × ₦5,000 with a
 * 100% code is ₦10,000 and still issues 3 tickets. When the order comes to ₦0
 * Paystack is skipped and the ticket is issued straight away.
 *
 * Server side (lib/payments.ts) every check and redemption happens inside the
 * same Firestore transaction that reserves or issues the ticket:
 *  - checkout holds the code for the 15-minute ticket reservation (`holds`),
 *  - payment (or a free claim) redeems it (`redeemed` + `redemptions`),
 *  - a payment that arrives after the hold lapsed AND the code was used by
 *    someone else meanwhile goes to payment review instead of issuing.
 *
 * Firestore (server-only — Admin SDK; rules deny all client access):
 *   coupon_campaigns/{id}
 *   coupon_codes/{KEY}   KEY = the code in upper case, letters and digits only
 */

export type CouponKind = "unique" | "shared";

export interface CouponCampaign {
  id?: string;
  name: string;
  eventId: string;
  eventTitle: string;
  percentOff: number; // whole number 1–100; fixed once created
  kind: CouponKind;
  codeCount: number; // number of code documents (1 for "shared")
  maxUsesTotal: number; // unique: codeCount; shared: the use limit
  tiers: string[]; // ticket types it works for; empty = every type
  expiresAt: number | null; // ms; null = never expires
  active: boolean;
  redeemedCount: number;
  createdAt: number; // ms
  createdBy: string;
}

export interface CouponRedemption {
  reference: string;
  name: string;
  email: string;
  at: number; // ms
  free: boolean; // ₦0 order — no Paystack payment
}

export interface CouponCodeDoc {
  code: string; // as shown and handed out, e.g. "DAN-7KQ2X9"
  campaignId: string;
  number: number; // 1…codeCount — "code #17 of 40"
  maxUses: number; // 1 for unique codes
  redeemed: number;
  holds: Record<string, number>; // ticket reference → hold expiry (ms)
  redemptions: CouponRedemption[];
}

/** What a ticket records about the code used on it (also when 100% off). */
export interface TicketCoupon {
  campaignId: string;
  campaignName: string;
  code: string;
  codeNumber: number;
  codeCount: number;
  percentOff: number;
  discountKobo: number;
  fullAmountKobo: number; // order total before the discount
}

/** Lookup key for a typed code: case, spaces and dashes don't matter. */
export function couponKey(input: unknown): string {
  return typeof input === "string" ? input.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
}

export function isCouponKey(key: string): boolean {
  return /^[A-Z0-9]{4,32}$/.test(key);
}

/** Amount taken off: `percentOff` of ONE ticket, in kobo. */
export function couponDiscountKobo(unitPriceNaira: number, percentOff: number): number {
  const pct = Math.min(100, Math.max(0, percentOff));
  return Math.round((Math.round(unitPriceNaira * 100) * pct) / 100);
}

/** What the order costs in kobo, with an optional code taking `percentOff` off one ticket. */
export function ticketOrderAmountKobo(unitPriceNaira: number, quantity: number, percentOff = 0): number {
  const full = Math.round(unitPriceNaira * quantity * 100);
  return full - (percentOff > 0 ? couponDiscountKobo(unitPriceNaira, percentOff) : 0);
}

/** Holds still within their reservation, optionally ignoring one ticket's own hold. */
export function liveHolds(holds: Record<string, number> | undefined, now: number, excludeReference?: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [ref, expires] of Object.entries(holds ?? {})) {
    if (ref !== excludeReference && expires > now) out[ref] = expires;
  }
  return out;
}

/** Uses left on a code right now (paid redemptions and live holds both count). */
export function usesLeft(code: Pick<CouponCodeDoc, "maxUses" | "redeemed" | "holds">, now: number, excludeReference?: string): number {
  return Math.max(0, code.maxUses - (code.redeemed ?? 0) - Object.keys(liveHolds(code.holds, now, excludeReference)).length);
}

/**
 * Why a code can't be used for this ticket right now, in plain language — or
 * null when it can. Checked at checkout; a payment that already went through
 * is only re-checked for uses left (see markTicketPaid).
 */
export function couponProblem(
  campaign: CouponCampaign | null | undefined,
  code: CouponCodeDoc | null | undefined,
  ctx: { eventId: string; ticketType?: string; now: number; excludeReference?: string },
): string | null {
  if (!campaign || !code) return "That code isn't valid. Check it and try again.";
  if (!campaign.active) return "This code is no longer active.";
  if (campaign.expiresAt != null && ctx.now > campaign.expiresAt) return "This code has expired.";
  if (campaign.eventId !== ctx.eventId) return "This code isn't valid for this event.";
  if (campaign.tiers.length && ctx.ticketType !== undefined && !campaign.tiers.includes(ctx.ticketType)) {
    return `This code only works for ${campaign.tiers.join(", ")} tickets.`;
  }
  if (usesLeft(code, ctx.now, ctx.excludeReference) <= 0) {
    return code.maxUses > 1 ? "This code has reached its limit." : "This code has already been used.";
  }
  return null;
}

/** End of a calendar day ("2026-12-16") in Lagos time, as ms — coupon "valid until" dates. */
export function endOfLagosDay(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const ms = Date.parse(`${date}T23:59:59.999+01:00`);
  return Number.isFinite(ms) ? ms : null;
}
