/**
 * Ticket-tier entry windows ("8–12 slot"): when a ticket may be admitted at the gate.
 * Shared by the admin event editor, checkout, the ticket page/email and the gate
 * scanner (lib/scanners.ts). Pure — safe on client and server.
 *
 * Times are "HH:MM" (24h) in Lagos time, on the event's date. An end time at or
 * before the start time means the slot runs past midnight (20:00–00:00 ends at
 * midnight the next day). Slots that *start* after midnight aren't supported —
 * use the event date of the night they start.
 */

/** Lagos is WAT, UTC+1 all year (no daylight saving). The server runs in UTC. */
const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const MAX_ENTRY_GRACE_MINUTES = 240;

export type EntryTimes = { entryStart?: string; entryEnd?: string };
export type EntryWindow = { startMs: number; endMs: number; opensMs: number };
export type EntryCheck = "ok" | "early" | "late";

export function isEntryTime(value: unknown): value is string {
  return typeof value === "string" && TIME_RE.test(value);
}

/** True when a tier has both entry times set (and valid). */
export function hasEntryWindow(tier: EntryTimes | null | undefined): tier is Required<EntryTimes> {
  return !!tier && isEntryTime(tier.entryStart) && isEntryTime(tier.entryEnd);
}

const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Milliseconds of a Firestore Timestamp (admin or client SDK) or a { seconds } object. */
export function timestampMillis(t: unknown): number | null {
  if (!t || typeof t !== "object") return null;
  const ts = t as { toMillis?: () => number; seconds?: number; _seconds?: number };
  if (typeof ts.toMillis === "function") return ts.toMillis();
  const seconds = ts.seconds ?? ts._seconds;
  return typeof seconds === "number" ? seconds * 1000 : null;
}

/**
 * The exact admission window for a tier on the event's date, or null when the
 * tier has no entry times. `opensMs` is the start minus any early-arrival grace.
 */
export function entryWindow(eventDateMs: number, tier: EntryTimes, graceMinutes?: number | null): EntryWindow | null {
  if (!hasEntryWindow(tier) || !Number.isFinite(eventDateMs)) return null;
  // Midnight at the start of the event's day, in Lagos
  const lagosMidnight = Math.floor((eventDateMs + LAGOS_OFFSET_MS) / DAY_MS) * DAY_MS - LAGOS_OFFSET_MS;
  const startMs = lagosMidnight + minutesOf(tier.entryStart) * 60_000;
  let endMs = lagosMidnight + minutesOf(tier.entryEnd) * 60_000;
  if (endMs <= startMs) endMs += DAY_MS; // runs past midnight
  const g = Number(graceMinutes);
  const grace = Number.isFinite(g) ? Math.min(MAX_ENTRY_GRACE_MINUTES, Math.max(0, Math.floor(g))) : 0;
  return { startMs, endMs, opensMs: startMs - grace * 60_000 };
}

/** "early" before the window opens (grace included), "late" from the end time on. */
export function checkEntry(nowMs: number, window: EntryWindow): EntryCheck {
  if (nowMs < window.opensMs) return "early";
  if (nowMs >= window.endMs) return "late";
  return "ok";
}

/** "20:00" → "8:00 PM", "00:00" → "12:00 AM". Independent of the device's time zone. */
export function formatEntryTime(hhmm: string): string {
  const total = minutesOf(hhmm);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "8:00 PM – 12:00 AM", or null when the tier has no entry times. */
export function entryLabel(tier: EntryTimes | null | undefined): string | null {
  return hasEntryWindow(tier) ? `${formatEntryTime(tier.entryStart)} – ${formatEntryTime(tier.entryEnd)}` : null;
}

/** "Thu 17 Dec, 8:00 PM" for a window edge — always shown in Lagos time. */
export function formatLagosMoment(ms: number): string {
  return new Date(ms).toLocaleString("en-GB", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
