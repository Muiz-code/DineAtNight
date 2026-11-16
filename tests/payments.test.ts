import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeFirestore } from "./fakeFirestore";

let fake: ReturnType<typeof createFakeFirestore>;
vi.mock("@/lib/firebase-admin", () => ({ adminDb: () => fake.db }));

const { createPendingTicket, isValidReference, priceCart, quoteTicket, markTicketPaid, markMerchOrderPaid, parseGuests } = await import(
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
    expect(eventUpdate?.data.soldTickets).toBe(13);
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

describe("markTicketPaid — tickets sent to different emails", () => {
  const guests = [
    { name: "Bo", email: "bo@x.com" },
    { name: "Cy", email: "cy@x.com" },
  ];
  beforeEach(() => {
    fake = createFakeFirestore({
      "tickets/REF1": { eventId: "ev1", eventTitle: "Ev", name: "Ada", quantity: 3, amount: 3_000_000, status: "pending", ticketType: "VIP", guests },
      "events/ev1": { title: "Ev", soldTickets: 10 },
    });
  });

  it("splits the order into one paid 1× ticket per person, once", async () => {
    expect(await markTicketPaid("REF1", 3_000_000)).toBe(true);
    expect(fake.store.get("tickets/REF1")).toMatchObject({
      status: "paid",
      quantity: 1,
      orderQuantity: 3,
      amount: 3_000_000,
      guestReferences: ["REF1-2", "REF1-3"],
    });
    expect(fake.store.get("tickets/REF1-2")).toMatchObject({
      name: "Bo",
      email: "bo@x.com",
      quantity: 1,
      amount: 0, // revenue stays on the buyer's ticket
      status: "paid",
      ticketType: "VIP",
      parentReference: "REF1",
      purchasedBy: "Ada",
    });
    expect(fake.store.get("tickets/REF1-3")).toMatchObject({ name: "Cy", parentReference: "REF1" });

    // soldTickets still counts the whole order
    const eventUpdate = fake.updates.find((u) => u.path === "events/ev1");
    expect(eventUpdate?.data.soldTickets).toBe(13);

    // Webhook + redirect both firing never creates the guest tickets twice
    expect(await markTicketPaid("REF1", 3_000_000)).toBe(false);
  });
});

describe("parseGuests", () => {
  it("needs a valid name and email for every extra ticket", () => {
    expect(parseGuests([{ name: " Bo ", email: "BO@x.com" }], 2)).toEqual([{ name: "Bo", email: "bo@x.com" }]);
    expect(parseGuests([], 2)).toMatch(/each extra ticket/);
    expect(parseGuests([{ name: "B", email: "bo@x.com" }], 2)).toMatch(/name for ticket 2/);
    expect(parseGuests([{ name: "Bo", email: "nope" }], 2)).toMatch(/email for ticket 2/);
    expect(parseGuests("x", 2)).toMatch(/each extra ticket/);
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


describe("transactional ticket inventory", () => {
  const seedEvent = () => ({ title:"Event", status:"active", isPast:false, totalTickets:100, soldTickets:0, ticketPrice:10000, ticketTypes:[{ name:"Early Bird", price:10000, limit:2 }, { name:"VIP", price:50000, limit:98 }] });
  const pending = (reference: string, quantity = 1) => ({ reference, eventId:"ev", eventTitle:"Event", name:"Buyer", email:"buyer@example.com", phone:"", quantity, ticketType:"Early Bird", amount:1000000*quantity });
  beforeEach(() => { fake = createFakeFirestore({ "events/ev": seedEvent() }); });
  it("prevents competing reservations from taking the same final admission", async () => {
    fake.store.set("tickets/old", { ...pending("old"), status:"paid" });
    const results = await Promise.allSettled([createPendingTicket(pending("A")), createPendingTicket(pending("B"))]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
  });
  it("stops repeated purchases at the cumulative tier limit", async () => {
    fake.store.set("tickets/old", { ...pending("old",2), status:"paid" });
    await expect(quoteTicket("ev",1,"Early Bird")).rejects.toThrow(/sold out/);
    await expect(createPendingTicket(pending("new"))).rejects.toThrow(/sold out/);
  });
  it("reserves once, converts to paid once, and keeps totals correct", async () => {
    await createPendingTicket(pending("A",2));
    await expect(createPendingTicket(pending("B"))).rejects.toThrow(/sold out/);
    expect(await markTicketPaid("A",2000000)).toBe(true);
    expect(await markTicketPaid("A",2000000)).toBe(false);
    expect(fake.store.get("events/ev")?.soldTickets).toBe(2);
    expect(fake.store.get("tickets/A")?.reservationExpiresAt).toBe(0);
  });
  it("releases expired reservations and holds a late payment for review without QR issuance", async () => {
    fake.store.set("tickets/expired", { ...pending("expired",2), status:"pending", reservationExpiresAt:Date.now()-1, guests:[{name:"Guest",email:"guest@example.com"}] });
    await createPendingTicket(pending("new",2));
    expect(await markTicketPaid("expired",2000000)).toBe(false);
    expect(fake.store.get("tickets/expired")).toMatchObject({ status:"pending", paymentReview:true });
    expect(fake.store.has("tickets/expired-2")).toBe(false);
    expect(fake.store.get("events/ev")?.soldTickets).toBe(0);
    expect(await markTicketPaid("expired",2000000)).toBe(false);
  });
  it("accepts a late payment if the allocation is still available", async () => {
    fake.store.set("tickets/expired", { ...pending("expired"), status:"pending", reservationExpiresAt:Date.now()-1 });
    expect(await markTicketPaid("expired",1000000)).toBe(true);
    expect(fake.store.get("events/ev")?.soldTickets).toBe(1);
  });
  it("rejects stale prices before reserving any inventory", async () => {
    await expect(createPendingTicket({ ...pending("stale"), amount:1 })).rejects.toThrow(/price changed/);
    expect(fake.store.has("tickets/stale")).toBe(false);
  });
  it("enforces overall capacity independently of tier limits", async () => {
    fake.store.set("events/ev", { ...seedEvent(), totalTickets:1 });
    await createPendingTicket(pending("A"));
    await expect(createPendingTicket(pending("B"))).rejects.toThrow(/sold out/);
  });
});
