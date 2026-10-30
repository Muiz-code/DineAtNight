import { NextRequest, NextResponse } from "next/server";
import { getScanActor } from "@/lib/scanners";

/**
 * GET /api/scan/me — who may scan on this device: a signed-in admin or a
 * staff scanner with a live session. 401 when neither.
 */
export async function GET(req: NextRequest) {
  const who = await getScanActor(req);
  if (!who) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return NextResponse.json({
    kind: who.actor.kind,
    name: who.actor.name,
    scannerId: who.actor.kind === "staff" ? who.actor.id : null,
    scanCount: who.scanCount ?? null,
    admittedCount: who.admittedCount ?? null,
  });
}
