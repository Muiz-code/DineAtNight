import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/session";
import { isValidReference } from "@/lib/payments";
import { resendTicketEmail } from "@/lib/ticketDelivery";

/**
 * POST /api/admin/tickets/resend — { reference, email? }
 * Re-sends an existing ticket's email (same ticket and QR code). `email`
 * optionally sends it to a different address without changing the ticket.
 * Admin-only.
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

  const reference = body.reference;
  if (!isValidReference(reference)) {
    return NextResponse.json({ error: "Invalid ticket reference." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const result = await resendTicketEmail(reference, email || undefined);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
