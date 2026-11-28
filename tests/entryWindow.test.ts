import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeFirestore } from "./fakeFirestore";
import { checkEntry, entryLabel, entryWindow, formatEntryTime } from "@/lib/entryWindow";

let fake: ReturnType<typeof createFakeFirestore>;
vi.mock("@/lib/firebase-admin", () => ({ adminDb: () => fake.db }));
const { confirmTicketScan } = await import("@/lib/scanners");

// 17 Dec 2026, 7:00 PM in Lagos (UTC+1) = 18:00 UTC
const EVENT_MS = Date.parse("2026-12-17T18:00:00Z");
const lagos = (hhmm: string, day = 17) => Date.parse(`2026-12-${day}T${hhmm}:00+01:00`);

describe("entryWindow (Lagos time, on the event date)", () => {
  it("places an 8 PM – 12 AM slot on the event night, ending at midnight", () => {
    const w = entryWindow(EVENT_MS, { entryStart: "20:00", entryEnd: "00:00" })!;
    expect(w.startMs).toBe(lagos("20:00"));
    expect(w.endMs).toBe(lagos("00:00", 18));
    expect(w.opensMs).toBe(w.startMs);
  });
  it("uses Lagos time, not the server's (UTC)", () => {
    // An event stored at 00:30 Lagos is still that Lagos date, though it's the previous day in UTC
    const w = entryWindow(Date.parse("2026-12-17T00:30:00+01:00"), { entryStart: "16:00", entryEnd: "20:00" })!;
    expect(w.startMs).toBe(lagos("16:00"));
  });
  it("opens early by the grace minutes", () => {
    const w = entryWindow(EVENT_MS, { entryStart: "20:00", entryEnd: "23:00" }, 15)!;
    expect(w.opensMs).toBe(lagos("19:45"));
  });
  it("is null without both times", () => {
    expect(entryWindow(EVENT_MS, {})).toBeNull();
    expect(entryWindow(EVENT_MS, { entryStart: "20:00" })).toBeNull();
    expect(entryWindow(EVENT_MS, { entryStart: "25:00", entryEnd: "23:00" })).toBeNull();
  });
  it("checks early / ok / late — late from the end time on", () => {
    const w = entryWindow(EVENT_MS, { entryStart: "20:00", entryEnd: "00:00" }, 15)!;
    expect(checkEntry(lagos("16:00"), w)).toBe("early");
    expect(checkEntry(lagos("19:44"), w)).toBe("early");
    expect(checkEntry(lagos("19:45"), w)).toBe("ok");
    expect(checkEntry(lagos("23:59"), w)).toBe("ok");
    expect(checkEntry(lagos("00:00", 18), w)).toBe("late");
  });
  it("formats times in 12-hour clock", () => {
    expect(formatEntryTime("20:00")).toBe("8:00 PM");
    expect(formatEntryTime("00:00")).toBe("12:00 AM");
    expect(formatEntryTime("12:30")).toBe("12:30 PM");
    expect(entryLabel({ entryStart: "16:00", entryEnd: "20:00" })).toBe("4:00 PM – 8:00 PM");
    expect(entryLabel({ entryStart: "16:00" })).toBeNull();
  });
});

describe("gate scan with tier entry windows", () => {
  const staff = { id: "s1", name: "Tunde", kind: "staff" as const };
  const seed = (event: Record<string, unknown> = {}) => {
    fake = createFakeFirestore({
      "events/ev": {
        title: "DAN",
        date: { seconds: EVENT_MS / 1000 },
        ticketTypes: [
          { name: "Night Market Pass", price: 14500, entryStart: "16:00", entryEnd: "20:00" },
          { name: "After Dark", price: 17000, entryStart: "20:00", entryEnd: "00:00" },
          { name: "VIP", price: 50000 },
        ],
        ...event,
      },
      "tickets/LATE8": { eventId: "ev", name: "Ada", eventTitle: "DAN", quantity: 1, status: "paid", ticketType: "After Dark" },
      "tickets/EARLY4": { eventId: "ev", name: "Bo", eventTitle: "DAN", quantity: 1, status: "paid", ticketType: "Night Market Pass" },
      "tickets/VIP1": { eventId: "ev", name: "Cy", eventTitle: "DAN", quantity: 1, status: "paid", ticketType: "VIP" },
    });
  };
  beforeEach(() => seed());

  it("refuses an 8–12 ticket at 4 PM, without using it up", async () => {
    const res = await confirmTicketScan("LATE8", staff, undefined, { now: lagos("16:00") });
    expect(res).toMatchObject({ result: "too_early", entry: { label: "8:00 PM – 12:00 AM", startMs: lagos("20:00") }, canOverride: false });
    expect(fake.store.get("tickets/LATE8")!.status).toBe("paid");
    // …and admits it once the slot opens
    expect(await confirmTicketScan("LATE8", staff, undefined, { now: lagos("20:05") })).toMatchObject({ result: "confirmed" });
  });

  it("blocks late entry from the end time", async () => {
    expect(await confirmTicketScan("EARLY4", staff, undefined, { now: lagos("20:00") })).toMatchObject({ result: "too_late" });
  });

  it("lets early arrivals in within the grace minutes", async () => {
    seed({ entryGraceMinutes: 15 });
    expect(await confirmTicketScan("LATE8", staff, undefined, { now: lagos("19:50") })).toMatchObject({ result: "confirmed" });
  });

  it("ignores an override unless the event allows it", async () => {
    expect(await confirmTicketScan("LATE8", staff, undefined, { now: lagos("16:00"), override: true })).toMatchObject({ result: "too_early" });
    expect(fake.store.get("tickets/LATE8")!.status).toBe("paid");
  });

  it("admits on override when allowed, and records who and why", async () => {
    seed({ allowEntryOverride: true });
    const refused = await confirmTicketScan("LATE8", staff, undefined, { now: lagos("16:00") });
    expect(refused).toMatchObject({ result: "too_early", canOverride: true });
    const res = await confirmTicketScan("LATE8", staff, undefined, { now: lagos("16:00"), override: true });
    expect(res).toMatchObject({ result: "confirmed", overridden: "early" });
    expect(fake.store.get("tickets/LATE8")).toMatchObject({ status: "confirmed", entryOverride: { reason: "early", by: "Tunde", at: lagos("16:00") } });
  });

  it("tiers without entry times admit any time", async () => {
    expect(await confirmTicketScan("VIP1", staff, undefined, { now: lagos("03:00") })).toMatchObject({ result: "confirmed" });
  });

  it("doesn't count a refused scan in a split order's progress", async () => {
    fake.store.set("tickets/ORD", { eventId: "ev", name: "Ada", eventTitle: "DAN", quantity: 1, status: "paid", ticketType: "After Dark", guestReferences: ["ORD-2"] });
    fake.store.set("tickets/ORD-2", { eventId: "ev", name: "Bo", eventTitle: "DAN", quantity: 1, status: "paid", ticketType: "After Dark", parentReference: "ORD" });
    expect(await confirmTicketScan("ORD-2", staff, undefined, { now: lagos("16:00") })).toMatchObject({ result: "too_early", order: { scanned: 0, total: 2 } });
  });
});
