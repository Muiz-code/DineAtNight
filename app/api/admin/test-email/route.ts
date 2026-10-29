import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/session";
import { getPublicEvents } from "@/lib/publicData";
import {
  sendContactConfirmationEmail,
  sendNewsletterWelcomeEmail,
  sendOrderStatusEmail,
  sendTicketConfirmationEmail,
  sendVendorAppliedEmail,
  sendVendorStatusEmail,
} from "@/lib/resend";
import { isTestEmailTemplate, type TestEmailTemplate } from "@/lib/testEmailTemplates";

type Template = TestEmailTemplate;

const SAMPLE = {
  ownerName: "Test Vendor",
  brandName: "Sample Suya Spot",
  customerName: "Test Customer",
  reference: "TEST-0000",
};

/** The next upcoming event, as a real approval would use — null falls back to the email defaults. */
async function nextEvent() {
  try {
    const { active } = await getPublicEvents();
    const now = Date.now();
    return active.find((e) => (e.date?.seconds ?? 0) * 1000 >= now && !e.isPast) ?? null;
  } catch {
    return null;
  }
}

async function sendTemplate(template: Template, to: string): Promise<boolean> {
  switch (template) {
    case "vendor-approved": {
      const ev = await nextEvent();
      return sendVendorStatusEmail({
        ownerName: SAMPLE.ownerName,
        brandName: SAMPLE.brandName,
        email: to,
        status: "approved",
        ...(ev
          ? {
              eventTitle: ev.title,
              eventDate: ev.date ? new Date(ev.date.seconds * 1000).toISOString() : undefined,
              venue: ev.venue,
            }
          : {}),
      });
    }
    case "vendor-declined":
    case "vendor-revoked":
      return sendVendorStatusEmail({
        ownerName: SAMPLE.ownerName,
        brandName: SAMPLE.brandName,
        email: to,
        status: template === "vendor-declined" ? "declined" : "revoked",
        reason: "Sample reason (test email)",
      });
    case "vendor-applied":
      return sendVendorAppliedEmail({
        ownerName: SAMPLE.ownerName,
        brandName: SAMPLE.brandName,
        email: to,
        categories: ["Food", "Drinks"],
      });
    case "ticket-confirmation": {
      const ev = await nextEvent();
      return sendTicketConfirmationEmail({
        name: SAMPLE.customerName,
        email: to,
        eventTitle: ev?.title ?? "Dine At Night 2026",
        eventDate: ev?.date ? new Date(ev.date.seconds * 1000) : undefined,
        quantity: 2,
        amount: 20000,
        reference: SAMPLE.reference,
      });
    }
    case "contact-confirmation":
      return sendContactConfirmationEmail({
        name: SAMPLE.customerName,
        email: to,
        topic: "General enquiry",
      });
    case "newsletter-welcome":
      return sendNewsletterWelcomeEmail(to);
    case "order-dispatched":
    case "order-delivered":
    case "order-returned":
      return sendOrderStatusEmail({
        name: SAMPLE.customerName,
        email: to,
        reference: SAMPLE.reference,
        deliveryStatus: template.replace("order-", "") as "dispatched" | "delivered" | "returned",
        note: "Sample note (test email)",
      });
  }
}

/**
 * POST /api/admin/test-email — { to, templates: Template[] }
 * Sends sample versions of customer emails to any address so admins can check
 * how they look and where they land. Admin-only. Sends one at a time to stay
 * under Resend's per-second rate limit.
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

  const to = typeof body.to === "string" ? body.to.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }
  const templates = Array.isArray(body.templates)
    ? body.templates.filter(isTestEmailTemplate)
    : [];
  if (templates.length === 0) {
    return NextResponse.json({ error: "Pick at least one email." }, { status: 400 });
  }

  const results: { template: Template; ok: boolean }[] = [];
  for (const [i, template] of templates.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 600));
    results.push({ template, ok: await sendTemplate(template, to) });
  }
  return NextResponse.json({ results });
}
