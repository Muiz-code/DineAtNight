/**
 * Named constants for rate limits, TTLs, retention periods, and
 * quantity bounds — centralised so changes are made in one place.
 *
 * IMPORTANT: this file is imported by both server (API routes) and
 * client (cache.ts) code. Keep it free of any runtime dependencies.
 */

// ── Cache ────────────────────────────────────────────────────────────────────
/** localStorage cache TTL: 10 minutes. */
export const CACHE_TTL_MS = 10 * 60 * 1_000;

/**
 * Bump this whenever the shape of a cached Firestore type changes.
 * Stale entries without a matching version are treated as expired.
 */
export const CACHE_VERSION = 2;

// ── Rate limiting ─────────────────────────────────────────────────────────────
/** Standard sliding-window duration for all public-facing API routes. */
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1_000; // 1 hour

/** Max newsletter subscription attempts per IP per window. */
export const SUBSCRIBE_RATE_LIMIT = 10;

/** Max contact-form submissions per IP per window. */
export const CONTACT_RATE_LIMIT = 5;

/** Max vendor-application submissions per IP per window. */
export const VENDOR_APPLY_RATE_LIMIT = 5;

/** Max testimonial-notification calls per IP per window. */
export const TESTIMONIAL_RATE_LIMIT = 5;

// ── Tickets ───────────────────────────────────────────────────────────────────
/** Minimum number of tickets a customer can purchase in one order. */
export const MIN_TICKET_QUANTITY = 1;

/** Maximum number of tickets a customer can purchase in one order. */
export const MAX_TICKET_QUANTITY = 20;

// ── Vendor approval email ─────────────────────────────────────────────────────
/**
 * Details quoted in the vendor approval email. The event title, date and venue
 * are taken from the vendor's upcoming event when it exists in admin — these
 * are only the fallbacks used before that event has been created.
 */
export const VENDOR_APPROVAL_DEFAULTS = {
  eventTitle: "Dine At Night 2026",
  eventDate: "2026-12-17", // YYYY-MM-DD
  venue: "Federal Palace, Victoria Island, Lagos",
  stallFee: "₦180,000",
  acceptanceDeadline: "Friday, 6th November 2026",
  paymentDeadline: "Sunday, 15th November 2026",
};

// ── Admin logs ────────────────────────────────────────────────────────────────
/** Admin-log entries older than this are eligible for manual deletion. */
export const ADMIN_LOG_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000; // 30 days
