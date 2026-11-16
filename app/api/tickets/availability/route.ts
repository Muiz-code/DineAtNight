import { NextRequest, NextResponse } from "next/server";
import { getEventTicketAvailability } from "@/lib/payments";
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!eventId || eventId.includes("/") || eventId.length > 150) return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  try { return NextResponse.json(await getEventTicketAvailability(eventId), { headers: { "Cache-Control": "no-store" } }); }
  catch (err) { console.error("[ticket availability]", err); return NextResponse.json({ error: "Could not check availability." }, { status: 503 }); }
}
