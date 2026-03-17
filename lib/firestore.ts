import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  Timestamp,
  increment,
  serverTimestamp,
  arrayUnion,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";
import { clearCache } from "./cache";

/**
 * Cast a Firestore document snapshot to a typed model, injecting `id`.
 * All reads in this file go through this helper so a Zod schema can be
 * plugged in here in one place when runtime validation is needed.
 * TODO: replace the `as T` cast with Zod `.parse()` once schemas exist.
 */
function toDoc<T>(snap: DocumentSnapshot | QueryDocumentSnapshot): T {
  return { id: snap.id, ...snap.data() } as T;
}

/**
 * Returns a subscribe function that attaches an onSnapshot listener.
 * The optional `transform` sorts / filters results before handing them to the caller.
 */
function createSubscription<T>(
  col: string,
  constraints: QueryConstraint[],
  transform?: (items: T[]) => T[],
) {
  return (cb: (items: T[]) => void): (() => void) => {
    const q = query(collection(db, col), ...constraints);
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => toDoc<T>(d));
        cb(transform ? transform(items) : items);
      },
      () => cb([]),
    );
  };
}

/* ═══════════════════════════════════════════════
   Types
═══════════════════════════════════════════════ */
export interface DanSponsor {
  name: string;
  logoUrl: string;
}

export interface DanTicketType {
  name: string;    // e.g. "VIP", "VVIP", "General Admission"
  price: number;   // in Naira
  limit?: number;  // max tickets available for this tier (undefined = no separate cap)
}

export interface DanEvent {
  id?: string;
  title: string;
  edition: string;
  date: Timestamp;
  venue: string;
  description: string;
  isPast: boolean;
  ticketPrice: number;        // base / lowest price in Naira (kept for backward compat)
  ticketTypes?: DanTicketType[]; // optional multiple tiers — when present, overrides ticketPrice
  totalTickets: number;
  soldTickets: number;
  status: "draft" | "active" | "ended";
  imageUrl: string;
  highlights: string[];
  sponsors?: DanSponsor[];
  createdAt?: Timestamp;
}

export interface DanTicket {
  id?: string;
  eventId: string;
  eventTitle: string;
  name: string;
  email: string;
  phone: string;
  quantity: number;
  ticketType?: string;  // e.g. "VIP", "VVIP", "General Admission" — undefined = legacy single-price
  amount: number;       // in kobo (Paystack)
  reference: string;   // Paystack reference = Firestore document ID
  status: "pending" | "paid" | "confirmed";
  purchasedAt?: Timestamp;
  confirmedAt?: Timestamp | null;
}

/* ═══════════════════════════════════════════════
   Events
═══════════════════════════════════════════════ */
export async function getAllEvents(): Promise<DanEvent[]> {
  const snap = await getDocs(collection(db, "events"));
  const evs = snap.docs.map((d) => (toDoc<DanEvent>(d)));
  return evs.sort((a, b) => (b.date?.seconds ?? 0) - (a.date?.seconds ?? 0));
}

export async function getActiveEvents(): Promise<DanEvent[]> {
  const snap = await getDocs(
    query(collection(db, "events"), where("status", "==", "active"))
  );
  const evs = snap.docs.map((d) => (toDoc<DanEvent>(d)));
  return evs.sort((a, b) => (a.date?.seconds ?? 0) - (b.date?.seconds ?? 0));
}

export async function getPastEvents(): Promise<DanEvent[]> {
  const snap = await getDocs(
    query(collection(db, "events"), where("isPast", "==", true))
  );
  const evs = snap.docs.map((d) => (toDoc<DanEvent>(d)));
  return evs.sort((a, b) => (b.date?.seconds ?? 0) - (a.date?.seconds ?? 0));
}

/** Real-time: active events (public home + event pages). */
export const subscribeActiveEvents = createSubscription<DanEvent>(
  "events",
  [where("status", "==", "active")],
  (evs) => evs.sort((a, b) => (a.date?.seconds ?? 0) - (b.date?.seconds ?? 0)),
);

