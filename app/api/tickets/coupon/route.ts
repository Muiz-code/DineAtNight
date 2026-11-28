import { NextRequest, NextResponse } from "next/server";
import { quoteTicketCoupon } from "@/lib/payments";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { COUPON_CHECK_RATE_LIMIT, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";

/**
 * POST /api/tickets/coupon — { eventId, ticketType?, quantity, code }
 * Checkout's "Apply" button: checks a coupon code and prices the order with it.
 * Nothing is reserved here — /api/paystack/initialize re-checks the code and
 * holds it in the same transaction as the tickets. Rate-limited per IP so codes
 * can't be guessed.
 */
export async function POST(req: NextRequest) {
  if (!(await checkRateLimit(`coupon:${clientIp(req)}`, COUPON_CHECK_RATE_LIMIT, RATE_LIMIT_WINDOW_MS))) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { eventId, ticketType, code } = body;
  const quantity = Number(body.quantity);
  if (typeof eventId !== "string" || !eventId || eventId.includes("/")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: "Enter a code." }, { status: 400 });
  }

  try {
    const q = await quoteTicketCoupon(eventId, quantity, typeof ticketType === "string" && ticketType ? ticketType : undefined, code);
    return NextResponse.json({
      ok: true,
      code: q.code,
      percentOff: q.percentOff,
      discountNaira: q.discountKobo / 100,
      totalNaira: q.amountKobo / 100,
      free: q.amountKobo === 0,
    });
  } catch (err) {
    // quoteTicketCoupon only throws user-safe messages; anything else is unexpected
    const message = err instanceof Error ? err.message : "";
    if (!message) console.error("[tickets/coupon]", err);
    return NextResponse.json({ error: message || "We couldn't check that code. Please try again." }, { status: 400 });
  }
}
