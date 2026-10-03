import { NextRequest, NextResponse } from "next/server";
import { fetchPaystackTransaction, getMerchOrder, isValidReference, markMerchOrderPaid } from "@/lib/payments";

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference");
  if (!isValidReference(reference)) {
    return NextResponse.json({ error: "Invalid payment reference" }, { status: 400 });
  }

  // ── Verify with Paystack ────────────────────────────────────────────────
  let tx;
  try {
    tx = await fetchPaystackTransaction(reference);
  } catch (err) {
    console.error("[merch/verify] Paystack fetch failed:", err);
    return NextResponse.json(
      { error: "Could not reach Paystack. Please refresh in a moment." },
      { status: 502 }
    );
  }
  if (!tx || tx.status !== "success") {
    return NextResponse.json(
      { error: `Payment not successful. Status: ${tx?.status ?? "unknown"}` },
      { status: 400 }
    );
  }

  // ── Mark paid (idempotent, amount-checked, increments soldCount once) ──
  // The order must already exist from /merch/initialize — Paystack metadata
  // is never used to create or overwrite an order.
  try {
    await markMerchOrderPaid(reference, tx.amount);
  } catch (err) {
    console.error("[merch/verify] markMerchOrderPaid failed:", reference, err);
    return NextResponse.json(
      { error: "We couldn't confirm this order. Please contact support with your reference." },
      { status: 500 }
    );
  }

  const order = await getMerchOrder(reference).catch(() => null);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    order: {
      reference,
      name: order.name,
      email: order.email,
      items: order.items,
      total: order.total,
      status: order.status,
      deliveryStatus: order.deliveryStatus,
    },
  });
}
