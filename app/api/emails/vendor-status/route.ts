import { NextRequest, NextResponse } from "next/server";
import { sendVendorApprovalEmail, sendVendorStatusEmail } from "@/lib/resend";
import { getAdminEmail } from "@/lib/session";
import { getVendorTemplate, isVendorPackage, parseTemplate } from "@/lib/emailTemplates";
import { findPlaceholders } from "@/lib/vendorEmailTemplates";

/**
 * POST /api/emails/vendor-status
 * Sends a vendor approval / decline / revocation email. Admin-only.
 *
 * Approvals: `emailType` picks the email —
 *   "standard" | "mini_market"  the saved template for that package (default "standard")
 *   "custom"                    a one-off `custom: { subject, preview, body }` in the same format
 * Templates that still contain [bracketed gaps] are refused, so a draft is never sent.
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

  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string) : undefined);
  const ownerName = str("ownerName");
  const brandName = str("brandName");
  const email = str("email");
  const status = str("status");

  if (!ownerName || !brandName || !email || !status) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (!["approved", "declined", "revoked"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  let sent: boolean;
  if (status === "approved") {
    const emailType = str("emailType") ?? "standard";
    let template;
    if (emailType === "custom") {
      const parsed = parseTemplate(body.custom);
      if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });
      template = parsed;
    } else if (isVendorPackage(emailType)) {
      template = await getVendorTemplate(emailType);
    } else {
      return NextResponse.json({ error: "Invalid email type." }, { status: 400 });
    }

    const gaps = findPlaceholders(template);
    if (gaps.length) {
      return NextResponse.json(
        { error: `This email still has text to fill in: ${gaps.join(", ")}. Edit it in Email Templates first.` },
        { status: 400 },
      );
    }

    sent = await sendVendorApprovalEmail({
      ownerName,
      brandName,
      email,
      template,
      eventTitle: str("eventTitle"),
      eventDate: str("eventDate"),
      venue: str("venue"),
    });
  } else {
    sent = await sendVendorStatusEmail({
      ownerName,
      brandName,
      email,
      status: status as "declined" | "revoked",
      reason: str("reason"),
    });
  }

  if (!sent) {
    return NextResponse.json({ error: "Email could not be sent." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
