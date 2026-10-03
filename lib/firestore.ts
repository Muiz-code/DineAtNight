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
  deleteField,
  writeBatch,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";
import { clearCache } from "./cache";
import { ADMIN_LOG_RETENTION_MS } from "./constants";
import { StaticImport } from "next/dist/shared/lib/get-img-props";

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
  name: string; // e.g. "VIP", "VVIP", "General Admission"
  price: number; // in Naira
  limit?: number; // max tickets available for this tier (undefined = no separate cap)
}

export interface DanEvent {
  id?: string;
  title: string;
  edition: string;
  date: Timestamp;
  venue: string;
  description: string;
  isPast: boolean;
  ticketPrice: number; // base / lowest price in Naira (kept for backward compat)
  ticketTypes?: DanTicketType[]; // optional multiple tiers — when present, overrides ticketPrice
  totalTickets: number;
  soldTickets: number;
  status: "draft" | "active" | "ended";
  imageUrl: string;
  highlights: string[];
  sponsors?: DanSponsor[];
  externalTicketUrl?: string;
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
  ticketType?: string; // e.g. "VIP", "VVIP", "General Admission" — undefined = legacy single-price
  amount: number; // in kobo (Paystack)
  reference: string; // Paystack reference = Firestore document ID
  status: "pending" | "paid" | "confirmed";
  purchasedAt?: Timestamp;
  confirmedAt?: Timestamp | null;
}

/* ═══════════════════════════════════════════════
   Events
═══════════════════════════════════════════════ */
export async function getAllEvents(): Promise<DanEvent[]> {
  const snap = await getDocs(collection(db, "events"));
  const evs = snap.docs.map((d) => toDoc<DanEvent>(d));
  return evs.sort((a, b) => (b.date?.seconds ?? 0) - (a.date?.seconds ?? 0));
}

export async function getActiveEvents(): Promise<DanEvent[]> {
  const snap = await getDocs(
    query(collection(db, "events"), where("status", "==", "active")),
  );
  const evs = snap.docs.map((d) => toDoc<DanEvent>(d));
  return evs.sort((a, b) => (a.date?.seconds ?? 0) - (b.date?.seconds ?? 0));
}

