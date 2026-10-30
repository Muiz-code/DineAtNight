import { NextRequest, NextResponse } from "next/server";
import { SCANNER_COOKIE, endScannerSession } from "@/lib/scanners";

/**
 * POST /api/scan/logout — ends the ticket scanner's session for good.
 * Their code was single-use, so they need a new one from an admin to log back in.
 */
export async function POST(req: NextRequest) {
  const scannerId = await endScannerSession(req.cookies.get(SCANNER_COOKIE)?.value);
  const res = NextResponse.json({ ok: true, scannerId });
  res.cookies.delete(SCANNER_COOKIE);
  return res;
}
