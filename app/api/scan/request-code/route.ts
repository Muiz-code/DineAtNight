import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { RATE_LIMIT_WINDOW_MS, SCANNER_CODE_REQUEST_RATE_LIMIT } from "@/lib/constants";
import { requestNewCode } from "@/lib/scanners";

/**
 * POST /api/scan/request-code — { scannerId }
 * A logged-out scanner asks for a new code; admins see the request on the
 * Scan Ticket page. Only flags the account — never returns a code.
 */
export async function POST(req: NextRequest) {
  if (!(await checkRateLimit(`scan-request:${clientIp(req)}`, SCANNER_CODE_REQUEST_RATE_LIMIT, RATE_LIMIT_WINDOW_MS))) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  let scannerId = "";
  try {
    const body = await req.json();
    scannerId = typeof body.scannerId === "string" ? body.scannerId : "";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!(await requestNewCode(scannerId))) {
    return NextResponse.json({ error: "Account not found. Ask an admin directly." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
