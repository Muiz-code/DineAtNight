import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getAdminEmail } from "@/lib/session";
import { getPublicEvents } from "@/lib/publicData";
import {
  sendContactConfirmationEmail,
  sendNewsletterWelcomeEmail,
  sendOrderStatusEmail,
  sendTicketConfirmationEmail,
  sendVendorAppliedEmail,
  sendVendorApprovalEmail,
  sendVendorStatusEmail,
} from "@/lib/resend";
import { getVendorTemplate } from "@/lib/emailTemplates";
import { guestReference } from "@/lib/payments";
import { isTestEmailTemplate, type TestEmailTemplate } from "@/lib/testEmailTemplates";

type Template = TestEmailTemplate;

const SAMPLE = {
  ownerName: "Test Vendor",
  brandName: "Sample Suya Spot",
  customerName: "Test Customer",
  reference: "TEST-0000",
};

/** Placeholder event id for test tickets — no real event has this id. */
const TEST_EVENT_ID = "test-event";

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

/**
 * A real, paid ticket so the test email's "View My Ticket" link and QR code
 * work and can be scanned at /scan. It belongs to a placeholder event, so it
 * never counts towards real sales or check-in progress, and costs ₦0.
 */
async function createTestTicket(email: string, eventTitle: string) {
  const ticket = {
    reference: `TEST-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    eventId: TEST_EVENT_ID,
    eventTitle: `[TEST] ${eventTitle}`.slice(0, 200),
    name: SAMPLE.customerName,
    email,
    phone: "",
    ageRange: "25–34",
    quantity: 2,
    amount: 0,
    status: "paid" as const,
    test: true,
  };
  await adminDb()
    .collection("tickets")
    .doc(ticket.reference)
    .create({ ...ticket, purchasedAt: FieldValue.serverTimestamp(), paidAt: FieldValue.serverTimestamp() });
  return ticket;
}

/**
 * A test order of 3 tickets "sent to different emails" — the same shape
 * markTicketPaid creates for a real one (buyer 1× + two linked guest tickets,
 * each with its own scannable QR code). Every email goes to the test address.
 */
async function sendTestGroupOrder(to: string, eventTitle: string, guestEmails: string[]): Promise<boolean> {
  const db = adminDb();
  const reference = `TEST-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const title = `[TEST] ${eventTitle}`.slice(0, 200);
  const guests = [
    { name: "Test Guest One", email: guestEmails[0] || to },
    { name: "Test Guest Two", email: guestEmails[1] || to },
  ];
  const guestRefs = guests.map((_, i) => guestReference(reference, i + 2));
  const base = {
    eventId: TEST_EVENT_ID,
    eventTitle: title,
    phone: "",
    amount: 0,
    status: "paid" as const,
    test: true,
    purchasedAt: FieldValue.serverTimestamp(),
    paidAt: FieldValue.serverTimestamp(),
    confirmedAt: null,
  };
  const batch = db.batch();
  batch.create(db.collection("tickets").doc(reference), {
    ...base,
    reference,
    name: SAMPLE.customerName,
    email: to,
    ageRange: "25–34",
    quantity: 1,
    orderQuantity: 3,
    guests,
    guestReferences: guestRefs,
  });
  guests.forEach((g, i) =>
    batch.create(db.collection("tickets").doc(guestRefs[i]), {
      ...base,
      reference: guestRefs[i],
      name: g.name,
      email: g.email,
      quantity: 1,
      parentReference: reference,
      purchasedBy: SAMPLE.customerName,
    }),
  );
  await batch.commit();

  // Buyer copy (lists the guests), then each guest's copy — spaced for Resend's rate limit
  const results = [
    await sendTicketConfirmationEmail({
      name: SAMPLE.customerName,
      email: to,
      eventTitle: title,
      quantity: 1,
      amount: 0,
      reference,
      guests,
    }),
  ];
  for (const [i, g] of guests.entries()) {
    await new Promise((r) => setTimeout(r, 600));
    results.push(
      await sendTicketConfirmationEmail({
        name: g.name,
        email: g.email,
        eventTitle: title,
        quantity: 1,
        amount: 0,
        reference: guestRefs[i],
        sentBy: SAMPLE.customerName,
      }),
    );
  }
  return results.every(Boolean);
}

async function sendTemplate(template: Template, to: string, guestEmails: string[] = []): Promise<boolean> {
  switch (template) {
    case "vendor-approved":
    case "vendor-mini-market": {
      // The saved wording, exactly as vendors get it ([gaps] included, so drafts can be checked)
      const ev = await nextEvent();
      return sendVendorApprovalEmail({
        ownerName: SAMPLE.ownerName,
        brandName: SAMPLE.brandName,
        email: to,
        template: await getVendorTemplate(template === "vendor-approved" ? "standard" : "mini_market"),
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
      const ticket = await createTestTicket(to, ev?.title ?? "Dine At Night 2026");
      return sendTicketConfirmationEmail({
        name: ticket.name,
        email: to,
        eventTitle: ticket.eventTitle,
        eventDate: ev?.date ? new Date(ev.date.seconds * 1000) : undefined,
        quantity: ticket.quantity,
        amount: 0,
        reference: ticket.reference,
      });
    }
    case "ticket-group": {
      const ev = await nextEvent();
      return sendTestGroupOrder(to, ev?.title ?? "Dine At Night 2026", guestEmails);
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
  // Group ticket sample: optional guest addresses (blank = send to `to`)
  const guestEmails = (Array.isArray(body.guestEmails) ? body.guestEmails : [])
    .slice(0, 2)
    .map((e: unknown) => (typeof e === "string" ? e.trim() : ""));
  if (guestEmails.some((e: string) => e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))) {
    return NextResponse.json({ error: "Check the guest email addresses." }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("[test-email] RESEND_API_KEY is not set");
    return NextResponse.json(
      { error: "Emails can't be sent right now. Please contact the site developer." },
      { status: 500 },
    );
  }

  const results: { template: Template; ok: boolean }[] = [];
  for (const [i, template] of templates.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 600));
    let ok = false;
    try {
      ok = await sendTemplate(template, to, guestEmails);
    } catch (err) {
      // One broken sample (e.g. a database error creating a test ticket) shouldn't hide the rest
      console.error(`[test-email] ${template} failed:`, err);
    }
    results.push({ template, ok });
  }
  return NextResponse.json({ results });
}
