import { beforeEach, describe, expect, it, vi } from "vitest";
import { FieldValue } from "firebase-admin/firestore";
import { createFakeFirestore } from "./fakeFirestore";

let fake: ReturnType<typeof createFakeFirestore>;
vi.mock("@/lib/firebase-admin", () => ({ adminDb: () => fake.db }));

const {
  createScanner,
  redeemCode,
  createScannerSessionValue,
  parseScannerSessionValue,
  getScannerFromCookie,
  endScannerSession,
  issueNewCode,
  revokeScanner,
  requestNewCode,
  listScanners,
  confirmTicketScan,
  generateCode,
  normalizeCode,
} = await import("@/lib/scanners");

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", "unit-test-secret");
  fake = createFakeFirestore({
    "tickets/PAID1": { name: "Ada", eventTitle: "DAN 2026", quantity: 3, status: "paid", email: "a@x.com" },
    "tickets/PEND1": { name: "Bo", eventTitle: "DAN 2026", quantity: 1, status: "pending" },
  });
});

/** Logs a new scanner in and returns its cookie value. */
async function loggedInScanner(name = "Tunde") {
  const { id, code } = await createScanner(name, "Admin");
  const session = await redeemCode(code);
  return { id, code, cookie: await createScannerSessionValue(session!.scannerId, session!.sessionId) };
}

describe("one-time codes", () => {
  it("generates readable XXXX-XXXX codes without look-alike characters", () => {
    for (let i = 0; i < 50; i++) expect(generateCode()).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
  });

  it("normalises case, spaces and dashes", () => {
    expect(normalizeCode(" k7m2 x9-qp ")).toBe("K7M2X9QP");
  });

  it("works exactly once", async () => {
    const { code } = await createScanner("Tunde", "Admin");
    expect(await redeemCode(code)).toMatchObject({ name: "Tunde" });
    expect(await redeemCode(code)).toBeNull();
  });

  it("accepts the code typed in lower case without the dash", async () => {
    const { code } = await createScanner("Tunde", "Admin");
    expect(await redeemCode(code.toLowerCase().replace("-", ""))).not.toBeNull();
  });

  it("rejects unknown codes", async () => {
    await createScanner("Tunde", "Admin");
    expect(await redeemCode("AAAA-AAAA")).toBeNull();
    expect(await redeemCode("short")).toBeNull();
  });

  it("stops the old code working when a new one is issued", async () => {
    const { id, code } = await createScanner("Tunde", "Admin");
    const fresh = await issueNewCode(id);
    expect(await redeemCode(code)).toBeNull();
    expect(await redeemCode(fresh!.code)).not.toBeNull();
  });

  it("never stores the code itself", async () => {
    const { code } = await createScanner("Tunde", "Admin");
    expect(JSON.stringify([...fake.store.entries()])).not.toContain(normalizeCode(code));
    expect(JSON.stringify([...fake.store.entries()])).not.toContain(code);
  });
});

describe("scanner sessions", () => {
  it("accepts a live session", async () => {
    const { cookie } = await loggedInScanner();
    expect(await getScannerFromCookie(cookie)).toMatchObject({ name: "Tunde", kind: "staff" });
  });

  it("rejects a tampered or expired cookie", async () => {
    const { cookie } = await loggedInScanner();
    const [id, sid, exp, sig] = cookie.split(":");
    expect(await parseScannerSessionValue(`${id}:${sid}:${Number(exp) + 999}:${sig}`)).toBeNull();
    expect(await parseScannerSessionValue(`${id}:other:${exp}:${sig}`)).toBeNull();

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000);
    expect(await parseScannerSessionValue(cookie)).toBeNull();
    vi.useRealTimers();
  });

  it("ends for good on logout", async () => {
    const { cookie } = await loggedInScanner();
    await endScannerSession(cookie);
    expect(await getScannerFromCookie(cookie)).toBeNull();
  });

  it("ends when an admin issues a new code or revokes", async () => {
    const a = await loggedInScanner("A");
    await issueNewCode(a.id);
    expect(await getScannerFromCookie(a.cookie)).toBeNull();

    const b = await loggedInScanner("B");
    await revokeScanner(b.id);
    expect(await getScannerFromCookie(b.cookie)).toBeNull();
  });

  it("lets a logged-out scanner request a new code", async () => {
    const { id, cookie } = await loggedInScanner();
    await endScannerSession(cookie);
    expect(await requestNewCode(id)).toBe(true);
    const [s] = await listScanners();
    expect(s.status).toBe("logged_out");
    expect(fake.updates.at(-1)?.data.newCodeRequestedAt).toBeInstanceOf(FieldValue);
  });
});

describe("confirmTicketScan", () => {
  const staff = { id: "s1", name: "Tunde", kind: "staff" as const };

  it("admits a paid ticket and credits the scanner", async () => {
    const res = await confirmTicketScan("PAID1", staff);
    expect(res).toMatchObject({ result: "confirmed", ticket: { name: "Ada", quantity: 3 } });
    expect(fake.store.get("tickets/PAID1")).toMatchObject({ status: "confirmed", confirmedBy: staff });

    const stats = fake.updates.find((u) => u.path === "scanners/s1")!.data;
    expect(stats.scanCount).toEqual(FieldValue.increment(1));
    expect(stats.admittedCount).toEqual(FieldValue.increment(3));
  });

  it("refuses a second scan and says who scanned it first", async () => {
    await confirmTicketScan("PAID1", staff);
    const res = await confirmTicketScan("PAID1", { id: "admin_x", name: "Tami", kind: "admin" });
    expect(res).toMatchObject({ result: "already", confirmedBy: "Tunde" });
  });

  it("refuses unpaid and unknown tickets", async () => {
    expect(await confirmTicketScan("PEND1", staff)).toMatchObject({ result: "unpaid" });
    expect(await confirmTicketScan("NOPE", staff)).toEqual({ result: "not_found" });
  });

  it("never exposes the buyer's email or amount at the gate", async () => {
    const res = await confirmTicketScan("PAID1", staff);
    expect(JSON.stringify(res)).not.toContain("a@x.com");
  });
});
