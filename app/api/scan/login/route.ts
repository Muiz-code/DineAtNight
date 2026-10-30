import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { RATE_LIMIT_WINDOW_MS, SCANNER_LOGIN_RATE_LIMIT } from "@/lib/constants";
import {
  SCANNER_COOKIE,
  SCANNER_SESSION_MAX_AGE,
  createScannerSessionValue,
  redeemCode,
} from "@/lib/scanners";

/**
 * POST /api/scan/login — { code }
 * Exchanges a ticket scanner's one-time code for a session cookie.
 * The code stops working the moment it is used.
 */
export async function POST(req: NextRequest) {
  if (!process.env.SESSION_SECRET) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (!(await checkRateLimit(`scan-login:${clientIp(req)}`, SCANNER_LOGIN_RATE_LIMIT, RATE_LIMIT_WINDOW_MS))) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  let code = "";
  try {
    const body = await req.json();
    code = typeof body.code === "string" ? body.code : "";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const session = await redeemCode(code);
  if (!session) {
    return NextResponse.json(
      { error: "That code is wrong or has already been used. Ask an admin for a new one." },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true, name: session.name, scannerId: session.scannerId });
  res.cookies.set(SCANNER_COOKIE, await createScannerSessionValue(session.scannerId, session.sessionId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SCANNER_SESSION_MAX_AGE,
    path: "/",
  });
  return res;
}