/** Real-time: past events (public event page). */
export const subscribePastEvents = createSubscription<DanEvent>(
  "events",
  [where("isPast", "==", true)],
  (evs) => evs.sort((a, b) => (b.date?.seconds ?? 0) - (a.date?.seconds ?? 0)),
);

export async function getEventById(id: string): Promise<DanEvent | null> {
  const snap = await getDoc(doc(db, "events", id));
  if (!snap.exists()) return null;
  return toDoc<DanEvent>(snap);
}

export async function createEvent(data: Omit<DanEvent, "id" | "createdAt" | "soldTickets">): Promise<string> {
  const ref = await addDoc(collection(db, "events"), {
    ...data,
    soldTickets: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEvent(id: string, data: Partial<DanEvent>): Promise<void> {
  await updateDoc(doc(db, "events", id), data);
  clearCache("dan_active_events");
  clearCache("dan_past_events");
}

export async function deleteEvent(id: string): Promise<void> {
  await deleteDoc(doc(db, "events", id));
  clearCache("dan_active_events");
  clearCache("dan_past_events");
}

/* ═══════════════════════════════════════════════
   Tickets
   NOTE: Document ID = Paystack reference.
   This means all ticket operations are GET/SET on
   a known doc ID — no collection queries needed
   for the payment flow, so no auth required.
═══════════════════════════════════════════════ */
export async function createPendingTicket(
  data: Omit<DanTicket, "id" | "purchasedAt" | "confirmedAt">
): Promise<string> {
  // Use Paystack reference as the Firestore doc ID
  await setDoc(doc(db, "tickets", data.reference), {
    ...data,
    status: "pending",
    purchasedAt: serverTimestamp(),
    confirmedAt: null,
  });
  return data.reference;
}

export async function getTicketByReference(reference: string): Promise<DanTicket | null> {
  const snap = await getDoc(doc(db, "tickets", reference));
  if (!snap.exists()) return null;
  return toDoc<DanTicket>(snap);
}

export async function markTicketPaid(
  reference: string,
  eventId: string,
  quantity: number
): Promise<void> {
  const ticketRef = doc(db, "tickets", reference);
  const eventRef = doc(db, "events", eventId);
  // Use a transaction so the idempotency check + both writes are atomic.
  // If the ticket is already paid/confirmed (webhook + verify both fire), only
  // the first writer increments soldTickets — the second is a no-op.
  await runTransaction(db, async (tx) => {
    const ticketSnap = await tx.get(ticketRef);
    if (!ticketSnap.exists()) throw new Error(`Ticket not found: ${reference}`);
    const status = ticketSnap.data().status as string;
    if (status === "paid" || status === "confirmed") return; // already processed — idempotent
    tx.update(ticketRef, { status: "paid" });
    tx.update(eventRef, { soldTickets: increment(quantity) });
  });
}

export async function confirmTicket(
  reference: string
): Promise<{ ok: boolean; already: boolean; reason?: "not_found" | "unpaid"; ticket: DanTicket | null }> {
  const ticketRef = doc(db, "tickets", reference);
  const snap = await getDoc(ticketRef);

  if (!snap.exists()) return { ok: false, already: false, reason: "not_found", ticket: null };

  const ticket = toDoc<DanTicket>(snap);

  if (ticket.status === "confirmed") {
    return { ok: false, already: true, ticket };
  }

  if (ticket.status === "pending") {
    // Payment not verified — cannot confirm an unpaid ticket
    return { ok: false, already: false, reason: "unpaid", ticket };
  }

  await updateDoc(ticketRef, {
    status: "confirmed",
    confirmedAt: serverTimestamp(),
  });

  return { ok: true, already: false, ticket: { ...ticket, status: "confirmed" } };
}

export async function getTicketsByEvent(eventId: string): Promise<DanTicket[]> {
  const snap = await getDocs(
    query(collection(db, "tickets"), where("eventId", "==", eventId))
  );
  const txs = snap.docs.map((d) => (toDoc<DanTicket>(d)));
  return txs
    .filter((t) => t.status === "paid" || t.status === "confirmed")
    .sort((a, b) => (b.purchasedAt?.seconds ?? 0) - (a.purchasedAt?.seconds ?? 0));
}

export async function getAllTickets(): Promise<DanTicket[]> {
  // limit(100) prevents a full-collection scan as ticket volume grows.
  // Admin pages that need deeper history should implement cursor-based pagination.
  const snap = await getDocs(
    query(collection(db, "tickets"), orderBy("purchasedAt", "desc"), limit(100))
  );
  return snap.docs.map((d) => toDoc<DanTicket>(d));
}

/* ═══════════════════════════════════════════════
   Vendors
═══════════════════════════════════════════════ */
export interface VendorMenuItem {
  name: string;
  price: string;
}

export interface VendorMenuCategory {
  name: string;
  items: VendorMenuItem[];
}

export interface DanVendor {
  id?: string;
  brandName: string;
  brandNameLower?: string;  // lowercase copy of brandName — used for case-insensitive dedup
  ownerName: string;
  email: string;
  phone: string;
  instagram?: string;
  /** @deprecated Use categories[] instead. Will be removed after a one-time Firestore migration. */
  category?: string;
  categories?: string[];   // up to 3 food categories
  events?: string[];       // event titles vendor has applied for / served at
  description: string;
  products?: string;
  logoUrl?: string;        // brand logo (square/circular, separate from food photos)
  imageUrl: string;
  imageUrls?: string[];    // all images accumulated from re-applications (slideshow)
  status: "pending" | "approved" | "declined";
  declineReason?: string;
  menu?: VendorMenuCategory[];  // structured menu (optional)
  reapplyCount?: number;   // how many times this vendor has re-applied
  previousSnapshot?: {     // state captured right before the last merge
    description: string;
    products?: string;
    imageUrl?: string;
    categories?: string[];
    status?: string;
  };
  submittedAt?: Timestamp;
  reviewedAt?: Timestamp | null;
}

export async function createVendorApplication(
  data: Omit<DanVendor, "id" | "status" | "submittedAt" | "reviewedAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "vendors"), {
    ...data,
    brandNameLower: data.brandName.trim().toLowerCase(),
    status: "pending",
    submittedAt: serverTimestamp(),
    reviewedAt: null,
  });
  return ref.id;
}

export async function getVendorByName(brandName: string): Promise<DanVendor | null> {
  const snap = await getDocs(
    query(collection(db, "vendors"), where("brandName", "==", brandName))
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return toDoc<DanVendor>(d);
}

export async function upsertVendorApplication(
  data: Omit<DanVendor, "id" | "status" | "submittedAt" | "reviewedAt">
): Promise<{ id: string; isUpdate: boolean }> {
  const brandNameLower = data.brandName.trim().toLowerCase();

  // Case-insensitive dedup: query by brandNameLower (populated since the fix),
  // then fall back to exact-match for legacy docs that predate this field.
  const lowerSnap = await getDocs(
    query(collection(db, "vendors"), where("brandNameLower", "==", brandNameLower))
  );
  const existing: DanVendor | null = lowerSnap.empty
    ? await getVendorByName(data.brandName)
    : toDoc<DanVendor>(lowerSnap.docs[0]);

  if (existing?.id) {
    // Merge events (deduplicate) and categories (deduplicate, max 3)
    const mergedEvents = Array.from(
      new Set([...(existing.events ?? []), ...(data.events ?? [])])
    );
    const existingCats = existing.categories ?? (existing.category ? [existing.category] : []);
    const mergedCats = Array.from(
      new Set([...existingCats, ...(data.categories ?? [])])
    ).slice(0, 3);

    // Accumulate images — keep all unique photos from every application
    const existingImages = existing.imageUrls?.length
      ? existing.imageUrls
      : existing.imageUrl ? [existing.imageUrl] : [];
    const mergedImages = data.imageUrl && !existingImages.includes(data.imageUrl)
      ? [...existingImages, data.imageUrl]
      : existingImages.length ? existingImages : [data.imageUrl];

    // Capture current state as snapshot BEFORE overwriting
    const previousSnapshot = {
      description: existing.description,
      products: existing.products,
      imageUrl: existing.imageUrl,
      categories: existingCats,
      status: existing.status,
    };

    await updateDoc(doc(db, "vendors", existing.id), {
      brandName: data.brandName,
      brandNameLower,
      ownerName: data.ownerName,
      email: data.email,             // update email in case it changed on re-apply
      phone: data.phone,
      instagram: data.instagram ?? "",
      description: data.description,
      products: data.products,
      imageUrl: data.imageUrl,       // latest image as primary
      imageUrls: mergedImages,       // full slideshow array
      logoUrl: data.logoUrl ?? existing.logoUrl ?? null,
      categories: mergedCats,
      events: mergedEvents,
      menu: data.menu ?? null,
      status: "pending",             // reset so admin re-reviews
      declineReason: null,
      reapplyCount: (existing.reapplyCount ?? 0) + 1,
      previousSnapshot,
      submittedAt: serverTimestamp(),
    });
    return { id: existing.id, isUpdate: true };
  }

  // New vendor — create fresh doc
  const ref = await addDoc(collection(db, "vendors"), {
    ...data,
    brandNameLower,
    categories: data.categories ?? [],
    events: data.events ?? [],
    imageUrls: data.imageUrl ? [data.imageUrl] : [],
    menu: data.menu ?? null,
    status: "pending",
    submittedAt: serverTimestamp(),
    reviewedAt: null,
  });
  return { id: ref.id, isUpdate: false };
}

export async function getApprovedVendors(): Promise<DanVendor[]> {
  const snap = await getDocs(
    query(collection(db, "vendors"), where("status", "==", "approved"))
  );
  return snap.docs.map((d) => (toDoc<DanVendor>(d)));
}

export async function getAllVendors(): Promise<DanVendor[]> {
  const snap = await getDocs(collection(db, "vendors"));
  const vendors = snap.docs.map((d) => (toDoc<DanVendor>(d)));
  return vendors.sort((a, b) => (b.submittedAt?.seconds ?? 0) - (a.submittedAt?.seconds ?? 0));
}

export async function updateVendorStatus(
  id: string,
  status: DanVendor["status"],
  declineReason?: string
): Promise<void> {
  await updateDoc(doc(db, "vendors", id), {
    status,
    declineReason: declineReason ?? null,
    reviewedAt: serverTimestamp(),
  });
  // Bust the public home page cache so approved vendors appear immediately
  clearCache("dan_approved_vendors");
}

export async function createVendorDirect(
  data: Omit<DanVendor, "id" | "submittedAt" | "reviewedAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "vendors"), {
    ...data,
    brandNameLower: data.brandName.trim().toLowerCase(),
    imageUrls: data.imageUrls?.length ? data.imageUrls : data.imageUrl ? [data.imageUrl] : [],
    submittedAt: serverTimestamp(),
    reviewedAt: null,  // not yet reviewed — admin created directly but still needs review
  });
  return ref.id;
}

