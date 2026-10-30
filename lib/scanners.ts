/**
 * Ticket scanner accounts + gate check-in (server-only, Firebase Admin SDK).
 *
 * Staff who scan tickets at the gate don't get admin accounts. An admin adds
 * them by name and gets a one-time code; the code is exchanged once on /scan
 * for a session cookie. Logging out (or an admin issuing a new code / revoking)
 * ends that session for good — the person then needs a new code.
 *
 * Firestore:
 *   scanners/{id}            account + running scan counts (admins get an
 *                            `admin_<email>` doc the first time they scan)
 *   scanner_codes/{hmac}     lookup from an unused code's hash to its scanner
 * Neither collection has client rules, so only this server code can touch them.
 *
 * Cookie `dan_scanner` = `scannerId:sessionId:expiry:hmac` (see lib/session.ts).
 */

import crypto from "crypto";
import type { NextRequest } from "next/server";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { adminNameFor, getAdminEmail, hmacHex, verifyHmacHex } from "./session";
import type { DanTicket } from "./firestore";

export const SCANNER_COOKIE = "dan_scanner";
export const SCANNER_SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours in seconds

export type ScanActor = { id: string; name: string; kind: "staff" | "admin" };

type ScannerDoc = {
  kind: "staff" | "admin";
  name: string;
  email?: string; // admins only
  createdBy?: string;
  createdAt?: Timestamp;
  codeHash: string | null; // set while an unused code exists
  codeIssuedAt?: Timestamp | null;
  sessionId: string | null; // set while logged in
  sessionStartedAt?: Timestamp | null;
  loggedOutAt?: Timestamp | null;
  revoked: boolean;
  newCodeRequestedAt?: Timestamp | null;
  scanCount?: number; // tickets confirmed
  admittedCount?: number; // people admitted (sum of ticket quantities)
  lastScanAt?: Timestamp | null;
};

/** What the admin page sees — no hashes or session ids. Times are epoch ms. */
export type ScannerSummary = {
  id: string;
  kind: "staff" | "admin";
  name: string;
  status: "code_issued" | "logged_in" | "logged_out" | "revoked";
  scanCount: number;
  admittedCount: number;
  lastScanAt: number | null;
  createdAt: number | null;
  newCodeRequestedAt: number | null;
};

const scanners = () => adminDb().collection("scanners");
const codes = () => adminDb().collection("scanner_codes");
const millis = (t: Timestamp | null | undefined) => (t ? t.toMillis() : null);

/* ── One-time codes ──────────────────────────────────────────────────────── */

