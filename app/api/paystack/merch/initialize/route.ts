import { NextRequest, NextResponse } from "next/server";
import { createMerchOrder } from "@/lib/firestore";
import { db } from "@/lib/firebase";
import { getDoc, doc } from "firebase/firestore";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

export async function POST(req: NextRequest) {
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

  // ── Parse body ────────────────────────────────────────────────────────
  let name: string, email: string, phone: string,
      address: { street: string; city: string; state: string } | undefined,
      items: { productId: string; productName: string; price: number; qty: number }[],
      total: number;

  try {
    ({ name, email, phone, address, items, total } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!name || !email || !phone || !items?.length || !total) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  // ── Validate items against Firestore and recompute total server-side ──
  // This prevents a user from manipulating the client-sent total to pay less.
  let computedTotal: number;
  try {
    const productSnaps = await Promise.all(
      items.map((item) => getDoc(doc(db, "products", item.productId)))
    );
    for (let i = 0; i < productSnaps.length; i++) {
      if (!productSnaps[i].exists()) {
        return NextResponse.json({ error: "One or more products were not found." }, { status: 400 });
      }
      const prod = productSnaps[i].data() as {
        active?: boolean;
        stock: number;
        soldCount?: number;
        name?: string;
      };
      if (prod.active === false) {
        return NextResponse.json({ error: "One or more products are no longer available." }, { status: 400 });
      }
      // Stock check — only enforce when stock is tracked (not unlimited/-1)
      if (prod.stock !== -1) {
        const available = Math.max(0, prod.stock - (prod.soldCount ?? 0));
        if (available <= 0) {
          return NextResponse.json(
            { error: `"${prod.name ?? "A product"}" is sold out.` },
            { status: 400 }
          );
        }
        if (items[i].qty > available) {
          return NextResponse.json(
            { error: `Only ${available} unit${available === 1 ? "" : "s"} of "${prod.name ?? "a product"}" are available.` },
            { status: 400 }
          );
        }
      }
    }
    computedTotal = productSnaps.reduce((sum, snap, i) => {
      const price = (snap.data() as { price: number }).price ?? 0;
      return sum + price * items[i].qty;
    }, 0);
  } catch (err) {
    console.error("[merch/initialize] Product lookup failed:", err);
    return NextResponse.json({ error: "Could not validate order. Please try again." }, { status: 500 });
  }

  const amountKobo = Math.round(computedTotal * 100);
  const callbackUrl = APP_URL
    ? `${APP_URL}/shop/verify`
    : `${req.nextUrl.origin}/shop/verify`;

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
      console.error("[merch/initialize] Paystack rejected:", paystackData);
      return NextResponse.json(
        { error: paystackData.message || "Paystack declined the request." },
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
      address,
      items,
      total: computedTotal, // server-validated, not client-sent
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
