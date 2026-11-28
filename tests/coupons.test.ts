import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeFirestore } from "./fakeFirestore";
import { couponDiscountKobo, couponKey, couponProblem, ticketOrderAmountKobo, usesLeft, type CouponCampaign, type CouponCodeDoc } from "@/lib/coupons";

let fake: ReturnType<typeof createFakeFirestore>;
vi.mock("@/lib/firebase-admin", () => ({ adminDb: () => fake.db }));

const { createPendingTicket, issueFreeTicket, markTicketPaid, quoteTicketCoupon } = await import("@/lib/payments");
const { createCouponCampaign } = await import("@/lib/couponAdmin");

const HOUR = 60 * 60 * 1000;

const campaign = (over: Partial<CouponCampaign> = {}): CouponCampaign => ({
  name: "Naira card",
  eventId: "ev",
  eventTitle: "Dine at Night",
  percentOff: 100,
  kind: "unique",
  codeCount: 40,
  maxUsesTotal: 40,
  tiers: [],
  expiresAt: null,
  active: true,
  redeemedCount: 0,
  createdAt: 0,
  createdBy: "admin@x.com",
  ...over,
});
const code = (over: Partial<CouponCodeDoc> = {}): CouponCodeDoc => ({
  code: "DAN-AAAA22",
  campaignId: "camp",
  number: 17,
  maxUses: 1,
  redeemed: 0,
  holds: {},
  redemptions: [],
  ...over,
});

function seed(opts: { campaign?: Partial<CouponCampaign>; code?: Partial<CouponCodeDoc> } = {}) {
  fake = createFakeFirestore({
    "events/ev": {
      title: "Dine at Night",
      status: "active",
      isPast: false,
      ticketPrice: 5000,
      totalTickets: 100,
      soldTickets: 0,
      ticketTypes: [
        { name: "Night Market Pass", price: 5000 },
        { name: "VIP", price: 50000 },
      ],
    },
    "coupon_campaigns/camp": campaign(opts.campaign) as unknown as Record<string, unknown>,
    "coupon_codes/DANAAAA22": code(opts.code) as unknown as Record<string, unknown>,
  });
}
const get = (path: string) => fake.store.get(path) as Record<string, unknown> & Record<string, never>;

const buyer = {
  eventId: "ev",
  eventTitle: "Dine at Night",
  name: "Ada Obi",
  email: "ada@example.com",
  phone: "",
  ageRange: "25–34",
  termsAccepted: true,
  marketingConsent: false,
  ticketType: "Night Market Pass",
};

describe("coupon pricing — the percentage comes off ONE ticket", () => {
  it("3 × ₦5,000 with 100% off is ₦10,000 (3 tickets issued)", () => {
    expect(ticketOrderAmountKobo(5000, 3, 100)).toBe(1_000_000);
  });
  it("3 × ₦5,000 with 50% off is ₦12,500", () => {
    expect(ticketOrderAmountKobo(5000, 3, 50)).toBe(1_250_000);
  });
  it("1 × ₦5,000 with 100% off is free", () => {
    expect(ticketOrderAmountKobo(5000, 1, 100)).toBe(0);
  });
  it("rounds odd percentages to the kobo", () => {
    expect(couponDiscountKobo(14500, 33)).toBe(478_500);
    expect(ticketOrderAmountKobo(14500, 1, 33)).toBe(971_500);
  });
  it("without a code it's the full price", () => {
    expect(ticketOrderAmountKobo(17000, 2)).toBe(3_400_000);
  });
});

describe("couponKey", () => {
  it("ignores case, spaces and dashes", () => {
    expect(couponKey(" dan-aaaa22 ")).toBe("DANAAAA22");
    expect(couponKey("DAN AAAA 22")).toBe("DANAAAA22");
    expect(couponKey(42)).toBe("");
  });
});

