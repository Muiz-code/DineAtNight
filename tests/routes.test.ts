import { beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";
import { NextRequest } from "next/server";

// ── Mocks ───────────────────────────────────────────────────────────────────
const payments = vi.hoisted(() => ({
  markTicketPaid: vi.fn(),
  markMerchOrderPaid: vi.fn(),
}));
vi.mock("@/lib/payments", async (orig) => ({
  ...(await orig<typeof import("@/lib/payments")>()),
  ...payments,
}));

const afterFns = vi.hoisted(() => [] as (() => unknown)[]);
vi.mock("next/server", async (orig) => ({
  ...(await orig<typeof import("next/server")>()),
  after: (fn: () => unknown) => void afterFns.push(fn),
}));
vi.mock("@/lib/checkin", () => ({ pushTicketToCheckin: vi.fn() }));

const fbAdmin = vi.hoisted(() => ({
  verifyFirebaseIdToken: vi.fn(),
  setAdminClaim: vi.fn(),
  setDisplayName: vi.fn(),
  adminDb: vi.fn(),
}));
vi.mock("@/lib/firebase-admin", () => fbAdmin);

const { POST: webhook } = await import("@/app/api/paystack/webhook/route");
const { POST: sessionLogin } = await import("@/app/api/admin/session/route");
const { verifySessionValue } = await import("@/lib/session");

beforeEach(() => {
  vi.clearAllMocks();
  fbAdmin.setAdminClaim.mockResolvedValue(undefined);
  fbAdmin.setDisplayName.mockResolvedValue(undefined);
  afterFns.length = 0;
  vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_unit");
});

// ── Paystack webhook ────────────────────────────────────────────────────────
function webhookRequest(body: object, signature?: string) {
  const raw = JSON.stringify(body);
  const sig = signature ?? crypto.createHmac("sha512", "sk_test_unit").update(raw).digest("hex");
  return new NextRequest("http://localhost/api/paystack/webhook", {
    method: "POST",
    body: raw,
    headers: { "x-paystack-signature": sig },
  });
}
const ticketCharge = {
  event: "charge.success",
  data: { reference: "REF1", amount: 3_000_000, metadata: { eventId: "ev1", quantity: 3 } },
};

describe("POST /api/paystack/webhook", () => {
  it("rejects a forged signature with 401", async () => {
    const res = await webhook(webhookRequest(ticketCharge, "f".repeat(128)));
    expect(res.status).toBe(401);
    expect(payments.markTicketPaid).not.toHaveBeenCalled();
  });

  it("rejects a wrong-length or missing signature with 401 (not a crash)", async () => {
    expect((await webhook(webhookRequest(ticketCharge, "short"))).status).toBe(401);
    expect((await webhook(webhookRequest(ticketCharge, ""))).status).toBe(401);
  });

  it("marks a ticket paid using the amount Paystack charged, and forwards it once", async () => {
    payments.markTicketPaid.mockResolvedValue(true);
    const res = await webhook(webhookRequest(ticketCharge));
    expect(res.status).toBe(200);
    expect(payments.markTicketPaid).toHaveBeenCalledWith("REF1", 3_000_000);
    expect(afterFns).toHaveLength(1);
  });

  it("does not forward again when the ticket was already paid", async () => {
    payments.markTicketPaid.mockResolvedValue(false);
    await webhook(webhookRequest(ticketCharge));
    expect(afterFns).toHaveLength(0);
  });

  it("routes merch payments to markMerchOrderPaid", async () => {
    payments.markMerchOrderPaid.mockResolvedValue(true);
    const body = { event: "charge.success", data: { reference: "M1", amount: 2_300_000, metadata: { items: [] } } };
    expect((await webhook(webhookRequest(body))).status).toBe(200);
    expect(payments.markMerchOrderPaid).toHaveBeenCalledWith("M1", 2_300_000);
  });

  it("returns 500 so Paystack retries when marking paid fails", async () => {
    payments.markTicketPaid.mockRejectedValue(new Error("Amount mismatch"));
    expect((await webhook(webhookRequest(ticketCharge))).status).toBe(500);
  });

  it("ignores other events and invalid references", async () => {
    expect((await webhook(webhookRequest({ event: "transfer.success", data: {} }))).status).toBe(200);
    const badRef = { ...ticketCharge, data: { ...ticketCharge.data, reference: "../x" } };
    expect((await webhook(webhookRequest(badRef))).status).toBe(200);
    expect(payments.markTicketPaid).not.toHaveBeenCalled();
  });
});

// ── Admin login ─────────────────────────────────────────────────────────────
function loginRequest(idToken: unknown = "token") {
  return new NextRequest("http://localhost/api/admin/session", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}

describe("POST /api/admin/session", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", "test-secret-that-is-long-enough-123456");
    vi.stubEnv("ADMIN_EMAILS", "Tami Bolu <tami@dineatnight.com>");
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT", "{}");
  });

  it("names missing configuration", async () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    const res = await sessionLogin(loginRequest());
    expect(res.status).toBe(500);
    expect((await res.json()).missing).toContain("ADMIN_EMAILS");
  });

  it("rejects an invalid Firebase token", async () => {
    fbAdmin.verifyFirebaseIdToken.mockResolvedValue(null);
    expect((await sessionLogin(loginRequest())).status).toBe(401);
  });

  it("rejects a non-admin and revokes a leftover admin claim", async () => {
    fbAdmin.verifyFirebaseIdToken.mockResolvedValue({ uid: "u2", email: "ex@dineatnight.com", name: null, isAdminClaim: true });
    const res = await sessionLogin(loginRequest());
    expect(res.status).toBe(403);
    expect(fbAdmin.setAdminClaim).toHaveBeenCalledWith("u2", false);
    expect(res.cookies.get("dan_admin")).toBeUndefined();
  });

  it("grants the admin claim, syncs the name, and sets a valid cookie", async () => {
    fbAdmin.verifyFirebaseIdToken.mockResolvedValue({ uid: "u1", email: "Tami@DineAtNight.com", name: null, isAdminClaim: false });
    const res = await sessionLogin(loginRequest());
    expect(res.status).toBe(200);
    expect((await res.json()).refreshToken).toBe(true);
    expect(fbAdmin.setAdminClaim).toHaveBeenCalledWith("u1", true);
    expect(fbAdmin.setDisplayName).toHaveBeenCalledWith("u1", "Tami Bolu");
    const cookie = res.cookies.get("dan_admin");
    expect(cookie?.httpOnly).toBe(true);
    expect(await verifySessionValue(cookie?.value)).toBe("tami@dineatnight.com");
  });

  it("does not ask for a token refresh when nothing changed", async () => {
    fbAdmin.verifyFirebaseIdToken.mockResolvedValue({ uid: "u1", email: "tami@dineatnight.com", name: "Tami Bolu", isAdminClaim: true });
    const res = await sessionLogin(loginRequest());
    expect((await res.json()).refreshToken).toBe(false);
    expect(fbAdmin.setAdminClaim).not.toHaveBeenCalled();
  });
});