export async function deleteVendor(id: string): Promise<void> {
  await deleteDoc(doc(db, "vendors", id));
}

/**
 * Normalises the legacy `category: string` field to the current `categories: string[]` format.
 * Run a one-time Firestore migration to eliminate this shim:
 *   for each vendor doc: update({ categories: getVendorCategories(data), category: deleteField() })
 */
export function getVendorCategories(v: DanVendor): string[] {
  return v.categories?.length ? v.categories : v.category ? [v.category] : [];
}

/** Real-time: approved vendors (public home + vendors page). */
export const subscribeApprovedVendors = createSubscription<DanVendor>(
  "vendors",
  [where("status", "==", "approved")],
);

/* ═══════════════════════════════════════════════
   Testimonials
═══════════════════════════════════════════════ */
export interface DanTestimonial {
  id?: string;
  name: string;           // Display name or brand name
  type: "vendor" | "user" | "admin";  // Badge label
  role: string;           // "Vendor", "Event Attendee", or custom admin role
  quote: string;          // Testimonial text
  eventTitle?: string;    // Which event (optional)
  createdBy: "user" | "admin"; // Only admin-created ones can be edited
  approved?: boolean;     // false = pending review; true = visible publicly. Older docs without the field are treated as approved.
  submittedAt?: Timestamp;
}

