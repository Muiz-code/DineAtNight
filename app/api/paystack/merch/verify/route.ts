import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc, increment, serverTimestamp, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DanMerchOrder } from "@/lib/firestore";

export async function GET(req: NextRequest) {
  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
  if (!PAYSTACK_SECRET) {
    console.error("[merch/verify] PAYSTACK_SECRET_KEY is not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const reference = req.nextUrl.searchParams.get("reference");

  if (!reference) {
    return NextResponse.json({ error: "No reference provided" }, { status: 400 });
  }

  // ── Verify with Paystack ────────────────────────────────────────────────
  let paystackData: Record<string, unknown>;
  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
        cache: "no-store",
      }
    );
    paystackData = await res.json();
  } catch (err) {
    console.error("[merch/verify] Paystack fetch failed:", err);
    return NextResponse.json(
      { error: "Could not reach Paystack. Check your connection." },
      { status: 502 }
    );
  }

  const txData = paystackData.data as Record<string, unknown> | undefined;

  if (!paystackData.status || txData?.status !== "success") {
    return NextResponse.json(
      { error: `Payment not successful. Status: ${txData?.status ?? "unknown"}` },
      { status: 400 }
    );
  }

  // Pull order details from Paystack metadata as fallback
  const meta = txData.metadata as Record<string, unknown> | undefined;
  const customerEmail = (txData.customer as Record<string, unknown> | undefined)?.email as string ?? "";
  const amountKobo = typeof txData.amount === "number" ? txData.amount : 0;

  // ── Atomically upsert order as paid (transaction prevents double-processing) ──
  // Only the first callback that wins the transaction will have alreadyPaid = false
  let alreadyPaid = false;
  try {
    await runTransaction(db, async (tx) => {
      const existing = await tx.get(doc(db, "merch_orders", reference));
      alreadyPaid = existing.exists() && existing.data()?.status === "paid";
      tx.set(
        doc(db, "merch_orders", reference),
        {
          reference,
          name:           meta?.name    ?? "",
          email:          customerEmail,
          phone:          meta?.phone   ?? "",
          address:        meta?.address ?? null,
          items:          meta?.items   ?? [],
          total:          amountKobo / 100,
          status:         "paid",
          deliveryStatus: "pending",
          createdAt:      serverTimestamp(),
        },
        { merge: true }
      );
    });
  } catch (err) {
    console.error("[merch/verify] Firestore transaction failed:", err);
  }

  // ── Return order data (read once, reuse below) ────────────────────────
  const snap = await getDoc(doc(db, "merch_orders", reference)).catch(() => null);

  // ── Increment soldCount on each product (first confirmation only) ──────
  // Prefer items stored server-side at checkout over the Paystack metadata copy.
  if (!alreadyPaid) {
    const storedItems = (snap?.exists() && Array.isArray(snap.data().items))
      ? (snap.data().items as { productId: string; qty: number }[])
      : ((meta?.items ?? []) as { productId: string; qty: number }[]);
    await Promise.allSettled(
      storedItems.map((item) =>
        updateDoc(doc(db, "products", item.productId), {
          soldCount: increment(item.qty),
        })
      )
    );
  }

  // ── Return order data ──────────────────────────────────────────────────
  try {
    const order = snap?.exists()
      ? ({ id: snap.id, ...snap.data() } as DanMerchOrder)
      : ({
          reference,
          name:           meta?.name  as string ?? "",
          email:          customerEmail,
          phone:          meta?.phone as string ?? "",
          items:          (meta?.items ?? []) as DanMerchOrder["items"],
          total:          amountKobo / 100,
          status:         "paid" as const,
          deliveryStatus: "pending" as const,
        } satisfies Omit<DanMerchOrder, "id" | "createdAt">);
    return NextResponse.json({ ok: true, order });
  } catch {
    // Return a minimal order from Paystack data so the success page still works
    return NextResponse.json({
      ok: true,
      order: {
        reference,
        name:  meta?.name  as string ?? "",
        email: customerEmail,
        phone: meta?.phone as string ?? "",
        items: (meta?.items ?? []) as DanMerchOrder["items"],
        total: amountKobo / 100,
        status: "paid",
      },
    });
  }
}
