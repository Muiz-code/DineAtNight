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
  Timestamp,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

/* ═══════════════════════════════════════════════
   Types
═══════════════════════════════════════════════ */
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
  category: string;
  description: string;
  products: string;
  imageUrl: string;
  status: "pending" | "approved" | "declined";
  declineReason?: string;
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
    submittedAt: serverTimestamp(),
    reviewedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteVendor(id: string): Promise<void> {
  await deleteDoc(doc(db, "vendors", id));
}
