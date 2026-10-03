/**
 * Firestore-based rate limiter — works across all serverless instances.
 *
 * Each check atomically increments a `rate_limits` document keyed by
 * `${key}:${windowStart}` via the Admin SDK (the collection is closed to
 * clients by security rules, so counters cannot be reset from a browser).
 *
 * Fail-open: if Firestore is unreachable the request is allowed through so
 * that a database hiccup never blocks legitimate users.
 */

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { NextRequest } from "next/server";
import { adminDb } from "./firebase-admin";

/** Client IP as reported by Vercel's edge (first x-forwarded-for hop). */
export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

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
    const db = adminDb();
    const windowStart = Math.floor(Date.now() / windowMs);
    const ref = db.collection("rate_limits").doc(`${encodeURIComponent(key)}:${windowStart}`);

    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = (snap.data()?.count as number | undefined) ?? 0;
      if (current >= limit) return false;
      tx.set(
        ref,
        {
          count: FieldValue.increment(1),
          key,
          windowStart,
          expiresAt: Timestamp.fromMillis(Date.now() + windowMs * 2),
        },
        { merge: true },
      );
      return true;
    });
  } catch (err) {
    // Fail open — a Firestore error should never block a legitimate request
    console.error("[rateLimit] check failed, allowing request:", err);
    return true;
  }
}
