/**
 * Dine At Night — Email Templates
 * All templates return a plain HTML string styled to match the DAN brand.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://dineatnight.com";

/* ─── Shared styles ────────────────────────────────────────────────── */
const shell = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dine At Night</title>
</head>
<body style="margin:0;padding:0;background:#050505;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <p style="margin:0;font-size:11px;letter-spacing:0.4em;text-transform:uppercase;color:#FFFF00;text-shadow:0 0 12px rgba(255,255,0,0.6);">Dine At Night</p>
              <p style="margin:4px 0 0;font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:#555;">For Those Who Dine After Dark</p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:linear-gradient(160deg,#0e0e0e,#080808);border:1px solid #1a1a1a;border-radius:16px;padding:36px 32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="margin:0;font-size:10px;color:#333;letter-spacing:0.1em;">
                © 2026 Dine At Night · Lagos, Nigeria
              </p>
              <p style="margin:6px 0 0;font-size:10px;color:#2a2a2a;">
                <a href="${APP_URL}" style="color:#444;text-decoration:none;">dineatnight.com</a>
                &nbsp;·&nbsp;
                <a href="https://instagram.com/dineatnight.ng" style="color:#444;text-decoration:none;">@dineatnight.ng</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const heading = (text: string, color = "#FFFF00") =>
  `<h1 style="margin:0 0 8px;font-size:26px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:${color};">${text}</h1>`;

const sub = (text: string, color = "#666") =>
  `<p style="margin:0 0 24px;font-size:11px;text-transform:uppercase;letter-spacing:0.3em;color:${color};">${text}</p>`;

const divider = (color = "#FFFF00") =>
  `<div style="height:1px;background:linear-gradient(to right,${color}40,transparent);margin:24px 0;"></div>`;

const btn = (label: string, href: string, color = "#FFFF00") =>
  `<a href="${href}" style="display:inline-block;margin-top:8px;padding:14px 32px;background:${color};color:#000;font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:0.15em;text-decoration:none;border-radius:100px;">${label}</a>`;

const row = (label: string, value: string, accent = "#FFFF00") =>
  `<tr>
     <td style="padding:8px 0;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#555;width:40%;">${label}</td>
     <td style="padding:8px 0;font-size:13px;font-weight:700;color:${accent};">${value}</td>
   </tr>`;

const infoTable = (rows: string) =>
  `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>`;

const body = (text: string) =>
  `<p style="margin:0 0 16px;font-size:14px;color:#aaa;line-height:1.7;">${text}</p>`;

/* ═══════════════════════════════════════════════════════════════════
   1. TICKET CONFIRMATION
   Sent to buyer after Paystack webhook confirms payment.
═══════════════════════════════════════════════════════════════════ */
export interface TicketEmailData {
  name: string;
  email: string;
  eventTitle: string;
  eventDate?: string;
  venue?: string;
  quantity: number;
  amount: number; // in kobo
  reference: string;
}

export function ticketConfirmationEmail(d: TicketEmailData): string {
  const amountNaira = (d.amount / 100).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  });

  return shell(`
    ${heading("Ticket Confirmed! 🎟️", "#FFFF00")}
    ${sub("Your spot is locked in", "#FFFF00")}
    ${body(`Hey <strong style="color:#fff;">${d.name}</strong>, your payment went through. You're officially coming to <strong style="color:#FFFF00;">${d.eventTitle}</strong>. See you under the neon lights.`)}
    ${divider("#FFFF00")}
    ${infoTable(
      row("Event", d.eventTitle) +
      (d.eventDate ? row("Date", d.eventDate) : "") +
      (d.venue ? row("Venue", d.venue) : "") +
      row("Tickets", `${d.quantity}x`) +
      row("Amount Paid", amountNaira, "#00FF41") +
      row("Reference", d.reference, "#888")
    )}
    ${divider("#FFFF00")}
    ${body("Your e-ticket with QR code is ready. Show it at the gate for entry.")}
    <div style="text-align:center;margin-top:28px;">
      ${btn("View My Ticket →", `${APP_URL}/tickets/${d.reference}`, "#FFFF00")}
    </div>
    <p style="margin:24px 0 0;font-size:11px;color:#333;text-align:center;">Questions? DM us at <a href="https://instagram.com/dineatnight.ng" style="color:#555;">@dineatnight.ng</a></p>
  `);
}

/* ═══════════════════════════════════════════════════════════════════
   2. VENDOR APPLICATION RECEIVED
   Sent to vendor immediately after they submit their application.
═══════════════════════════════════════════════════════════════════ */
export interface VendorEmailData {
  brandName: string;
  ownerName: string;
  email: string;
  categories?: string[];
  declineReason?: string;
}

export function vendorApplicationReceivedEmail(d: VendorEmailData): string {
  return shell(`
    ${heading("Application Received!", "#FF3333")}
    ${sub("We're reviewing your details", "#FF3333")}
    ${body(`Hey <strong style="color:#fff;">${d.ownerName}</strong>, we got your application for <strong style="color:#FF3333;">${d.brandName}</strong>. Our vendor relations team reviews every application carefully and we'll get back to you within <strong style="color:#fff;">5 business days</strong>.`)}
    ${divider("#FF3333")}
    ${infoTable(
      row("Brand", d.brandName, "#FF3333") +
      (d.categories?.length
        ? row("Categories", d.categories.join(", "), "#aaa")
        : "")
    )}
    ${divider("#FF3333")}
    ${body("In the meantime, follow us on Instagram for event updates and announcements.")}
    <div style="text-align:center;margin-top:24px;">
      ${btn("Follow @dineatnight.ng", "https://instagram.com/dineatnight.ng", "#FF3333")}
    </div>
  `);
}

/* ═══════════════════════════════════════════════════════════════════
   3. VENDOR APPLICATION — ADMIN NOTIFICATION
   Sent to the DAN team when a new vendor application arrives.
═══════════════════════════════════════════════════════════════════ */
export function vendorAdminNotificationEmail(d: VendorEmailData & { phone?: string; instagram?: string }): string {
  return shell(`
    ${heading("New Vendor Application", "#FFFF00")}
    ${sub("Review required", "#FFFF00")}
    ${body(`A new vendor application has been submitted and is awaiting your review.`)}
    ${divider()}
    ${infoTable(
      row("Brand", d.brandName) +
      row("Owner", d.ownerName) +
      row("Email", d.email, "#aaa") +
      (d.phone ? row("Phone", d.phone, "#aaa") : "") +
      (d.instagram ? row("Instagram", `@${d.instagram.replace("@", "")}`, "#aaa") : "") +
      (d.categories?.length ? row("Categories", d.categories.join(", "), "#aaa") : "")
    )}
    ${divider()}
    <div style="text-align:center;margin-top:24px;">
      ${btn("Review in Admin Panel →", `${APP_URL}/admin/vendors`, "#FFFF00")}
    </div>
  `);
}

/* ═══════════════════════════════════════════════════════════════════
   4. VENDOR APPROVED
   Sent to vendor when admin approves their application.
═══════════════════════════════════════════════════════════════════ */
export function vendorApprovedEmail(d: VendorEmailData): string {
  return shell(`
    ${heading("You're In! 🎉", "#00FF41")}
    ${sub("Application approved", "#00FF41")}
    ${body(`Congrats <strong style="color:#fff;">${d.ownerName}</strong>! <strong style="color:#00FF41;">${d.brandName}</strong> has been approved to vend at Dine At Night. We're excited to have you on the floor.`)}
    ${divider("#00FF41")}
    ${body("Our team will reach out with your spot assignment, setup time, and logistics details as the event date approaches. Keep an eye on your inbox and DMs.")}
    ${divider("#00FF41")}
    ${body("In the meantime, start spreading the word — your fans will want to know you're coming.")}
    <div style="text-align:center;margin-top:28px;">
      ${btn("View Event Details →", `${APP_URL}/event`, "#00FF41")}
    </div>
  `);
}

/* ═══════════════════════════════════════════════════════════════════
   5. VENDOR DECLINED
   Sent to vendor when admin declines their application.
═══════════════════════════════════════════════════════════════════ */
export function vendorDeclinedEmail(d: VendorEmailData): string {
  const reasonBlock = d.declineReason
    ? `<div style="margin:16px 0;padding:16px;background:rgba(255,51,51,0.05);border-left:3px solid #FF3333;border-radius:4px;">
        <p style="margin:0;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:6px;">Feedback</p>
        <p style="margin:0;font-size:14px;color:#ccc;line-height:1.6;">${d.declineReason}</p>
       </div>`
    : "";

  return shell(`
    ${heading("Application Update", "#FF3333")}
    ${sub("Thank you for applying", "#FF3333")}
    ${body(`Hey <strong style="color:#fff;">${d.ownerName}</strong>, thank you for your interest in vending at Dine At Night. After reviewing your application for <strong style="color:#FF3333;">${d.brandName}</strong>, we're unable to offer you a spot at this edition.`)}
    ${reasonBlock}
    ${divider("#FF3333")}
    ${body("This doesn't mean the door is closed permanently. We encourage you to reapply for future editions — our vendor lineup changes each time.")}
    <div style="text-align:center;margin-top:24px;">
      ${btn("Apply Again →", `${APP_URL}/vendors`, "#FF3333")}
    </div>
  `);
}

/* ═══════════════════════════════════════════════════════════════════
   6. CONTACT FORM — AUTO-REPLY TO SENDER
   Sent to the person who submitted the contact form.
═══════════════════════════════════════════════════════════════════ */
export interface ContactEmailData {
  name: string;
  email: string;
  topic: string;
  message: string;
}

export function contactAutoReplyEmail(d: ContactEmailData): string {
  return shell(`
    ${heading("We Got Your Message", "#00FF41")}
    ${sub("We'll be in touch soon", "#00FF41")}
    ${body(`Hey <strong style="color:#fff;">${d.name}</strong>, thanks for reaching out. We've received your message and will get back to you within <strong style="color:#fff;">24–48 hours</strong>.`)}
    ${divider("#00FF41")}
    ${infoTable(
      row("Topic", d.topic, "#00FF41") +
      row("Your Message", "&nbsp;", "#333")
    )}
    <div style="margin:0 0 16px;padding:16px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid #1a1a1a;">
      <p style="margin:0;font-size:13px;color:#888;line-height:1.7;font-style:italic;">"${d.message}"</p>
    </div>
    ${divider("#00FF41")}
    ${body("For urgent matters, DM us directly on Instagram.")}
    <div style="text-align:center;margin-top:20px;">
      ${btn("@dineatnight.ng", "https://instagram.com/dineatnight.ng", "#00FF41")}
    </div>
  `);
}

/* ═══════════════════════════════════════════════════════════════════
   7. CONTACT FORM — ADMIN NOTIFICATION
   Sent internally to the DAN team when someone submits contact form.
═══════════════════════════════════════════════════════════════════ */
export function contactAdminEmail(d: ContactEmailData): string {
  return shell(`
    ${heading("New Contact Message", "#00FF41")}
    ${sub("Requires response", "#00FF41")}
    ${divider()}
    ${infoTable(
      row("From", d.name) +
      row("Email", d.email, "#aaa") +
      row("Topic", d.topic, "#00FF41")
    )}
    <div style="margin:16px 0;padding:16px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid #1a1a1a;">
      <p style="margin:0 0 6px;font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.15em;">Message</p>
      <p style="margin:0;font-size:14px;color:#ccc;line-height:1.7;">${d.message}</p>
    </div>
    ${divider()}
    <p style="margin:0;font-size:11px;color:#444;text-align:center;">Reply directly to: <a href="mailto:${d.email}" style="color:#666;">${d.email}</a></p>
  `);
}

/* ═══════════════════════════════════════════════════════════════════
   8. NEWSLETTER WELCOME
   Sent when someone subscribes via the home page newsletter form.
═══════════════════════════════════════════════════════════════════ */
export function newsletterWelcomeEmail(email: string): string {
  return shell(`
    ${heading("Welcome to the Night 🌙", "#FFFF00")}
    ${sub("You're on the list", "#FFFF00")}
    ${body("You've joined the Dine At Night community. You'll be the first to know about new event dates, vendor reveals, early bird tickets, and exclusive announcements.")}
    ${divider()}
    ${body("Tell your friends — the more the merrier at the table.")}
    <div style="text-align:center;margin-top:28px;">
      ${btn("See Upcoming Events →", `${APP_URL}/event`, "#FFFF00")}
    </div>
    <p style="margin:24px 0 0;font-size:10px;color:#2a2a2a;text-align:center;">
      You subscribed with ${email}.
      To unsubscribe reply with "unsubscribe" in the subject.
    </p>
  `);
}
