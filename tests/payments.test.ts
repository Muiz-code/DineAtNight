import { beforeEach, describe, expect, it, vi } from "vitest";
import { FieldValue } from "firebase-admin/firestore";
import { createFakeFirestore } from "./fakeFirestore";

let fake: ReturnType<typeof createFakeFirestore>;
vi.mock("@/lib/firebase-admin", () => ({ adminDb: () => fake.db }));

const { isValidReference, priceCart, quoteTicket, markTicketPaid, markMerchOrderPaid } = await import(
  "@/lib/payments"
);

describe("isValidReference", () => {
  it("accepts Paystack-style references", () => {
    expect(isValidReference("T8FJ2K4L9Q")).toBe(true);
    expect(isValidReference("ref_abc-123.x")).toBe(true);
  });
  it("rejects path tricks, empties, overlong and non-strings", () => {
    expect(isValidReference("../customer")).toBe(false);
    expect(isValidReference("a/b")).toBe(false);
    expect(isValidReference("")).toBe(false);
    expect(isValidReference("x".repeat(101))).toBe(false);
    expect(isValidReference(123)).toBe(false);
    expect(isValidReference(null)).toBe(false);
  });
});

describe("priceCart (merch)", () => {
  beforeEach(() => {
    fake = createFakeFirestore({
      "products/tee": { name: "Tee", price: 15000, stock: 10, soldCount: 7 },
      "products/cap": { name: "Cap", price: 8000, stock: -1, soldCount: 0 },
      "products/old": { name: "Old", price: 5000, stock: -1, active: false },
    });
  });

  it("prices from the database, ignoring any client-sent price/name", async () => {
    const cart = [{ productId: "cap", qty: 2, price: 1, productName: "Free cap" }];
    const { items, total } = await priceCart(cart);
    expect(items).toEqual([{ productId: "cap", productName: "Cap", price: 8000, qty: 2 }]);
    expect(total).toBe(16000);
  });

  it("merges duplicate lines", async () => {
    const { items, total } = await priceCart([
      { productId: "cap", qty: 1 },
      { productId: "cap", qty: 2 },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].qty).toBe(3);
    expect(total).toBe(24000);
  });

  it.each([[-2], [0], [1.5], [51], ["abc"]])("rejects quantity %s", async (qty) => {
    await expect(priceCart([{ productId: "cap", qty }])).rejects.toThrow(/quantity/i);
  });

  it("rejects a negative line used to discount another", async () => {
    await expect(
      priceCart([
        { productId: "tee", qty: 3 },
        { productId: "cap", qty: -2 },
      ]),
    ).rejects.toThrow(/quantity/i);
  });

  it("enforces stock", async () => {
    await expect(priceCart([{ productId: "tee", qty: 4 }])).rejects.toThrow(/Only 3 units/);
  });

  it("rejects unknown, inactive and malformed products", async () => {
    await expect(priceCart([{ productId: "nope", qty: 1 }])).rejects.toThrow(/not found/);
    await expect(priceCart([{ productId: "old", qty: 1 }])).rejects.toThrow(/no longer available/);
    await expect(priceCart([{ productId: "a/b", qty: 1 }])).rejects.toThrow(/Invalid product/);
    await expect(priceCart([])).rejects.toThrow(/empty/);
  });
});

