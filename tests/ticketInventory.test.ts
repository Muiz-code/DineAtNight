import { describe, expect, it } from "vitest";
import { ticketAvailability, groupTicketOrders } from "@/lib/ticketInventory";
import type { DanEvent, DanTicket } from "@/lib/firestore";
const event = { totalTickets: 1090, soldTickets: 0, ticketTypes: [{ name: "Early Bird", price: 10000, limit: 30 }, { name: "VIP", price: 50000, limit: 100 }] } as DanEvent;
const ticket = (data: Partial<DanTicket>) => ({ eventId: "ev", reference: "R", status: "paid", quantity: 1, amount: 1000000, ticketType: "Early Bird", ...data } as DanTicket);
describe("inventory and order presentation", () => {
  it("blocks early bird after cumulative sales exceed its allocation", () => {
    const inventory = ticketAvailability(event, [ticket({ quantity: 33 })], 100);
    expect(inventory.tiers[0]).toMatchObject({ sold: 33, available: 0, overAllocation: 3 });
    expect(inventory.tiers[1].available).toBe(100);
  });
  it("counts only live pending reservations and excludes review payments", () => {
    const rows = [ticket({ quantity: 25 }), ticket({ reference: "held", quantity: 3, status: "pending", reservationExpiresAt: 200 }), ticket({ reference: "expired", quantity: 10, status: "pending", reservationExpiresAt: 99 }), ticket({ reference: "review", quantity: 10, status: "pending", paymentReview: true, reservationExpiresAt: 200 })];
    expect(ticketAvailability(event, rows, 100).tiers[0]).toMatchObject({ sold:25, reserved:3, available:2 });
    expect(ticketAvailability(event, rows, 200).tiers[0]).toMatchObject({ reserved:0, available:5 });
  });
  it("distinguishes orders, QR codes, admissions and payment totals", () => {
    const rows = [ticket({ reference: "buyer", quantity:1, orderQuantity:2, guestReferences:["guest"], amount:2000000 }), ticket({ reference:"guest", parentReference:"buyer", amount:0, status:"confirmed" }), ticket({ reference:"group", quantity:4, amount:4000000 })];
    const orders = groupTicketOrders(rows);
    expect(orders).toHaveLength(2);
    expect(orders[0]).toMatchObject({ quantity:2, checkedIn:1, amount:2000000 });
    expect(orders[0].holders).toHaveLength(2);
    expect(orders[1]).toMatchObject({ quantity:4, checkedIn:0, amount:4000000 });
    expect(orders[1].holders).toHaveLength(1);
    expect(ticketAvailability(event, rows).tiers[0].sold).toBe(6);
  });
});


it("renders a split order with one payment total and both ticket holders", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { default: TicketOrders } = await import("@/app/admin/_components/TicketOrders");
  const rows = [ticket({ reference:"buyer", name:"Buyer Name", email:"buyer@example.com", amount:2000000, quantity:1, orderQuantity:2, guestReferences:["guest"] }), ticket({ reference:"guest", name:"Guest Name", email:"guest@example.com", parentReference:"buyer", amount:0 })];
  const html = renderToStaticMarkup(createElement(TicketOrders, { tickets:rows, onResend:() => {} }));
  expect(html).toContain("Buyer Name");
  expect(html).toContain("Guest Name");
  expect(html).toContain("20,000");
  expect(html.match(/20,000/g)).toHaveLength(1);
  expect(html.match(/Included in order/g)).toHaveLength(2);
  expect(html).toContain("Separate QR codes emailed to ticket holders");
  expect(html.match(/Resend ticket/g)).toHaveLength(2);
});