export async function getPastEvents(): Promise<DanEvent[]> {
  const snap = await getDocs(
    query(collection(db, "events"), where("isPast", "==", true)),
  );
  const evs = snap.docs.map((d) => toDoc<DanEvent>(d));
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

export async function createEvent(
  data: Omit<DanEvent, "id" | "createdAt" | "soldTickets">,
): Promise<string> {
  const ref = await addDoc(collection(db, "events"), {
    ...data,
    soldTickets: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEvent(
  id: string,
  data: Partial<DanEvent>,
): Promise<void> {
  // updateDoc only touches the keys it's given, so an empty externalTicketUrl
  // must be turned into deleteField() — otherwise a cleared link stays stored.
  const { externalTicketUrl, ...rest } = data;
  await updateDoc(doc(db, "events", id), {
    ...rest,
    ...(externalTicketUrl !== undefined && {
      externalTicketUrl: externalTicketUrl || deleteField(),
    }),
  });
  clearCache("dan_active_events");
  clearCache("dan_past_events");
}

/* ═══════════════════════════════════════════════
   Tickets
   Document ID = Paystack reference. Tickets are created and marked
   paid server-side only (lib/payments.ts, Admin SDK).
═══════════════════════════════════════════════ */
export async function getTicketByReference(
  reference: string,
): Promise<DanTicket | null> {
  const snap = await getDoc(doc(db, "tickets", reference));
  if (!snap.exists()) return null;
  return toDoc<DanTicket>(snap);
}

export async function confirmTicket(reference: string): Promise<{
  ok: boolean;
  already: boolean;
  reason?: "not_found" | "unpaid";
  ticket: DanTicket | null;
}> {
  const ticketRef = doc(db, "tickets", reference);

  // Transaction: two scanners on the same ticket cannot both admit it
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ticketRef);
    if (!snap.exists())
      return { ok: false, already: false, reason: "not_found" as const, ticket: null };

    const ticket = toDoc<DanTicket>(snap);

    if (ticket.status === "confirmed") {
      return { ok: false, already: true, ticket };
    }

    if (ticket.status === "pending") {
      // Payment not verified — cannot confirm an unpaid ticket
      return { ok: false, already: false, reason: "unpaid" as const, ticket };
    }

    tx.update(ticketRef, {
      status: "confirmed",
      confirmedAt: serverTimestamp(),
    });

    return {
      ok: true,
      already: false,
      ticket: { ...ticket, status: "confirmed" as const },
    };
  });
}

export async function getTicketsByEvent(eventId: string): Promise<DanTicket[]> {
  const snap = await getDocs(
    query(collection(db, "tickets"), where("eventId", "==", eventId)),
  );
  const txs = snap.docs.map((d) => toDoc<DanTicket>(d));
  return txs
    .filter((t) => t.status === "paid" || t.status === "confirmed")
    .sort(
      (a, b) => (b.purchasedAt?.seconds ?? 0) - (a.purchasedAt?.seconds ?? 0),
    );
}

export async function getAllTickets(): Promise<DanTicket[]> {
  // limit(100) prevents a full-collection scan as ticket volume grows.
  // Admin pages that need deeper history should implement cursor-based pagination.
  const snap = await getDocs(
    query(
      collection(db, "tickets"),
      orderBy("purchasedAt", "desc"),
      limit(100),
    ),
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
  brandNameLower?: string; // lowercase copy of brandName — used for case-insensitive dedup
  ownerName: string;
  email: string;
  phone: string;
  instagram?: string;
  /** @deprecated Use categories[] instead. Will be removed after a one-time Firestore migration. */
  category?: string;
  categories?: string[]; // up to 3 food categories
  events?: string[]; // event titles vendor has applied for / served at
  description: string;
  products?: string;
  logoUrl?: string; // brand logo (square/circular, separate from food photos)
  imageUrl: string;
  imageUrls?: string[]; // all images accumulated from re-applications (slideshow)
  status: "pending" | "approved" | "declined";
  declineReason?: string;
  menu?: VendorMenuCategory[]; // structured menu (optional)
  menuImages?: string[]; // menu photos/screenshots, shown as-is (any menu style)
  productImages?: string[]; // optional product photos (added to the card slideshow)
  pinned?: boolean; // admin-pinned: always listed first on the public site
  reapplyCount?: number; // how many times this vendor has re-applied
  previousSnapshot?: {
    // state captured right before the last merge
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
  data: Omit<DanVendor, "id" | "status" | "submittedAt" | "reviewedAt">,
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

export async function getVendorByName(
  brandName: string,
): Promise<DanVendor | null> {
  const snap = await getDocs(
    query(collection(db, "vendors"), where("brandName", "==", brandName)),
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return toDoc<DanVendor>(d);
}

export async function upsertVendorApplication(
  data: Omit<DanVendor, "id" | "status" | "submittedAt" | "reviewedAt">,
): Promise<{ id: string; isUpdate: boolean }> {
  const brandNameLower = data.brandName.trim().toLowerCase();

  // Case-insensitive dedup: query by brandNameLower, fall back to exact-match.
  // These queries may be denied by Firestore rules (only approved vendors are
  // publicly readable — unapproved docs block the query). If denied, fall
  // through to create a new doc rather than surfacing a permission error.
  let existing: DanVendor | null = null;
  try {
    const lowerSnap = await getDocs(
      query(
        collection(db, "vendors"),
        where("brandNameLower", "==", brandNameLower),
      ),
    );
    existing = lowerSnap.empty
      ? await getVendorByName(data.brandName)
      : toDoc<DanVendor>(lowerSnap.docs[0]);
  } catch {
    // Permission denied — vendor collection not queryable without auth.
    // Skip dedup and fall through to addDoc below.
  }

  if (existing?.id) {
    // Existing vendor — update atomically to prevent partial writes
    const existingRef = doc(db, "vendors", existing.id);
    await runTransaction(db, async (tx) => {
      // Re-read inside transaction to get the latest state
      const snap = await tx.get(existingRef);
      if (!snap.exists()) return; // was deleted between query and transaction — skip
      const current = toDoc<DanVendor>(snap);

      const mergedEvents = Array.from(
        new Set([...(current.events ?? []), ...(data.events ?? [])]),
      );
      const existingCats =
        current.categories ?? (current.category ? [current.category] : []);
      const mergedCats = Array.from(
        new Set([...existingCats, ...(data.categories ?? [])]),
      ).slice(0, 3);

      const existingImages = current.imageUrls?.length
        ? current.imageUrls
        : current.imageUrl
          ? [current.imageUrl]
          : [];
      // Newest photo first, so a re-application's new photo leads the slideshow
      const mergedImages =
        data.imageUrl && !existingImages.includes(data.imageUrl)
          ? [data.imageUrl, ...existingImages]
          : existingImages.length
            ? existingImages
            : [data.imageUrl];

      const previousSnapshot = {
        description: current.description,
        products: current.products,
        imageUrl: current.imageUrl,
        categories: existingCats,
        status: current.status,
      };

      tx.update(existingRef, {
        brandName: data.brandName,
        brandNameLower,
        ownerName: data.ownerName,
        email: data.email,
        phone: data.phone,
        instagram: data.instagram ?? "",
        description: data.description,
        products: data.products,
        imageUrl: data.imageUrl,
        imageUrls: mergedImages,
        logoUrl: data.logoUrl ?? current.logoUrl ?? null,
        categories: mergedCats,
        events: mergedEvents,
        menu: data.menu ?? null,
        // A re-application with new menu pictures replaces the old ones
        menuImages: data.menuImages?.length ? data.menuImages : (current.menuImages ?? []),
        productImages: data.productImages?.length ? data.productImages : (current.productImages ?? []),
        status: "pending",
        declineReason: null,
        reapplyCount: (current.reapplyCount ?? 0) + 1,
        previousSnapshot,
        submittedAt: serverTimestamp(),
      });
    });
    return { id: existing.id, isUpdate: true };
  }

  // New vendor — create fresh doc
  // Firestore v12+ throws on `undefined` field values — omit logoUrl/menu when absent.
  const { logoUrl: _logoUrl, menu: _menu, ...restData } = data;
  const ref = await addDoc(collection(db, "vendors"), {
    ...restData,
    brandNameLower,
    categories: data.categories ?? [],
    events: data.events ?? [],
    imageUrls: data.imageUrl ? [data.imageUrl] : [],
    ...(data.logoUrl ? { logoUrl: data.logoUrl } : {}),
    menu: data.menu ?? null,
    status: "pending",
    submittedAt: serverTimestamp(),
    reviewedAt: null,
  });
  return { id: ref.id, isUpdate: false };
}

export async function getAllVendors(): Promise<DanVendor[]> {
  const snap = await getDocs(collection(db, "vendors"));
  const vendors = snap.docs.map((d) => toDoc<DanVendor>(d));
  return vendors.sort(
    (a, b) => (b.submittedAt?.seconds ?? 0) - (a.submittedAt?.seconds ?? 0),
  );
}

export async function updateVendorStatus(
  id: string,
  status: DanVendor["status"],
  declineReason?: string,
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
  data: Omit<DanVendor, "id" | "submittedAt" | "reviewedAt">,
): Promise<string> {
  const ref = await addDoc(collection(db, "vendors"), {
    ...data,
    brandNameLower: data.brandName.trim().toLowerCase(),
    imageUrls: data.imageUrls?.length
      ? data.imageUrls
      : data.imageUrl
        ? [data.imageUrl]
        : [],
    submittedAt: serverTimestamp(),
    reviewedAt: null, // not yet reviewed — admin created directly but still needs review
  });
  return ref.id;
}

export async function deleteVendor(id: string): Promise<void> {
  await deleteDoc(doc(db, "vendors", id));
}

export async function updateVendor(
  id: string,
  data: Partial<Omit<DanVendor, "id" | "submittedAt">>,
): Promise<void> {
  await updateDoc(doc(db, "vendors", id), {
    ...data,
    ...(data.brandName
      ? { brandNameLower: data.brandName.trim().toLowerCase() }
      : {}),
  });
}

/**
 * Normalises the legacy `category: string` field to the current `categories: string[]` format.
 * Run a one-time Firestore migration to eliminate this shim:
 *   for each vendor doc: update({ categories: getVendorCategories(data), category: deleteField() })
 */
export function getVendorCategories(v: Pick<DanVendor, "categories" | "category">): string[] {
  return v.categories?.length ? v.categories : v.category ? [v.category] : [];
}

/**
 * The public view of a vendor: business contact (email/phone/Instagram) and
 * menu are public; owner name and review data are not. Vendor docs are
 * admin-only in security rules; the public site gets this shape from
 * GET /api/vendors (Admin SDK + field whitelist).
 */
export type PublicVendor = Pick<DanVendor, "id" | "brandName" | "description" | "imageUrl"> &
  Partial<Pick<DanVendor, "imageUrls" | "logoUrl" | "categories" | "category" | "events" | "products" | "instagram" | "menu" | "menuImages" | "productImages" | "email" | "phone" | "pinned">>;

/**
 * Pictures for a vendor's card/slideshow: food photos, then product photos.
 * Falls back to the logo, then the first menu picture, so a vendor who only
 * uploaded a logo still gets a proper card instead of an empty box.
 */
export function vendorDisplayImages(
  v: Pick<DanVendor, "imageUrl" | "imageUrls" | "productImages" | "logoUrl" | "menuImages">,
): string[] {
  const food = v.imageUrls?.length ? v.imageUrls : v.imageUrl ? [v.imageUrl] : [];
  const all = Array.from(new Set([...food, ...(v.productImages ?? [])].filter(Boolean)));
  if (all.length) return all;
  if (v.logoUrl) return [v.logoUrl];
  return v.menuImages?.length ? [v.menuImages[0]] : [];
}

/** Approved vendors for the public home + vendors pages. */
export async function fetchApprovedVendors(): Promise<PublicVendor[]> {
  const res = await fetch("/api/vendors");
  if (!res.ok) throw new Error(`Failed to load vendors (${res.status})`);
  const { vendors } = (await res.json()) as { vendors: PublicVendor[] };
  return vendors;
}

/* ═══════════════════════════════════════════════
   Testimonials
═══════════════════════════════════════════════ */
export interface DanTestimonial {
  id?: string;
  name: string; // Display name or brand name
  type: "vendor" | "user" | "admin"; // Badge label
  role: string; // "Vendor", "Event Attendee", or custom admin role
  quote: string; // Testimonial text
  eventTitle?: string; // Which event (optional)
  createdBy: "user" | "admin"; // Only admin-created ones can be edited
  approved?: boolean; // false = pending review; true = visible publicly. Older docs without the field are treated as approved.
  submittedAt?: Timestamp;
}

export async function createTestimonial(
  data: Omit<DanTestimonial, "id" | "submittedAt" | "approved">,
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
  data: Partial<
    Pick<DanTestimonial, "name" | "role" | "quote" | "eventTitle" | "type">
  >,
): Promise<void> {
  await updateDoc(doc(db, "testimonials", id), data);
}

export async function deleteTestimonial(id: string): Promise<void> {
  await deleteDoc(doc(db, "testimonials", id));
}

export async function getAllTestimonials(): Promise<DanTestimonial[]> {
  const snap = await getDocs(
    query(collection(db, "testimonials"), orderBy("submittedAt", "desc")),
  );
  return snap.docs.map((d) => toDoc<DanTestimonial>(d));
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
  src: string | StaticImport;
  url: string;
  id?: string;
  eventId: string;
  eventTitle: string;
  type: "photo" | "video";
  caption: string;
  createdAt?: Timestamp;
}

export async function getAllGalleryItems(): Promise<DanGalleryItem[]> {
  const snap = await getDocs(
    query(collection(db, "gallery"), orderBy("createdAt", "desc")),
  );
  return snap.docs.map((d) => toDoc<DanGalleryItem>(d));
}

export async function getGalleryItemsByEvent(
  eventId: string,
): Promise<DanGalleryItem[]> {
  const snap = await getDocs(
    query(
      collection(db, "gallery"),
      where("eventId", "==", eventId),
      orderBy("createdAt", "desc"),
    ),
  );
  return snap.docs.map((d) => toDoc<DanGalleryItem>(d));
}

export async function createGalleryItem(
  data: Omit<DanGalleryItem, "id" | "createdAt">,
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
  price: number; // Naira
  category: string; // tshirts | hoodies | caps | bags | stickers | limited
  description: string;
  imageUrl: string;
  accent: string; // hex color e.g. "#FFFF00"
  limited: boolean;
  soldCount: number; // Hot Pick = highest soldCount > 0
  stock: number; // -1 = unlimited
  active?: boolean; // undefined/true = on shelf; false = hidden from public shop
  createdAt?: Timestamp;
}

export async function getAllProducts(): Promise<DanProduct[]> {
  const snap = await getDocs(
    query(collection(db, "products"), orderBy("createdAt", "desc")),
  );
  return snap.docs.map((d) => toDoc<DanProduct>(d));
}

export async function createProduct(
  data: Omit<DanProduct, "id" | "createdAt">,
): Promise<string> {
  const ref = await addDoc(collection(db, "products"), {
    ...data,
    soldCount: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProduct(
  id: string,
  data: Partial<DanProduct>,
): Promise<void> {
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

/* ═══════════════════════════════════════════════
   Merch Orders
═══════════════════════════════════════════════ */
export type DanDeliveryStatus =
  | "pending"
  | "dispatched"
  | "delivered"
  | "returned";

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
  items: {
    productId: string;
    productName: string;
    price: number;
    qty: number;
  }[];
  total: number; // in Naira
  status: "pending" | "paid";
  deliveryStatus: DanDeliveryStatus;
  statusNote?: string; // latest note (kept for quick display)
  statusHistory?: {
    status: DanDeliveryStatus;
    note: string;
    changedAt: number;
  }[];
  createdAt?: Timestamp;
}

export async function getMerchOrder(
  reference: string,
): Promise<DanMerchOrder | null> {
  const snap = await getDoc(doc(db, "merch_orders", reference));
  if (!snap.exists()) return null;
  return toDoc<DanMerchOrder>(snap);
}

export async function getAllMerchOrders(): Promise<DanMerchOrder[]> {
  const snap = await getDocs(
    query(collection(db, "merch_orders"), orderBy("createdAt", "desc")),
  );
  return snap.docs.map((d) => toDoc<DanMerchOrder>(d));
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
export const subscribeAllProducts = createSubscription<DanProduct>("products", [
  orderBy("createdAt", "desc"),
]);

/* ═══════════════════════════════════════════════
   Admin Activity Logs
═══════════════════════════════════════════════ */

export interface DanAdminLog {
  id?: string;
  adminEmail: string;
  adminName: string;
  action: string; // e.g. "LOGIN", "CREATE_EVENT", "APPROVE_VENDOR"
  details: string; // human-readable description
  entityType?: string; // "event" | "vendor" | "product" | "order" | "gallery" | "testimonial" | "ticket"
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

/** Deletes all admin_logs older than 30 days in a single batch. */
export async function deleteOldAdminLogs(): Promise<void> {
  const cutoff = Timestamp.fromDate(new Date(Date.now() - ADMIN_LOG_RETENTION_MS));
  const snap = await getDocs(
    query(collection(db, "admin_logs"), where("timestamp", "<", cutoff)),
  );
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

/* ═══════════════════════════════════════════════
   Deleted Events Archive
   Soft-delete: saves a full snapshot to deleted_events
   before removing from events. Tickets stay intact.
═══════════════════════════════════════════════ */

export interface DanDeletedEvent extends DanEvent {
  deletedAt: Timestamp;
  deletedBy: string; // admin email
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
  // Save full snapshot to deleted_events using the event's own ID as document key
  await setDoc(doc(db, "deleted_events", event.id!), {
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

export async function permanentlyDeleteArchivedEvent(
  id: string,
): Promise<void> {
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
  // Save full snapshot to deleted_products using the product's own ID as document key
  await setDoc(doc(db, "deleted_products", product.id!), {
    ...product,
    deletedAt: serverTimestamp(),
    deletedBy: adminEmail,
    deletedByName: adminName,
  });
  await deleteDoc(doc(db, "products", product.id!));
  clearCache("dan_products");
}

export async function permanentlyDeleteArchivedProduct(
  id: string,
): Promise<void> {
  await deleteDoc(doc(db, "deleted_products", id));
}

export const subscribeDeletedProducts = createSubscription<DanDeletedProduct>(
  "deleted_products",
  [orderBy("deletedAt", "desc")],
);
