/**
 * Event age limits — set per event in admin (minAge / maxAge, both optional).
 * Checkout shows the limit, requires the buyer to confirm it, and only offers
 * age ranges inside it; /api/paystack/initialize enforces the same rules.
 * Pure module: shared by client and server.
 */

import { TICKET_AGE_RANGES, type TicketAgeRange } from "./constants";

export type AgeLimit = { minAge?: number | null; maxAge?: number | null };

export const hasAgeLimit = (l: AgeLimit) => !!(l.minAge || l.maxAge);

/** "18+", "18–35", "up to 35", or null when the event has no limit. */
export function ageLimitLabel({ minAge, maxAge }: AgeLimit): string | null {
  if (minAge && maxAge) return `${minAge}–${maxAge}`;
  if (minAge) return `${minAge}+`;
  if (maxAge) return `up to ${maxAge}`;
  return null;
}

/** The tick-box text buyers must confirm. */
export function ageConfirmText({ minAge, maxAge }: AgeLimit): string {
  if (minAge && maxAge) return `I confirm every ticket holder is aged ${minAge}–${maxAge}`;
  if (minAge) return `I confirm every ticket holder is ${minAge} or older`;
  return `I confirm every ticket holder is ${maxAge} or younger`;
}

/** "18–24" → [18, 24]; "55+" → [55, ∞]. */
function bounds(range: TicketAgeRange): [number, number] {
  const [lo, hi] = range.replace("+", "").split("–").map(Number);
  return [lo, range.endsWith("+") ? Infinity : hi];
}

/** The checkout age ranges that overlap the event's limit (all of them if none). */
export function allowedAgeRanges(l: AgeLimit): TicketAgeRange[] {
  return TICKET_AGE_RANGES.filter((range) => {
    const [lo, hi] = bounds(range);
    return hi >= (l.minAge || 0) && lo <= (l.maxAge || Infinity);
  });
}

/** Validates admin input; returns an error message or the clean limit. */
export function parseAgeLimit(minInput: string, maxInput: string): AgeLimit | string {
  const parse = (v: string) => (v.trim() === "" ? null : Number(v));
  const minAge = parse(minInput);
  const maxAge = parse(maxInput);
  for (const age of [minAge, maxAge]) {
    if (age !== null && (!Number.isInteger(age) || age < 1 || age > 120)) {
      return "Ages must be whole numbers between 1 and 120.";
    }
  }
  if (minAge !== null && maxAge !== null && minAge > maxAge) {
    return "Minimum age can't be higher than maximum age.";
  }
  return { minAge, maxAge };
}