export async function createTestimonial(
  data: Omit<DanTestimonial, "id" | "submittedAt" | "approved">
): Promise<string> {
  const ref = await addDoc(collection(db, "testimonials"), {
    ...data,
    // Admin-created posts go live immediately; user submissions need approval
    approved: data.createdBy === "admin",
    submittedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function approveTestimonial(id: string): Promise<void> {
  await updateDoc(doc(db, "testimonials", id), { approved: true });
}

export async function updateTestimonial(
  id: string,
  data: Partial<Pick<DanTestimonial, "name" | "role" | "quote" | "eventTitle" | "type">>
): Promise<void> {
  await updateDoc(doc(db, "testimonials", id), data);
}

export async function deleteTestimonial(id: string): Promise<void> {
  await deleteDoc(doc(db, "testimonials", id));
}

export async function getAllTestimonials(): Promise<DanTestimonial[]> {
  const snap = await getDocs(
    query(collection(db, "testimonials"), orderBy("submittedAt", "desc"))
  );
  return snap.docs.map((d) => (toDoc<DanTestimonial>(d)));
}

/** Real-time listener — returns an unsubscribe function. */
export const subscribeToTestimonials = createSubscription<DanTestimonial>(
  "testimonials",
  [orderBy("submittedAt", "desc")],
);

/* ═══════════════════════════════════════════════
   Gallery Items
═══════════════════════════════════════════════ */
export interface DanGalleryItem {
  id?: string;
  eventId: string;
  eventTitle: string;
  type: "photo" | "video";
  src: string;
  caption: string;
  createdAt?: Timestamp;
}

export async function getAllGalleryItems(): Promise<DanGalleryItem[]> {
  const snap = await getDocs(
    query(collection(db, "gallery"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => (toDoc<DanGalleryItem>(d)));
}

export async function getGalleryItemsByEvent(eventId: string): Promise<DanGalleryItem[]> {
  const snap = await getDocs(
    query(collection(db, "gallery"), where("eventId", "==", eventId), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => (toDoc<DanGalleryItem>(d)));
}

export async function createGalleryItem(
  data: Omit<DanGalleryItem, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "gallery"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  clearCache("dan_gallery");
  return ref.id;
}

export async function deleteGalleryItem(id: string): Promise<void> {
  await deleteDoc(doc(db, "gallery", id));
  clearCache("dan_gallery");
}

/** Real-time: all gallery items (public gallery + home page). */
export const subscribeGalleryItems = createSubscription<DanGalleryItem>(
  "gallery",
  [orderBy("createdAt", "desc")],
);

/* ═══════════════════════════════════════════════
   Products (Merch Shop)
═══════════════════════════════════════════════ */
export interface DanProduct {
  id?: string;
  name: string;
  price: number;       // Naira
  category: string;   // tshirts | hoodies | caps | bags | stickers | limited
  description: string;
  imageUrl: string;
  accent: string;      // hex color e.g. "#FFFF00"
  limited: boolean;
  soldCount: number;   // Hot Pick = highest soldCount > 0
  stock: number;       // -1 = unlimited
  active?: boolean;    // undefined/true = on shelf; false = hidden from public shop
  createdAt?: Timestamp;
}

export async function getAllProducts(): Promise<DanProduct[]> {
  const snap = await getDocs(
    query(collection(db, "products"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => (toDoc<DanProduct>(d)));
}

export async function createProduct(
  data: Omit<DanProduct, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "products"), {
    ...data,
    soldCount: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProduct(id: string, data: Partial<DanProduct>): Promise<void> {
  await updateDoc(doc(db, "products", id), data);
}

/** Restores availability by decrementing soldCount for each item in a returned order.
 *  `stock` (total capacity) is intentionally left unchanged — only soldCount changes. */
export async function restockReturnedOrder(
  items: { productId: string; qty: number }[],
): Promise<void> {
  await Promise.all(
    items.map(({ productId, qty }) =>
      runTransaction(db, async (tx) => {
        const ref = doc(db, "products", productId);
        const snap = await tx.get(ref);
        if (!snap.exists()) return;
        const data = snap.data();
        tx.update(ref, {
          soldCount: Math.max(0, (data.soldCount ?? 0) - qty),
        });
      }),
    ),
  );
  clearCache("dan_products");
}

/** Re-applies soldCount when a returned order is undone (i.e. status reverts from "returned").
 *  Increments soldCount by qty — the mirror of restockReturnedOrder. */
export async function reapplyOrderSoldCount(
  items: { productId: string; qty: number }[],
): Promise<void> {
  await Promise.all(
    items.map(({ productId, qty }) =>
      runTransaction(db, async (tx) => {
        const ref = doc(db, "products", productId);
        const snap = await tx.get(ref);
        if (!snap.exists()) return;
        const data = snap.data();
        tx.update(ref, {
          soldCount: (data.soldCount ?? 0) + qty,
        });
      }),
    ),
  );
  clearCache("dan_products");
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, "products", id));
  clearCache("dan_products");
}

export async function incrementProductSold(id: string, qty: number): Promise<void> {
  await updateDoc(doc(db, "products", id), { soldCount: increment(qty) });
}

/* ═══════════════════════════════════════════════
   Merch Orders
═══════════════════════════════════════════════ */
export type DanDeliveryStatus = "pending" | "dispatched" | "delivered" | "returned";

export interface DanMerchOrder {
  id?: string;
  reference: string;
  name: string;
  email: string;
  phone: string;
  address?: {
    street: string;
    city: string;
    state: string;
  };
  items: { productId: string; productName: string; price: number; qty: number }[];
  total: number;          // in Naira
  status: "pending" | "paid";
  deliveryStatus: DanDeliveryStatus;
  statusNote?: string;   // latest note (kept for quick display)
  statusHistory?: { status: DanDeliveryStatus; note: string; changedAt: number }[];
  createdAt?: Timestamp;
}

export async function createMerchOrder(
  data: Omit<DanMerchOrder, "id" | "createdAt">
): Promise<void> {
  await setDoc(doc(db, "merch_orders", data.reference), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function getMerchOrder(reference: string): Promise<DanMerchOrder | null> {
  const snap = await getDoc(doc(db, "merch_orders", reference));
  if (!snap.exists()) return null;
  return toDoc<DanMerchOrder>(snap);
}

export async function getAllMerchOrders(): Promise<DanMerchOrder[]> {
  const snap = await getDocs(
    query(collection(db, "merch_orders"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => (toDoc<DanMerchOrder>(d)));
}

export async function updateMerchOrderDelivery(
  id: string,
  deliveryStatus: DanMerchOrder["deliveryStatus"],
  note?: string,
): Promise<void> {
  await updateDoc(doc(db, "merch_orders", id), {
    deliveryStatus,
    statusNote: note ?? null,
    // Append every status change to the audit trail
    statusHistory: arrayUnion({
      status: deliveryStatus,
      note: note ?? "",
      changedAt: Date.now(),
    }),
  });
}

export async function deleteMerchOrder(id: string): Promise<void> {
  await deleteDoc(doc(db, "merch_orders", id));
}

/** Real-time: all merch orders (admin orders page). */
export const subscribeMerchOrders = createSubscription<DanMerchOrder>(
  "merch_orders",
  [orderBy("createdAt", "desc")],
);

/** Real-time: all products (public shop page). */
export const subscribeAllProducts = createSubscription<DanProduct>(
  "products",
  [orderBy("createdAt", "desc")],
);

/* ═══════════════════════════════════════════════
   Admin Activity Logs
═══════════════════════════════════════════════ */

export interface DanAdminLog {
  id?: string;
  adminEmail: string;
  adminName: string;
  action: string;       // e.g. "LOGIN", "CREATE_EVENT", "APPROVE_VENDOR"
  details: string;      // human-readable description
  entityType?: string;  // "event" | "vendor" | "product" | "order" | "gallery" | "testimonial" | "ticket"
  entityId?: string;
  entityName?: string;
  timestamp: Timestamp;
}

export async function createAdminLog(
  data: Omit<DanAdminLog, "id" | "timestamp">,
): Promise<void> {
  await addDoc(collection(db, "admin_logs"), {
    ...data,
    timestamp: serverTimestamp(),
  });
}

export async function getAdminLogs(limitCount = 200): Promise<DanAdminLog[]> {
  const q = query(
    collection(db, "admin_logs"),
    orderBy("timestamp", "desc"),
    limit(limitCount),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toDoc<DanAdminLog>(d));
}

export const subscribeAdminLogs = createSubscription<DanAdminLog>(
  "admin_logs",
  [orderBy("timestamp", "desc"), limit(300)],
);

/* ═══════════════════════════════════════════════
   Deleted Events Archive
   Soft-delete: saves a full snapshot to deleted_events
   before removing from events. Tickets stay intact.
═══════════════════════════════════════════════ */

export interface DanDeletedEvent extends DanEvent {
  deletedAt: Timestamp;
  deletedBy: string;       // admin email
  deletedByName: string;
  snapshotTicketsSold: number;
  snapshotRevenue: number; // in Naira at time of deletion
}

export async function archiveAndDeleteEvent(
  event: DanEvent,
  soldTickets: number,
  revenue: number,
  adminEmail: string,
  adminName: string,
): Promise<void> {
  // Save full snapshot to deleted_events
  await addDoc(collection(db, "deleted_events"), {
    ...event,
    deletedAt: serverTimestamp(),
    deletedBy: adminEmail,
    deletedByName: adminName,
    snapshotTicketsSold: soldTickets,
    snapshotRevenue: revenue,
  });
  // Remove from live events
  await deleteDoc(doc(db, "events", event.id!));
  clearCache("dan_active_events");
  clearCache("dan_past_events");
}

export async function permanentlyDeleteArchivedEvent(id: string): Promise<void> {
  await deleteDoc(doc(db, "deleted_events", id));
}

export const subscribeDeletedEvents = createSubscription<DanDeletedEvent>(
  "deleted_events",
  [orderBy("deletedAt", "desc")],
);

/* ═══════════════════════════════════════════════
   Deleted Products Archive
═══════════════════════════════════════════════ */

export interface DanDeletedProduct extends DanProduct {
  deletedAt: Timestamp;
  deletedBy: string;
  deletedByName: string;
}

export async function archiveAndDeleteProduct(
  product: DanProduct,
  adminEmail: string,
  adminName: string,
): Promise<void> {
  await addDoc(collection(db, "deleted_products"), {
    ...product,
    deletedAt: serverTimestamp(),
    deletedBy: adminEmail,
    deletedByName: adminName,
  });
  await deleteDoc(doc(db, "products", product.id!));
  clearCache("dan_products");
}

export async function permanentlyDeleteArchivedProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, "deleted_products", id));
}

export const subscribeDeletedProducts = createSubscription<DanDeletedProduct>(
  "deleted_products",
  [orderBy("deletedAt", "desc")],
);