// No 0/O, 1/I/L — codes get read out loud and typed on phones
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** A fresh code like "K7M2-X9QP" (31^8 ≈ 850 billion possibilities). */
export function generateCode(): string {
  const chars = Array.from(crypto.randomBytes(8), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

/** Uppercases and strips spaces/dashes so "k7m2 x9qp" matches "K7M2-X9QP". */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function codeHash(code: string): Promise<string> {
  const hash = await hmacHex(`scanner-code:${normalizeCode(code)}`);
  if (!hash) throw new Error("SESSION_SECRET is not set");
  return hash;
}

const randomId = () => crypto.randomBytes(12).toString("hex");

/* ── Admin: manage accounts ──────────────────────────────────────────────── */

/** Adds a scanner account and returns its one-time code (shown to the admin once). */
export async function createScanner(name: string, createdBy: string): Promise<{ id: string; code: string }> {
  const id = randomId();
  const code = generateCode();
  const hash = await codeHash(code);
  await adminDb().runTransaction(async (tx) => {
    tx.set(codes().doc(hash), { scannerId: id, createdAt: FieldValue.serverTimestamp() });
    tx.set(scanners().doc(id), {
      kind: "staff",
      name,
      createdBy,
      createdAt: FieldValue.serverTimestamp(),
      codeHash: hash,
      codeIssuedAt: FieldValue.serverTimestamp(),
      sessionId: null,
      revoked: false,
      newCodeRequestedAt: null,
      scanCount: 0,
      admittedCount: 0,
      lastScanAt: null,
    });
  });
  return { id, code };
}

/**
 * Issues a new one-time code. Any old unused code stops working and any
 * logged-in session is signed out. Also un-revokes the account.
 */
export async function issueNewCode(id: string): Promise<{ code: string } | null> {
  const code = generateCode();
  const hash = await codeHash(code);
  const ok = await adminDb().runTransaction(async (tx) => {
    const ref = scanners().doc(id);
    const snap = await tx.get(ref);
    const s = snap.data() as ScannerDoc | undefined;
    if (!s || s.kind !== "staff") return false;
    if (s.codeHash) tx.delete(codes().doc(s.codeHash));
    tx.set(codes().doc(hash), { scannerId: id, createdAt: FieldValue.serverTimestamp() });
    tx.update(ref, {
      codeHash: hash,
      codeIssuedAt: FieldValue.serverTimestamp(),
      sessionId: null,
      revoked: false,
      newCodeRequestedAt: null,
    });
    return true;
  });
  return ok ? { code } : null;
}

/** Signs the account out and cancels any unused code. Scan history is kept. */
export async function revokeScanner(id: string): Promise<boolean> {
  return adminDb().runTransaction(async (tx) => {
    const ref = scanners().doc(id);
    const snap = await tx.get(ref);
    const s = snap.data() as ScannerDoc | undefined;
    if (!s || s.kind !== "staff") return false;
    if (s.codeHash) tx.delete(codes().doc(s.codeHash));
    tx.update(ref, { codeHash: null, sessionId: null, revoked: true, newCodeRequestedAt: null });
    return true;
  });
}

export async function listScanners(): Promise<ScannerSummary[]> {
  const snap = await scanners().get();
  return snap.docs
    .map((d) => {
      const s = d.data() as ScannerDoc;
      const status: ScannerSummary["status"] =
        s.kind === "admin"
          ? "logged_in"
          : s.revoked
            ? "revoked"
            : s.sessionId
              ? "logged_in"
              : s.codeHash
                ? "code_issued"
                : "logged_out";
      return {
        id: d.id,
        kind: s.kind,
        name: s.name,
        status,
        scanCount: s.scanCount ?? 0,
        admittedCount: s.admittedCount ?? 0,
        lastScanAt: millis(s.lastScanAt),
        createdAt: millis(s.createdAt),
        newCodeRequestedAt: millis(s.newCodeRequestedAt),
      };
    })
    .sort((a, b) => b.scanCount - a.scanCount || (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

/* ── Staff: log in / out ─────────────────────────────────────────────────── */

/** Exchanges a one-time code for a session. Null if the code is wrong or already used. */
export async function redeemCode(code: string): Promise<{ scannerId: string; sessionId: string; name: string } | null> {
  if (normalizeCode(code).length !== 8) return null;
  const hash = await codeHash(code);
  const sessionId = randomId();
  return adminDb().runTransaction(async (tx) => {
    const codeRef = codes().doc(hash);
    const codeSnap = await tx.get(codeRef);
    const scannerId = codeSnap.data()?.scannerId as string | undefined;
    if (!scannerId) return null;
    const ref = scanners().doc(scannerId);
    const snap = await tx.get(ref);
    const s = snap.data() as ScannerDoc | undefined;
    // The code doc is deleted here, so the same code can never be used twice
    tx.delete(codeRef);
    if (!s || s.revoked || s.codeHash !== hash) return null;
    tx.update(ref, {
      codeHash: null,
      sessionId,
      sessionStartedAt: FieldValue.serverTimestamp(),
      newCodeRequestedAt: null,
    });
    return { scannerId, sessionId, name: s.name };
  });
}

export async function createScannerSessionValue(scannerId: string, sessionId: string): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + SCANNER_SESSION_MAX_AGE;
  const payload = `${scannerId}:${sessionId}:${expiry}`;
  return `${payload}:${await hmacHex(`scanner:${payload}`)}`;
}

/** Checks the cookie's signature and expiry only (no database read). */
export async function parseScannerSessionValue(
  value: string | undefined,
): Promise<{ scannerId: string; sessionId: string } | null> {
  const parts = value?.split(":") ?? [];
  if (parts.length !== 4) return null;
  const [scannerId, sessionId, expiryStr, signature] = parts;
  const expiry = Number(expiryStr);
  if (!expiry || Date.now() / 1000 > expiry) return null;
  if (!(await verifyHmacHex(`scanner:${scannerId}:${sessionId}:${expiryStr}`, signature))) return null;
  return { scannerId, sessionId };
}

/**
 * The scanner behind this cookie, if its session is still the live one —
 * logging out, a new code or a revoke all end it immediately.
 */
export async function getScannerFromCookie(value: string | undefined): Promise<(ScanActor & { scanCount: number; admittedCount: number }) | null> {
  const parsed = await parseScannerSessionValue(value);
  if (!parsed) return null;
  const snap = await scanners().doc(parsed.scannerId).get();
  const s = snap.data() as ScannerDoc | undefined;
  if (!s || s.kind !== "staff" || s.revoked || s.sessionId !== parsed.sessionId) return null;
  return {
    id: parsed.scannerId,
    name: s.name,
    kind: "staff",
    scanCount: s.scanCount ?? 0,
    admittedCount: s.admittedCount ?? 0,
  };
}

/** Ends the session behind this cookie (if it is still the live one). */
export async function endScannerSession(value: string | undefined): Promise<string | null> {
  const parsed = await parseScannerSessionValue(value);
  if (!parsed) return null;
  await adminDb().runTransaction(async (tx) => {
    const ref = scanners().doc(parsed.scannerId);
    const snap = await tx.get(ref);
    if ((snap.data() as ScannerDoc | undefined)?.sessionId === parsed.sessionId) {
      tx.update(ref, { sessionId: null, loggedOutAt: FieldValue.serverTimestamp() });
    }
  });
  return parsed.scannerId;
}

/** Flags the account so admins see "new code requested". */
export async function requestNewCode(scannerId: string): Promise<boolean> {
  if (!/^[0-9a-f]{24}$/.test(scannerId)) return false;
  return adminDb().runTransaction(async (tx) => {
    const ref = scanners().doc(scannerId);
    const snap = await tx.get(ref);
    const s = snap.data() as ScannerDoc | undefined;
    if (!s || s.kind !== "staff" || s.revoked) return false;
    tx.update(ref, { newCodeRequestedAt: FieldValue.serverTimestamp() });
    return true;
  });
}

/** Stats doc id for an admin scanning tickets themselves. */
export function adminScannerId(email: string): string {
  return `admin_${email.toLowerCase().replace(/\//g, "_")}`;
}

/**
 * Who is scanning: a signed-in admin (they can always scan), else a staff
 * scanner with a live session. Null = not allowed.
 */
export async function getScanActor(
  req: NextRequest,
): Promise<{ actor: ScanActor; email?: string; scanCount?: number; admittedCount?: number } | null> {
  const adminEmail = await getAdminEmail(req);
  if (adminEmail) {
    return {
      actor: { id: adminScannerId(adminEmail), name: adminNameFor(adminEmail) ?? adminEmail, kind: "admin" },
      email: adminEmail,
    };
  }
  const scanner = await getScannerFromCookie(req.cookies.get(SCANNER_COOKIE)?.value);
  if (!scanner) return null;
  const { scanCount, admittedCount, ...actor } = scanner;
  return { actor, scanCount, admittedCount };
}

/* ── Gate check-in ───────────────────────────────────────────────────────── */

/** The ticket details shown at the gate — no email/phone/amount. */
export type GateTicket = Pick<DanTicket, "reference" | "name" | "eventTitle" | "quantity" | "status"> & {
  ticketType: string | null;
};

export type ScanResult =
  | { result: "confirmed"; ticket: GateTicket }
  | { result: "already"; ticket: GateTicket; confirmedBy: string | null; confirmedAt: number | null }
  | { result: "unpaid"; ticket: GateTicket }
  | { result: "not_found" };

/**
 * Admits a paid ticket and credits the scan to `actor`. A transaction, so two
 * gates scanning the same ticket at once cannot both admit it.
 */
export async function confirmTicketScan(reference: string, actor: ScanActor, actorEmail?: string): Promise<ScanResult> {
  const db = adminDb();
  return db.runTransaction(async (tx) => {
    const ticketRef = db.collection("tickets").doc(reference);
    const snap = await tx.get(ticketRef);
    if (!snap.exists) return { result: "not_found" as const };
    const t = snap.data() as DanTicket & { confirmedBy?: { name?: string } };
    const ticket: GateTicket = {
      reference,
      name: t.name,
      eventTitle: t.eventTitle,
      quantity: t.quantity,
      status: t.status,
      ticketType: t.ticketType ?? null,
    };

    if (t.status === "confirmed") {
      return {
        result: "already" as const,
        ticket,
        confirmedBy: t.confirmedBy?.name ?? null,
        confirmedAt: millis(t.confirmedAt),
      };
    }
    if (t.status !== "paid") return { result: "unpaid" as const, ticket };

    tx.update(ticketRef, {
      status: "confirmed",
      confirmedAt: FieldValue.serverTimestamp(),
      confirmedBy: actor,
    });
    tx.set(
      db.collection("scanners").doc(actor.id),
      {
        kind: actor.kind,
        name: actor.name,
        ...(actorEmail ? { email: actorEmail } : {}),
        scanCount: FieldValue.increment(1),
        admittedCount: FieldValue.increment(t.quantity ?? 1),
        lastScanAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return { result: "confirmed" as const, ticket: { ...ticket, status: "confirmed" as const } };
  });
}