describe("couponProblem", () => {
  const ctx = { eventId: "ev", ticketType: "Night Market Pass", now: Date.now() };
  it("accepts a valid, unused code", () => {
    expect(couponProblem(campaign(), code(), ctx)).toBeNull();
  });
  it("rejects unknown, paused, expired, other-event and used codes in plain words", () => {
    expect(couponProblem(null, null, ctx)).toMatch(/isn't valid/);
    expect(couponProblem(campaign({ active: false }), code(), ctx)).toMatch(/no longer active/);
    expect(couponProblem(campaign({ expiresAt: ctx.now - 1 }), code(), ctx)).toMatch(/expired/);
    expect(couponProblem(campaign({ eventId: "other" }), code(), ctx)).toMatch(/this event/);
    expect(couponProblem(campaign(), code({ redeemed: 1 }), ctx)).toMatch(/already been used/);
    expect(couponProblem(campaign(), code({ maxUses: 5, redeemed: 5 }), ctx)).toMatch(/reached its limit/);
  });
  it("limits a code to chosen ticket types", () => {
    expect(couponProblem(campaign({ tiers: ["Night Market Pass"] }), code(), { ...ctx, ticketType: "VIP" })).toMatch(/only works for Night Market Pass/);
    expect(couponProblem(campaign({ tiers: ["Night Market Pass"] }), code(), ctx)).toBeNull();
  });
  it("counts live checkout holds but not lapsed ones", () => {
    expect(usesLeft(code({ holds: { R1: ctx.now + 1000 } }), ctx.now)).toBe(0);
    expect(usesLeft(code({ holds: { R1: ctx.now - 1000 } }), ctx.now)).toBe(1);
    expect(usesLeft(code({ holds: { R1: ctx.now + 1000 } }), ctx.now, "R1")).toBe(1); // its own hold
  });
});

describe("free ticket (order comes to ₦0)", () => {
  beforeEach(() => seed());

  it("issues a paid ₦0 ticket that records the code, its number and the % off", async () => {
    const ref = await issueFreeTicket({ ...buyer, quantity: 1 }, "dan-aaaa22");
    const t = get(`tickets/${ref}`);
    expect(ref).toMatch(/^FREE-[0-9A-F]{12}$/);
    expect(t.status).toBe("paid");
    expect(t.amount).toBe(0);
    expect(t.coupon).toEqual({
      campaignId: "camp",
      campaignName: "Naira card",
      code: "DAN-AAAA22",
      codeNumber: 17,
      codeCount: 40,
      percentOff: 100,
      discountKobo: 500_000,
      fullAmountKobo: 500_000,
    });
    const c = get("coupon_codes/DANAAAA22");
    expect(c.redeemed).toBe(1);
    expect(c.redemptions).toEqual([expect.objectContaining({ reference: ref, email: "ada@example.com", free: true })]);
    expect(get("coupon_campaigns/camp").redeemedCount).toBe(1);
    expect(get("events/ev").soldTickets).toBe(1);
  });

  it("works exactly once — the second claim is refused", async () => {
    await issueFreeTicket({ ...buyer, quantity: 1 }, "DAN-AAAA22");
    await expect(issueFreeTicket({ ...buyer, email: "b@example.com", quantity: 1 }, "DAN-AAAA22")).rejects.toThrow(/already been used/);
  });

  it("only one of two simultaneous claims of the last use wins", async () => {
    const results = await Promise.allSettled([
      issueFreeTicket({ ...buyer, quantity: 1 }, "DAN-AAAA22"),
      issueFreeTicket({ ...buyer, email: "b@example.com", quantity: 1 }, "DAN-AAAA22"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(get("coupon_codes/DANAAAA22").redeemed).toBe(1);
  });

  it("refuses when the code doesn't cover the whole order", async () => {
    await expect(issueFreeTicket({ ...buyer, quantity: 2 }, "DAN-AAAA22")).rejects.toThrow(/needs a payment/);
    seed({ campaign: { percentOff: 50 } });
    await expect(issueFreeTicket({ ...buyer, quantity: 1 }, "DAN-AAAA22")).rejects.toThrow(/needs a payment/);
    expect(get("coupon_codes/DANAAAA22").redeemed).toBe(0);
  });

  it("refuses a ticket type the code isn't for", async () => {
    seed({ campaign: { tiers: ["Night Market Pass"] } });
    await expect(issueFreeTicket({ ...buyer, ticketType: "VIP", quantity: 1 }, "DAN-AAAA22")).rejects.toThrow(/only works for/);
  });

  it("a shared code stops at its use limit", async () => {
    seed({ campaign: { kind: "shared", codeCount: 1, maxUsesTotal: 2 }, code: { code: "DAN-AAAA22", maxUses: 2, number: 1 } });
    await issueFreeTicket({ ...buyer, quantity: 1 }, "DANAAAA22");
    await issueFreeTicket({ ...buyer, email: "b@example.com", quantity: 1 }, "DANAAAA22");
    await expect(issueFreeTicket({ ...buyer, email: "c@example.com", quantity: 1 }, "DANAAAA22")).rejects.toThrow(/reached its limit/);
  });
});

describe("discounted order through Paystack", () => {
  beforeEach(() => seed({ campaign: { percentOff: 100 } }));

  it("previews 3 tickets with a 100% code as ₦10,000", async () => {
    const q = await quoteTicketCoupon("ev", 3, "Night Market Pass", "dan-aaaa22");
    expect(q).toMatchObject({ code: "DAN-AAAA22", percentOff: 100, discountKobo: 500_000, amountKobo: 1_000_000 });
  });

  it("holds the code during checkout, records it on the ticket and redeems it on payment", async () => {
    await createPendingTicket({ ...buyer, quantity: 3, amount: 1_000_000, reference: "PAY1" }, "DAN-AAAA22");
    expect(get("tickets/PAY1").coupon).toMatchObject({ code: "DAN-AAAA22", codeNumber: 17, percentOff: 100, discountKobo: 500_000, fullAmountKobo: 1_500_000 });
    expect(Object.keys(get("coupon_codes/DANAAAA22").holds)).toEqual(["PAY1"]);
    // While held, nobody else can use it
    await expect(quoteTicketCoupon("ev", 1, "Night Market Pass", "DAN-AAAA22")).rejects.toThrow(/already been used/);

    expect(await markTicketPaid("PAY1", 1_000_000)).toBe(true);
    const c = get("coupon_codes/DANAAAA22");
    expect(c.redeemed).toBe(1);
    expect(c.holds).toEqual({});
    expect(c.redemptions).toEqual([expect.objectContaining({ reference: "PAY1", free: false })]);
    expect(get("tickets/PAY1").status).toBe("paid");
    // Paid again (webhook + verify both arrive): redeemed only once
    expect(await markTicketPaid("PAY1", 1_000_000)).toBe(false);
    expect(get("coupon_codes/DANAAAA22").redeemed).toBe(1);
  });

  it("rejects a checkout whose amount ignores the discount", async () => {
    await expect(createPendingTicket({ ...buyer, quantity: 3, amount: 1_500_000, reference: "PAY2" }, "DAN-AAAA22")).rejects.toThrow(/price changed/);
    await expect(createPendingTicket({ ...buyer, quantity: 3, amount: 500_000, reference: "PAY3" }, "DAN-AAAA22")).rejects.toThrow(/price changed/);
  });

  it("won't send a ₦0 order to Paystack", async () => {
    await expect(createPendingTicket({ ...buyer, quantity: 1, amount: 0, reference: "PAY4" }, "DAN-AAAA22")).rejects.toThrow(/free/);
  });

  it("a payment after the hold lapsed, when someone else used the code meanwhile, goes to review", async () => {
    seed({ campaign: { percentOff: 50 } });
    await createPendingTicket({ ...buyer, quantity: 1, amount: 250_000, reference: "LATE" }, "DAN-AAAA22");
    // Hold lapses; someone else redeems the code
    fake.store.get("tickets/LATE")!.reservationExpiresAt = Date.now() - HOUR;
    fake.store.get("coupon_codes/DANAAAA22")!.holds = {};
    fake.store.get("coupon_codes/DANAAAA22")!.redeemed = 1;
    expect(await markTicketPaid("LATE", 250_000)).toBe(false);
    expect(get("tickets/LATE").paymentReview).toBe(true);
    expect(get("tickets/LATE").paymentReviewReason).toMatch(/DAN-AAAA22 had already been used/);
    expect(get("coupon_codes/DANAAAA22").redeemed).toBe(1);
  });

  it("a payment after the hold lapsed still issues if the code is unused", async () => {
    seed({ campaign: { percentOff: 50 } });
    await createPendingTicket({ ...buyer, quantity: 1, amount: 250_000, reference: "LATE2" }, "DAN-AAAA22");
    fake.store.get("tickets/LATE2")!.reservationExpiresAt = Date.now() - HOUR;
    fake.store.get("coupon_codes/DANAAAA22")!.holds = { LATE2: Date.now() - HOUR };
    expect(await markTicketPaid("LATE2", 250_000)).toBe(true);
    expect(get("coupon_codes/DANAAAA22").redeemed).toBe(1);
  });
});

describe("createCouponCampaign", () => {
  beforeEach(() => seed());

  it("creates N unique numbered codes", async () => {
    const c = await createCouponCampaign({ name: "Naira card", eventId: "ev", percentOff: 100, kind: "unique", codeCount: 40, tiers: ["Night Market Pass"], expiresAt: null }, "admin@x.com");
    const codes = [...fake.store.entries()].filter(([p, d]) => p.startsWith("coupon_codes/") && d.campaignId === c.id).map(([, d]) => d);
    expect(codes).toHaveLength(40);
    expect(new Set(codes.map((d) => d.code)).size).toBe(40);
    expect(codes.map((d) => d.number).sort((a, b) => Number(a) - Number(b))).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    expect(codes.every((d) => /^DAN-[A-HJKMNP-Z2-9]{6}$/.test(String(d.code)) && d.maxUses === 1)).toBe(true);
  });

  it("validates the inputs in plain language", async () => {
    const base = { name: "X campaign", eventId: "ev", percentOff: 100, kind: "unique", codeCount: 5 };
    await expect(createCouponCampaign({ ...base, percentOff: 0 }, "a")).rejects.toThrow(/1 to 100/);
    await expect(createCouponCampaign({ ...base, percentOff: 12.5 }, "a")).rejects.toThrow(/whole number/);
    await expect(createCouponCampaign({ ...base, codeCount: 401 }, "a")).rejects.toThrow(/1 to 400/);
    await expect(createCouponCampaign({ ...base, tiers: ["Gold"] }, "a")).rejects.toThrow(/ticket types/);
    await expect(createCouponCampaign({ ...base, expiresAt: Date.now() - 1 }, "a")).rejects.toThrow(/future/);
    await expect(createCouponCampaign({ ...base, eventId: "nope" }, "a")).rejects.toThrow(/no longer exists/);
  });

  it("refuses a shared code that's already taken", async () => {
    await expect(createCouponCampaign({ name: "Shared", eventId: "ev", percentOff: 20, kind: "shared", sharedCode: "dan-aaaa22", maxUses: 10 }, "a")).rejects.toThrow(/already used/);
  });
});
