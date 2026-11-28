import { NextRequest, NextResponse } from "next/server";
import { isValidReference } from "@/lib/payments";
import { confirmTicketScan, getScanActor } from "@/lib/scanners";

/**
 * POST /api/scan/confirm — { reference, override? }
 * Admits a paid ticket at the gate and credits the scan to whoever is signed
 * in (admin or staff scanner). Returns only what the gate needs to see.
 * Tickets outside their tier's entry window come back too_early / too_late;
 * `override: true` admits them anyway when the event allows overrides.
 */
export async function POST(req: NextRequest) {
  const who = await getScanActor(req);
  if (!who) {
    return NextResponse.json({ error: "Your session has ended. Log in again." }, { status: 401 });
  }

  let reference: unknown;
  let override = false;
  try {
    const body = await req.json();
    reference = body.reference;
    override = body.override === true; // "Admit anyway" — honoured only if the event allows it
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof reference === "string") reference = reference.trim();
  if (!isValidReference(reference)) {
    return NextResponse.json({ result: "not_found" });
  }

  try {
    return NextResponse.json(await confirmTicketScan(reference, who.actor, who.email, { override }));
  } catch (err) {
    console.error("[scan/confirm]", err);
    return NextResponse.json({ error: "Could not check the ticket. Try again." }, { status: 500 });
  }
}
