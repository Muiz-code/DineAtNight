import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { DanEvent } from "@/lib/firestore";
import type { TicketAvailability } from "@/lib/ticketInventory";

const state = vi.hoisted(() => ({ inventory: null as { eventId: string; data: TicketAvailability } | null }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => actual.useState(initial === null ? state.inventory : initial) };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/useScrollLock", () => ({ useScrollLock: vi.fn() }));
vi.mock("framer-motion", async () => {
  const { createElement } = await import("react");
  return {
    AnimatePresence: ({ children }: { children: import("react").ReactNode }) => children,
    motion: new Proxy({}, { get: (_target, tag: string) => (props: Record<string, unknown>) => {
      const clean = { ...props };
      for (const key of ["initial", "animate", "exit", "transition", "whileHover", "whileTap"]) delete clean[key];
      return createElement(tag, clean);
    } }),
  };
});
const { default: TicketModal } = await import("@/app/_components/TicketModal");
const event = { id:"ev", title:"Test event", venue:"Lagos", date:{ seconds:1800000000 }, totalTickets:100, soldTickets:30, ticketPrice:10000, ticketTypes:[{ name:"Early Bird", price:10000, limit:30 }, { name:"Standard", price:16500, limit:70 }] } as DanEvent;
const render = () => renderToStaticMarkup(createElement(TicketModal, { initialEvent:event, events:[event], onClose:() => {} }));
const inputTag = (html: string) => html.match(/<input[^>]*name="quantity"[^>]*>/)?.[0] ?? "";
const submitTag = (html: string) => html.match(/<button[^>]*type="submit"[^>]*>/)?.[0] ?? "";
beforeEach(() => { state.inventory = { eventId:"ev", data:{ sold:30, reserved:0, available:70, tiers:[{ name:"Early Bird", limit:30, sold:30, reserved:0, available:0, overAllocation:0 }, { name:"Standard", limit:70, sold:0, reserved:0, available:70, overAllocation:0 }] } }; });
describe("sold-out checkout controls", () => {
  it("disables typing, quantity buttons and Continue for a sold-out selected tier", () => {
    const html = render();
    expect(inputTag(html)).toContain('disabled=""');
    expect(inputTag(html)).toContain('value="0"');
    expect(inputTag(html)).toContain('min="0"');
    expect(inputTag(html)).toContain('max="0"');
    expect(submitTag(html)).toContain('disabled=""');
    expect(html).toContain('This ticket type is sold out.');
    expect(html).not.toContain('Up to 0 per order');
    for (const label of ["One fewer ticket", "One more ticket"]) {
      expect(html.match(new RegExp('<button[^>]*aria-label="' + label + '"[^>]*>'))?.[0]).toContain('disabled=""');
    }
    expect(html).toContain('>Sold out</button>');
  });
  it("enables quantity input and Continue when the selected tier has availability", () => {
    state.inventory!.data.tiers[0].available = 1;
    const html = render();
    expect(inputTag(html)).not.toContain('disabled=');
    expect(inputTag(html)).toContain('min="1"');
    expect(inputTag(html)).toContain('max="1"');
    expect(submitTag(html)).not.toContain('disabled=');
  });
  it("blocks quantity and Continue while availability is loading", () => {
    state.inventory = null;
    const html = render();
    expect(inputTag(html)).toContain('disabled=""');
    expect(submitTag(html)).toContain('disabled=""');
    expect(html).toContain('Checking availability...');
  });
});
