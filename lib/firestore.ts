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
  onSnapshot,
  Timestamp,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

/* ═══════════════════════════════════════════════
   Types
═══════════════════════════════════════════════ */
export interface DanSponsor {
  name: string;
  logoUrl: string;
}

export interface DanEvent {
  id?: string;
  title: string;
  edition: string;
  date: Timestamp;
  venue: string;
  description: string;
  isPast: boolean;
  ticketPrice: number;   // in Naira
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
  const evs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DanEvent));
  return evs.sort((a, b) => (b.date?.seconds ?? 0) - (a.date?.seconds ?? 0));
}

export async function getActiveEvents(): Promise<DanEvent[]> {
  const snap = await getDocs(
    query(collection(db, "events"), where("status", "==", "active"))
  );
  const evs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DanEvent));
  return evs.sort((a, b) => (a.date?.seconds ?? 0) - (b.date?.seconds ?? 0));
}

export async function getPastEvents(): Promise<DanEvent[]> {
  const snap = await getDocs(
    query(collection(db, "events"), where("isPast", "==", true))
  );
  const evs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DanEvent));
  return evs.sort((a, b) => (b.date?.seconds ?? 0) - (a.date?.seconds ?? 0));
}

export async function getEventById(id: string): Promise<DanEvent | null> {
  const snap = await getDoc(doc(db, "events", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as DanEvent;
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
}

export async function deleteEvent(id: string): Promise<void> {
  await deleteDoc(doc(db, "events", id));
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
  return { id: snap.id, ...snap.data() } as DanTicket;
}

export async function markTicketPaid(
  reference: string,
  eventId: string,
  quantity: number
): Promise<void> {
  // Direct doc update — no query, no auth required by rules
  await updateDoc(doc(db, "tickets", reference), { status: "paid" });
  await updateDoc(doc(db, "events", eventId), {
    soldTickets: increment(quantity),
  });
}

export async function confirmTicket(
  reference: string
): Promise<{ ok: boolean; already: boolean; ticket: DanTicket | null }> {
  const ticketRef = doc(db, "tickets", reference);
  const snap = await getDoc(ticketRef);

  if (!snap.exists()) return { ok: false, already: false, ticket: null };

  const ticket = { id: snap.id, ...snap.data() } as DanTicket;

  if (ticket.status === "confirmed") {
    return { ok: false, already: true, ticket };
  }

  if (ticket.status === "pending") {
    // Payment not verified — do not confirm
    return { ok: false, already: false, ticket };
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
  const txs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DanTicket));
  return txs
    .filter((t) => t.status === "paid" || t.status === "confirmed")
    .sort((a, b) => (b.purchasedAt?.seconds ?? 0) - (a.purchasedAt?.seconds ?? 0));
}

export async function getAllTickets(): Promise<DanTicket[]> {
  const snap = await getDocs(collection(db, "tickets"));
  const txs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DanTicket));
  return txs.sort((a, b) => (b.purchasedAt?.seconds ?? 0) - (a.purchasedAt?.seconds ?? 0));
}

/* ═══════════════════════════════════════════════
   Vendors
═══════════════════════════════════════════════ */
export interface DanVendor {
  id?: string;
  brandName: string;
  ownerName: string;
  email: string;
  phone: string;
  instagram?: string;
  category?: string;       // legacy — kept for old Firestore docs
  categories?: string[];   // up to 3 food categories
  events?: string[];       // event titles vendor has applied for / served at
  description: string;
  products: string;
  logoUrl?: string;        // brand logo (square/circular, separate from food photos)
  imageUrl: string;
  imageUrls?: string[];    // all images accumulated from re-applications (slideshow)
  status: "pending" | "approved" | "declined";
  declineReason?: string;
  reapplyCount?: number;   // how many times this vendor has re-applied
  previousSnapshot?: {     // state captured right before the last merge
    description: string;
    products: string;
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
  return { id: d.id, ...d.data() } as DanVendor;
}

export async function upsertVendorApplication(
  data: Omit<DanVendor, "id" | "status" | "submittedAt" | "reviewedAt">
): Promise<{ id: string; isUpdate: boolean }> {
  const existing = await getVendorByName(data.brandName);

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
      ownerName: data.ownerName,
      phone: data.phone,
      instagram: data.instagram ?? "",
      description: data.description,
      products: data.products,
      imageUrl: data.imageUrl,       // latest image as primary
      imageUrls: mergedImages,       // full slideshow array
      logoUrl: data.logoUrl ?? existing.logoUrl ?? null,
      categories: mergedCats,
      events: mergedEvents,
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
    categories: data.categories ?? [],
    events: data.events ?? [],
    imageUrls: data.imageUrl ? [data.imageUrl] : [],
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
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DanVendor));
}

export async function getAllVendors(): Promise<DanVendor[]> {
  const snap = await getDocs(collection(db, "vendors"));
  const vendors = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DanVendor));
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
}

export async function createVendorDirect(
  data: Omit<DanVendor, "id" | "submittedAt" | "reviewedAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "vendors"), {
    ...data,
    imageUrls: data.imageUrls?.length ? data.imageUrls : data.imageUrl ? [data.imageUrl] : [],
    submittedAt: serverTimestamp(),
    reviewedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteVendor(id: string): Promise<void> {
  await deleteDoc(doc(db, "vendors", id));
}

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
  submittedAt?: Timestamp;
}

export async function createTestimonial(
  data: Omit<DanTestimonial, "id" | "submittedAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "testimonials"), {
    ...data,
    submittedAt: serverTimestamp(),
  });
  return ref.id;
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
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DanTestimonial));
}

/** Real-time listener — returns an unsubscribe function. */
export function subscribeToTestimonials(
  callback: (testimonials: DanTestimonial[]) => void
): () => void {
  const q = query(
    collection(db, "testimonials"),
    orderBy("submittedAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DanTestimonial)));
    },
    () => callback([])
  );
}
