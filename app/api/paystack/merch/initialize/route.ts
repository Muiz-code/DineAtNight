import { NextRequest, NextResponse } from "next/server";
import { createMerchOrder, priceCart } from "@/lib/payments";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { CHECKOUT_RATE_LIMIT, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: NextRequest) {
  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
  // ── Guard: env vars ───────────────────────────────────────────────────
  if (!PAYSTACK_SECRET) {
    console.error("[merch/initialize] PAYSTACK_SECRET_KEY is not set");
    return NextResponse.json(
      { error: "Payment service not configured. Contact support." },
      { status: 500 }
    );
  }
  if (process.env.NODE_ENV === "production" && PAYSTACK_SECRET.startsWith("sk_test_")) {
    console.error("[merch/initialize] FATAL: production build is using a Paystack TEST secret key.");
    return NextResponse.json(
      { error: "Payment service not configured for production." },
      { status: 500 }
    );
  }
  if (!(await checkRateLimit(`checkout:${clientIp(req)}`, CHECKOUT_RATE_LIMIT, RATE_LIMIT_WINDOW_MS))) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  // ── Parse and validate body ───────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = str(body.name, 100);
  const email = str(body.email, 200);
  const phone = str(body.phone, 20);
  const rawAddress = (body.address ?? null) as Record<string, unknown> | null;
  const address = rawAddress
    ? { street: str(rawAddress.street, 200), city: str(rawAddress.city, 100), state: str(rawAddress.state, 100) }
    : undefined;

  if (name.length < 2 || !phone) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  // ── Price the cart from Firestore (names, prices, stock never trusted from client) ──
  let items, total: number;
  try {
    ({ items, total } = await priceCart(body.items));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not validate order.";
    console.warn("[merch/initialize] cart rejected:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const amountKobo = Math.round(total * 100);
  const callbackUrl = `${APP_URL || req.nextUrl.origin}/shop/verify`;

  // ── Initialize Paystack transaction ──────────────────────────────────
  let reference: string;
  let authorization_url: string;

  try {
    const paystackRes = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: amountKobo,
          currency: "NGN",
          callback_url: callbackUrl,
          metadata: { name, phone, address, items },
        }),
      }
    );

    const paystackData = await paystackRes.json();

    if (!paystackData.status || !paystackData.data) {
      console.error("[merch/initialize] Paystack rejected:", paystackData.message);
      return NextResponse.json(
        { error: "Payment provider error. Please try again." },
        { status: 502 }
      );
    }

    reference = paystackData.data.reference;
    authorization_url = paystackData.data.authorization_url;
  } catch (err) {
    console.error("[merch/initialize] Paystack fetch failed:", err);
    return NextResponse.json(
      { error: "Could not reach Paystack. Check your connection." },
      { status: 502 }
    );
  }

  // ── Save pending order in Firestore ──────────────────────────────────
  try {
    await createMerchOrder({
      reference,
      name,
      email,
      phone,
      ...(address ? { address } : {}),
      items,
      total, // server-computed, not client-sent
      status: "pending",
      deliveryStatus: "pending",
    });
  } catch (err) {
    console.error("[merch/initialize] Firestore write failed:", err);
    return NextResponse.json(
      { error: "Could not save your order. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ authorization_url, reference });
}
