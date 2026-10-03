import { NextRequest, NextResponse } from "next/server";
import { sendVendorStatusEmail } from "@/lib/resend";
import { getAdminEmail } from "@/lib/session";

/**
 * POST /api/emails/vendor-status
 * Sends a vendor approval/decline/revocation email.
 * Requires a valid (signed, unexpired, allowlisted) admin session cookie.
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

  const { ownerName, brandName, email, status, reason } = body as Record<string, string>;

  if (!ownerName || !brandName || !email || !status) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (!["approved", "declined", "revoked"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  await sendVendorStatusEmail({
    ownerName,
    brandName,
    email,
    status: status as "approved" | "declined" | "revoked",
    reason,
  });

  return NextResponse.json({ ok: true });
}
