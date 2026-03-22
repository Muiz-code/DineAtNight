/**
 * Firestore-based rate limiter — works across all serverless instances.
 *
 * Each check writes an atomic increment to a `rate_limits` Firestore document
 * keyed by `${key}:${windowStart}`. If the count exceeds the limit, the
 * request is rejected. Documents expire naturally (they are small and cheap).
 *
 * Fail-open: if Firestore is unreachable the request is allowed through so
 * that a database hiccup never blocks legitimate users.
 */

import { doc, getDoc, setDoc, increment, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Returns true (request allowed) or false (limit exceeded).
 * @param key      - Identifier, e.g. an IP address or email.
 * @param limit    - Max requests allowed in the window.
 * @param windowMs - Window size in milliseconds.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  try {
    const windowStart = Math.floor(Date.now() / windowMs);
    const docId = `${encodeURIComponent(key)}:${windowStart}`;
    const ref = doc(db, "rate_limits", docId);

    // Read current count first to avoid unnecessary writes on already-exceeded keys
    const snap = await getDoc(ref);
    const current = (snap.data()?.count as number) ?? 0;
    if (current >= limit) return false;

    // Atomically increment and record expiry
    await setDoc(
      ref,
      {
        count: increment(1),
        key,
        windowStart,
        expiresAt: Timestamp.fromMillis(Date.now() + windowMs * 2),
      },
      { merge: true },
    );

    // Re-check after increment (handles concurrent requests at the boundary)
    const after = await getDoc(ref);
    const finalCount = (after.data()?.count as number) ?? 1;
    return finalCount <= limit;
  } catch {
    // Fail open — a Firestore error should never block a legitimate request
    return true;
  }
}
