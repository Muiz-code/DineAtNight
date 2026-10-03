/**
 * Server-only reads for the public pages (Firebase Admin SDK).
 *
 * Used by GET /api/vendors and by the server-rendered /vendors and /event
 * pages (ISR), so first-time visitors and search engines get real content in
 * the initial HTML instead of a loading state.
 */

import { adminDb } from "./firebase-admin";
import type { DanEvent, DanGalleryItem, DanVendor, PublicVendor } from "./firestore";

/** A Firestore timestamp as plain data (safe to pass from server to client components). */
export type PlainTimestamp = { seconds: number; nanoseconds: number };

/** DanEvent with its timestamps flattened for serialization. */
export type SerializedEvent = Omit<DanEvent, "date" | "createdAt"> & {
  date: PlainTimestamp | null;
  createdAt?: PlainTimestamp | null;
};

/** DanGalleryItem with its timestamp flattened for serialization. */
export type SerializedGalleryItem = Omit<DanGalleryItem, "createdAt" | "src"> & {
  src: string;
  createdAt: PlainTimestamp | null;
};

type TimestampLike = { seconds: number; nanoseconds: number; toMillis?: () => number };

const plain = (t: unknown): PlainTimestamp | null =>
  t && typeof (t as TimestampLike).seconds === "number"
    ? { seconds: (t as TimestampLike).seconds, nanoseconds: (t as TimestampLike).nanoseconds ?? 0 }
    : null;

const millis = (t: unknown) => (t as TimestampLike | undefined)?.toMillis?.() ?? 0;

/**
 * Approved vendors, public fields only — owner name, decline reasons and
 * review history never leave the server. Pinned first, then newest first.
 * (Sorted here rather than with orderBy, which would need a composite index.)
 */
export async function getPublicVendors(): Promise<PublicVendor[]> {
  const snap = await adminDb().collection("vendors").where("status", "==", "approved").get();
  const docs = [...snap.docs].sort(
    (a, b) =>
      Number(b.get("pinned") === true) - Number(a.get("pinned") === true) ||
      millis(b.get("submittedAt")) - millis(a.get("submittedAt")),
  );
  return docs.map((d) => {
    const v = d.data() as DanVendor;
    return {
      id: d.id,
      brandName: v.brandName,
      description: v.description ?? "",
      imageUrl: v.imageUrl ?? "",
      ...(v.imageUrls ? { imageUrls: v.imageUrls } : {}),
      ...(v.logoUrl ? { logoUrl: v.logoUrl } : {}),
      ...(v.categories ? { categories: v.categories } : {}),
      ...(v.category ? { category: v.category } : {}),
      ...(v.events ? { events: v.events } : {}),
      ...(v.instagram ? { instagram: v.instagram } : {}),
      // Business contact and menu are public by design so customers can reach vendors
      ...(v.email ? { email: v.email } : {}),
      ...(v.phone ? { phone: v.phone } : {}),
      ...(v.menu ? { menu: v.menu } : {}),
      ...(v.menuImages?.length ? { menuImages: v.menuImages } : {}),
      ...(v.productImages?.length ? { productImages: v.productImages } : {}),
      ...(v.pinned ? { pinned: true } : {}),
    };
  });
}

function serializeEvent(id: string, data: Record<string, unknown>): SerializedEvent {
  return {
    ...(data as Omit<DanEvent, "date" | "createdAt">),
    id,
    date: plain(data.date),
    createdAt: plain(data.createdAt),
  };
}

/** Active (soonest first) and past (most recent first) events — same order as the client subscriptions. */
export async function getPublicEvents(): Promise<{ active: SerializedEvent[]; past: SerializedEvent[] }> {
  const db = adminDb();
  const [activeSnap, pastSnap] = await Promise.all([
    db.collection("events").where("status", "==", "active").get(),
    db.collection("events").where("isPast", "==", true).get(),
  ]);
  const bySeconds = (e: SerializedEvent) => e.date?.seconds ?? 0;
  const active = activeSnap.docs.map((d) => serializeEvent(d.id, d.data())).sort((a, b) => bySeconds(a) - bySeconds(b));
  const past = pastSnap.docs.map((d) => serializeEvent(d.id, d.data())).sort((a, b) => bySeconds(b) - bySeconds(a));
  return { active, past };
}

/** Gallery items, newest first (same order as the client subscription). */
export async function getPublicGallery(limit?: number): Promise<SerializedGalleryItem[]> {
  let q = adminDb().collection("gallery").orderBy("createdAt", "desc");
  if (limit) q = q.limit(limit);
  const snap = await q.get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...(data as Omit<DanGalleryItem, "createdAt" | "src">),
      id: d.id,
      src: typeof data.src === "string" ? data.src : (data.url ?? ""),
      createdAt: plain(data.createdAt),
    };
  });
}
