import { NextResponse } from "next/server";
import { getAllEvents, createEvent } from "@/lib/firestore";
import { Timestamp } from "firebase/firestore";

// GET /api/events — returns all events (public)
export async function GET() {
  try {
    const events = await getAllEvents();
    // Convert Timestamps to ISO strings for JSON serialization
    const serialized = events.map((e) => ({
      ...e,
      date: e.date?.toDate?.()?.toISOString() ?? null,
      createdAt: e.createdAt?.toDate?.()?.toISOString() ?? null,
    }));
    return NextResponse.json({ events: serialized });
  } catch (err) {
    console.error("[GET /api/events]", err);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

// POST /api/events — create a new event (admin only — validated server-side)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date, ...rest } = body;

    const eventId = await createEvent({
      ...rest,
      date: Timestamp.fromDate(new Date(date)),
      soldTickets: 0,
    });

    return NextResponse.json({ id: eventId });
  } catch (err) {
    console.error("[POST /api/events]", err);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