describe("quoteTicket", () => {
  beforeEach(() => {
    fake = createFakeFirestore({
      "events/single": { title: "Single", status: "active", isPast: false, ticketPrice: 10000, totalTickets: 100, soldTickets: 98 },
      "events/tiers": {
        title: "Tiers",
        status: "active",
        isPast: false,
        ticketPrice: 5000,
        ticketTypes: [
          { name: "Regular", price: 5000 },
          { name: "VIP", price: 20000, limit: 2 },
        ],
        totalTickets: 0,
        soldTickets: 0,
      },
      "events/draft": { title: "Draft", status: "draft", isPast: false, ticketPrice: 10000, totalTickets: 0, soldTickets: 0 },
    });
  });

  it("uses the event's price, not the client's", async () => {
    const q = await quoteTicket("single", 1);
    expect(q.unitPrice).toBe(10000);
    expect(q.eventTitle).toBe("Single");
  });

  it("uses the selected tier's price", async () => {
    expect((await quoteTicket("tiers", 1, "VIP")).unitPrice).toBe(20000);
  });

  it("requires a valid tier when the event has tiers", async () => {
    await expect(quoteTicket("tiers", 1)).rejects.toThrow(/ticket type/);
    await expect(quoteTicket("tiers", 1, "Backstage")).rejects.toThrow(/ticket type/);
  });

  it("enforces capacity and tier limits", async () => {
    await expect(quoteTicket("single", 3)).rejects.toThrow(/Only 2 tickets left/);
    await expect(quoteTicket("tiers", 3, "VIP")).rejects.toThrow(/Only 2 tickets left/);
  });

  it("rejects missing and not-on-sale events", async () => {
    await expect(quoteTicket("missing", 1)).rejects.toThrow(/not found/);
    await expect(quoteTicket("draft", 1)).rejects.toThrow(/not on sale/);
  });
});

describe("markTicketPaid", () => {
  beforeEach(() => {
    fake = createFakeFirestore({
      "tickets/REF1": { eventId: "ev1", quantity: 3, amount: 3_000_000, status: "pending" },
      "events/ev1": { title: "Ev", soldTickets: 10 },
    });
  });

  it("rejects an underpayment and leaves the ticket pending", async () => {
    await expect(markTicketPaid("REF1", 100)).rejects.toThrow(/Amount mismatch/);
    expect(fake.store.get("tickets/REF1")?.status).toBe("pending");
    expect(fake.updates).toHaveLength(0);
  });

  it("marks paid once and increments soldTickets by the stored quantity", async () => {
    expect(await markTicketPaid("REF1", 3_000_000)).toBe(true);
    expect(fake.store.get("tickets/REF1")?.status).toBe("paid");
    const eventUpdate = fake.updates.find((u) => u.path === "events/ev1");
    expect((eventUpdate?.data.soldTickets as FieldValue).isEqual(FieldValue.increment(3))).toBe(true);
  });

  it("is idempotent (webhook + redirect both firing)", async () => {
    await markTicketPaid("REF1", 3_000_000);
    expect(await markTicketPaid("REF1", 3_000_000)).toBe(false);
    expect(fake.updates.filter((u) => u.path === "events/ev1")).toHaveLength(1);
  });

  it("throws for an unknown reference", async () => {
    await expect(markTicketPaid("NOPE", 1)).rejects.toThrow(/not found/);
  });
});

describe("markMerchOrderPaid", () => {
  beforeEach(() => {
    fake = createFakeFirestore({
      "merch_orders/M1": {
        total: 23000, // naira
        status: "pending",
        items: [
          { productId: "tee", productName: "Tee", price: 15000, qty: 1 },
          { productId: "cap", productName: "Cap", price: 8000, qty: 1 },
        ],
      },
      "products/tee": { soldCount: 0 },
      "products/cap": { soldCount: 0 },
    });
  });

  it("rejects an underpayment", async () => {
    await expect(markMerchOrderPaid("M1", 2_299_999)).rejects.toThrow(/Amount mismatch/);
    expect(fake.store.get("merch_orders/M1")?.status).toBe("pending");
  });

  it("marks paid once and increments each product's soldCount", async () => {
    expect(await markMerchOrderPaid("M1", 2_300_000)).toBe(true);
    expect(await markMerchOrderPaid("M1", 2_300_000)).toBe(false);
    expect(fake.updates.filter((u) => u.path.startsWith("products/")).map((u) => u.path).sort()).toEqual([
      "products/cap",
      "products/tee",
    ]);
  });
});
