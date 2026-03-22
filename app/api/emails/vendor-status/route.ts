import { NextRequest, NextResponse } from "next/server";
import { sendVendorStatusEmail } from "@/lib/resend";

/**
 * POST /api/emails/vendor-status
 * Sends a vendor approval/decline/revocation email.
 * Requires the admin session cookie — only callable from the admin panel.
 */
export async function POST(req: NextRequest) {
  // Guard: must have a valid admin session cookie
  const session = req.cookies.get("dan_admin")?.value;
  if (!session) {
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
