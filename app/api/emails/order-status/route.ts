import { NextRequest, NextResponse } from "next/server";
import { getMerchOrder, isValidReference } from "@/lib/payments";
import { sendOrderStatusEmail } from "@/lib/resend";
import { getAdminEmail } from "@/lib/session";

/**
 * POST /api/emails/order-status
 * Emails a merch customer about a delivery status change.
 * Admin-only. Recipient name/email are read from the stored order, not the request.
 */
export async function POST(req: NextRequest) {
  if (!(await getAdminEmail(req))) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { reference, deliveryStatus, note } = body;
  if (!isValidReference(reference)) {
    return NextResponse.json({ error: "Invalid reference." }, { status: 400 });
  }
  if (deliveryStatus !== "dispatched" && deliveryStatus !== "delivered" && deliveryStatus !== "returned") {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const order = await getMerchOrder(reference);
  if (!order?.email) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  await sendOrderStatusEmail({
    name: order.name,
    email: order.email,
    reference,
    deliveryStatus,
    note: typeof note === "string" && note.trim() ? note.trim().slice(0, 500) : undefined,
  });

  return NextResponse.json({ ok: true });
}
