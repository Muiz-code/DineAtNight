import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createFakeFirestore } from "./fakeFirestore";

let fake: ReturnType<typeof createFakeFirestore>;
vi.mock("@/lib/firebase-admin", () => ({ adminDb: () => fake.db }));
vi.mock("@/lib/rateLimit", () => ({ checkRateLimit: vi.fn(async () => true), clientIp: () => "1.2.3.4" }));
const delivered = vi.hoisted(() => [] as string[]);
vi.mock("@/lib/ticketDelivery", () => ({ deliverPaidTicket: vi.fn(async (ref: string) => void delivered.push(ref)) }));
const afterFns = vi.hoisted(() => [] as (() => unknown)[]);
vi.mock("next/server", async (orig) => ({
  ...(await orig<typeof import("next/server")>()),
  after: (fn: () => unknown) => void afterFns.push(fn),
}));

const { POST: initialize } = await import("@/app/api/paystack/initialize/route");
const { POST: checkCoupon } = await import("@/app/api/tickets/coupon/route");

const paystackCalls: { amount: number; metadata: Record<string, unknown> }[] = [];

beforeEach(() => {
  vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_unit");
  delivered.length = 0;
  afterFns.length = 0;
  paystackCalls.length = 0;
  let n = 0;
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init: { body: string }) => {
    paystackCalls.push(JSON.parse(init.body));
    n += 1;
    return new Response(JSON.stringify({ status: true, data: { reference: `PSK${n}`, authorization_url: "https://checkout.paystack.com/x" } }));
  }));
  fake = createFakeFirestore({
    "events/ev": {
      title: "Dine at Night",
      status: "active",
      isPast: false,
      ticketPrice: 14500,
      totalTickets: 100,
      soldTickets: 0,
      minAge: 18,
      ticketTypes: [
        { name: "Night Market Pass", price: 14500 },
        { name: "VIP", price: 50000 },
      ],
    },
    "coupon_campaigns/camp": {
      name: "Naira card", eventId: "ev", eventTitle: "Dine at Night", percentOff: 100, kind: "unique",
      codeCount: 40, maxUsesTotal: 40, tiers: ["Night Market Pass"], expiresAt: null, active: true,
      redeemedCount: 0, createdAt: 0, createdBy: "a",
    },
    "coupon_codes/DANAAAA22": { code: "DAN-AAAA22", campaignId: "camp", number: 3, maxUses: 1, redeemed: 0, holds: {}, redemptions: [] },
  });
});

const order = (over: Record<string, unknown> = {}) =>
  new NextRequest("http://localhost/api/paystack/initialize", {
    method: "POST",
    body: JSON.stringify({
      eventId: "ev",
      name: "Ada Obi",
      email: "ada@example.com",
      phone: "",
      quantity: 1,
      ticketType: "Night Market Pass",
      ageRange: "25–34",
      ageConfirmed: true,
      termsAccepted: true,
      ...over,
    }),
  });

describe("checkout with a coupon code", () => {
  it("1 ticket at 100% off: issued free with no Paystack call, email sent", async () => {
    const res = await initialize(order({ couponCode: "dan-aaaa22" }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toMatchObject({ free: true, reference: expect.stringMatching(/^FREE-/) });
    expect(paystackCalls).toHaveLength(0);
    const t = fake.store.get(`tickets/${data.reference}`)!;
    expect(t).toMatchObject({ status: "paid", amount: 0, ageConfirmed: true, coupon: { code: "DAN-AAAA22", codeNumber: 3, percentOff: 100 } });
    await Promise.all(afterFns.map((f) => f()));
    expect(delivered).toEqual([data.reference]);
  });

  it("3 tickets at 100% off: Paystack charges for 2, ticket records the code", async () => {
    const res = await initialize(order({ quantity: 3, couponCode: "DAN-AAAA22" }));
    expect(await res.json()).toMatchObject({ authorization_url: expect.any(String), reference: "PSK1" });
    expect(paystackCalls[0].amount).toBe(2 * 14500 * 100);
    expect(paystackCalls[0].metadata.couponCode).toBe("DAN-AAAA22");
    expect(fake.store.get("tickets/PSK1")).toMatchObject({
      status: "pending",
      amount: 2_900_000,
      coupon: { code: "DAN-AAAA22", discountKobo: 1_450_000, fullAmountKobo: 4_350_000 },
    });
  });

  it("refuses a code for the wrong ticket type before calling Paystack", async () => {
    const res = await initialize(order({ ticketType: "VIP", couponCode: "DAN-AAAA22" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/only works for Night Market Pass/);
    expect(paystackCalls).toHaveLength(0);
  });

  it("a used code can't be claimed again", async () => {
    await initialize(order({ couponCode: "DAN-AAAA22" }));
    const res = await initialize(order({ email: "b@example.com", couponCode: "DAN-AAAA22" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/already been used/);
  });

  it("without a code nothing changes", async () => {
    await initialize(order({ quantity: 2 }));
    expect(paystackCalls[0].amount).toBe(2_900_000);
    expect(fake.store.get("tickets/PSK1")!.coupon).toBeUndefined();
  });
});

describe("POST /api/tickets/coupon (checkout Apply button)", () => {
  const check = (body: Record<string, unknown>) =>
    checkCoupon(new NextRequest("http://localhost/api/tickets/coupon", { method: "POST", body: JSON.stringify(body) }));

  it("prices the order with the code", async () => {
    const res = await check({ eventId: "ev", ticketType: "Night Market Pass", quantity: 3, code: "dan aaaa22" });
    expect(await res.json()).toEqual({ ok: true, code: "DAN-AAAA22", percentOff: 100, discountNaira: 14500, totalNaira: 29000, free: false });
  });

  it("says when the order becomes free", async () => {
    const res = await check({ eventId: "ev", ticketType: "Night Market Pass", quantity: 1, code: "DAN-AAAA22" });
    expect((await res.json()).free).toBe(true);
  });

  it("gives a plain reason for a bad code", async () => {
    const res = await check({ eventId: "ev", ticketType: "Night Market Pass", quantity: 1, code: "NOPE1234" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("That code isn't valid. Check it and try again.");
  });
});
