import { NextRequest, NextResponse } from "next/server";
import { resend, FROM } from "@/lib/resend";
import {
  vendorApprovedEmail,
  vendorDeclinedEmail,
  vendorApplicationReceivedEmail,
  vendorAdminNotificationEmail,
  type VendorEmailData,
} from "@/lib/emails";
import { ADMIN_EMAIL } from "@/lib/resend";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, vendor } = body as {
      type: "applied" | "approved" | "declined";
      vendor: VendorEmailData & { phone?: string; instagram?: string };
    };

    if (!type || !vendor?.email) {
      return NextResponse.json({ error: "Missing type or vendor email" }, { status: 400 });
    }

    if (type === "applied") {
      await Promise.all([
        // Confirmation to the vendor
        resend.emails.send({
          from: FROM,
          to: vendor.email,
          subject: `Application received — ${vendor.brandName}`,
          html: vendorApplicationReceivedEmail(vendor),
        }),
        // Notification to DAN admin
        resend.emails.send({
          from: FROM,
          to: ADMIN_EMAIL,
          subject: `[New Vendor] ${vendor.brandName} applied`,
          html: vendorAdminNotificationEmail(vendor),
        }),
      ]);
    }

    if (type === "approved") {
      await resend.emails.send({
        from: FROM,
        to: vendor.email,
        subject: `✅ You're approved to vend at Dine At Night!`,
        html: vendorApprovedEmail(vendor),
      });
    }

    if (type === "declined") {
      await resend.emails.send({
        from: FROM,
        to: vendor.email,
        subject: `Update on your Dine At Night application`,
        html: vendorDeclinedEmail(vendor),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[emails/vendor-status]", err);
    return NextResponse.json({ error: "Email failed" }, { status: 500 });
  }
}
