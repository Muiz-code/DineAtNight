/**
 * Server-side email sending via Resend.
 * All functions here are server-only — never import this from client components.
 *
 * Environment variables required (server-only, no NEXT_PUBLIC_ prefix):
 *   RESEND_API_KEY       — Resend API key
 *   RESEND_FROM_EMAIL    — Verified sender address (e.g. hello@dineatnight.com)
 *   RESEND_ADMIN_EMAIL   — Admin inbox for notification emails
 */

import { Resend } from "resend";
import { VENDOR_APPROVAL_DEFAULTS } from "./constants";
import {
  renderBodyHtml,
  renderBodyText,
  renderLine,
  type TemplateVars,
  type VendorEmailTemplate,
} from "./vendorEmailTemplates";
import { hmacHex } from "./session";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "hello@dineatnight.com";
const FROM = `Dine At Night <${FROM_EMAIL}>`;
const ADMIN_TO = process.env.RESEND_ADMIN_EMAIL ?? "hello@dineatnight.com";
const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dineatnight.com"
).replace(/\/$/, "");
// ── Unsubscribe token (HMAC-SHA256 of email) ──────────────────────────────────
export async function generateUnsubscribeUrl(email: string): Promise<string> {
  const normalized = email.toLowerCase().trim();
  const token = await hmacHex(normalized);
  if (!token) return `${APP_URL}/unsubscribe`;
  return `${APP_URL}/api/unsubscribe?email=${encodeURIComponent(normalized)}&token=${token}`;
}

// ── HTML escaping ─────────────────────────────────────────────────────────────
// Every user-supplied value must pass through here before going into email HTML.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Shallow copy of `data` with every string (and string-array entry) HTML-escaped. */
function escapeFields<T extends object>(data: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = typeof v === "string" ? escapeHtml(v)
      : Array.isArray(v) ? v.map((x) => (typeof x === "string" ? escapeHtml(x) : x))
      : v;
  }
  return out as T;
}

// ── Base HTML wrapper ─────────────────────────────────────────────────────────
/** `preheader` is the inbox preview line shown after the subject (hidden in the email itself). */
function baseEmail(accent: string, body: string, preheader?: string): string {
  const glow = accent === "#00FF41"
    ? "rgba(0,255,65,0.4)"
    : accent === "#FF3333"
      ? "rgba(255,51,51,0.4)"
      : "rgba(255,255,0,0.4)";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>Dine At Night</title>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
${preheader ? `  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preheader}</div>
` : ""}  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#000000;min-height:100vh;">
    <tr>
      <td align="center" style="padding:1px;">

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#080808;border:1px solid ${accent}30;border-radius:16px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:24px 16px 20px;border-bottom:1px solid ${accent}18;">
              <p style="margin:0 0 6px;color:${accent};font-size:11px;font-weight:700;letter-spacing:0.35em;text-transform:uppercase;text-shadow:0 0 12px ${glow};">DINE AT NIGHT</p>
              <p style="margin:0;color:#808080;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;">Nigeria's First Night Food Market</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px 16px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:20px 16px;border-top:1px solid ${accent}12;background:#050505;">
              <p style="margin:0 0 6px;color:#808080;font-size:11px;">© Dine At Night · Lagos, Nigeria</p>
              <p style="margin:0;color:#808080;font-size:10px;">
                <a href="${APP_URL}" style="color:#808080;text-decoration:none;">${APP_URL.replace("https://", "")}</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Reusable HTML snippets ─────────────────────────────────────────────────────
function detailRow(label: string, value: string): string {
  return `
  <tr>
    <td style="padding:7px 0;border-bottom:1px solid #111;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="color:#808080;font-size:10px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;width:40%;">${label}</td>
          <td align="right" style="color:#ccc;font-size:13px;font-weight:600;">${value}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function ctaButton(href: string, label: string, accent: string): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
    <tr>
      <td align="center">
        <a href="${href}" style="display:inline-block;padding:14px 36px;background:${accent};color:#000;font-size:12px;font-weight:900;letter-spacing:0.25em;text-transform:uppercase;text-decoration:none;border-radius:100px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function heading(text: string, accent: string): string {
  const glow = accent === "#00FF41"
    ? "rgba(0,255,65,0.5)"
    : accent === "#FF3333"
      ? "rgba(255,51,51,0.5)"
      : "rgba(255,255,0,0.5)";
  return `<h1 style="margin:0 0 8px;color:${accent};font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;text-shadow:0 0 20px ${glow};">${text}</h1>`;
}

/** "2026-12-17" → "17th December" (Lagos time). Returns the input if unparseable. */
function formatOrdinalDate(iso: string): string {
  // Date-only strings parse as UTC midnight — pin them to Lagos so the day doesn't shift
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00+01:00` : iso);
  if (isNaN(d.getTime())) return iso;
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "Africa/Lagos",
  }).formatToParts(d);
  const day = Number(parts.find((x) => x.type === "day")?.value);
  const month = parts.find((x) => x.type === "month")?.value;
  const suffix =
    day % 100 >= 11 && day % 100 <= 13
      ? "th"
      : (["th", "st", "nd", "rd"][day % 10] ?? "th");
  return `${day}${suffix} ${month}`;
}

// ── send helper ───────────────────────────────────────────────────────────────
async function send(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      ...(opts.headers ? { headers: opts.headers } : {}),
    });
    if (error) {
      console.error("[resend] send error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[resend] unexpected error:", err);
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function notifyAdminContact(data: {
  name: string;
  email: string;
  topic: string;
  message: string;
}): Promise<boolean> {
  const h = escapeFields(data);
  const html = baseEmail("#FFFF00", `
    ${heading("New Contact Message", "#FFFF00")}
    <p style="margin:0 0 24px;color:#666;font-size:13px;">Received via dineatnight.com</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      ${detailRow("From", h.name)}
      ${detailRow("Email", h.email)}
      ${detailRow("Topic", h.topic)}
    </table>
    <div style="margin-top:20px;padding:16px;background:#0d0d0d;border-left:3px solid #FFFF0040;border-radius:4px;">
      <p style="margin:0 0 6px;color:#808080;font-size:10px;text-transform:uppercase;letter-spacing:0.2em;">Message</p>
      <p style="margin:0;color:#bbb;font-size:13px;line-height:1.7;">${h.message.replace(/\n/g, "<br/>")}</p>
    </div>
    ${ctaButton(`mailto:${encodeURIComponent(data.email)}`, "Reply to " + h.name, "#FFFF00")}
  `);

  return send({
    to: ADMIN_TO,
    subject: `New Contact: ${data.topic} — ${data.name}`,
    html,
    text: `New contact from ${data.name} (${data.email})\nTopic: ${data.topic}\n\n${data.message}`,
  });
}

export async function notifyAdminVendorApplied(data: {
  ownerName: string;
  brandName: string;
  email: string;
  phone?: string;
  instagram?: string;
  categories?: string[];
  description?: string;
}): Promise<boolean> {
  const h = escapeFields(data);
  const html = baseEmail("#FF3333", `
    ${heading("New Vendor Application", "#FF3333")}
    <p style="margin:0 0 24px;color:#666;font-size:13px;">A new vendor has applied to Dine At Night.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      ${detailRow("Brand", h.brandName)}
      ${detailRow("Owner", h.ownerName)}
      ${detailRow("Email", h.email)}
      ${h.phone ? detailRow("Phone", h.phone) : ""}
      ${h.instagram ? detailRow("Instagram", h.instagram) : ""}
      ${h.categories?.length ? detailRow("Categories", h.categories.join(", ")) : ""}
    </table>
    ${h.description ? `
    <div style="margin-top:20px;padding:16px;background:#0d0d0d;border-left:3px solid #FF333340;border-radius:4px;">
      <p style="margin:0 0 6px;color:#808080;font-size:10px;text-transform:uppercase;letter-spacing:0.2em;">Description</p>
      <p style="margin:0;color:#bbb;font-size:13px;line-height:1.7;">${h.description}</p>
    </div>` : ""}
    ${ctaButton(`${APP_URL}/admin/vendors`, "Review Application", "#FF3333")}
  `);

  return send({
    to: ADMIN_TO,
    subject: `New Vendor Application — ${data.brandName}`,
    html,
    text: `Brand: ${data.brandName}\nOwner: ${data.ownerName}\nEmail: ${data.email}\nReview: ${APP_URL}/admin/vendors`,
  });
}

export async function notifyAdminTestimonial(data: {
  name: string;
  type: "vendor" | "user";
  quote: string;
  eventTitle?: string;
}): Promise<boolean> {
  const h = escapeFields(data);
  const html = baseEmail("#00FF41", `
    ${heading("New Testimonial", "#00FF41")}
    <p style="margin:0 0 24px;color:#666;font-size:13px;">Pending your approval before going live.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      ${detailRow("Name", h.name)}
      ${detailRow("Type", h.type === "vendor" ? "Vendor" : "Event Attendee")}
      ${h.eventTitle ? detailRow("Event", h.eventTitle) : ""}
    </table>
    <div style="margin-top:20px;padding:20px;background:#0d0d0d;border-left:3px solid #00FF4140;border-radius:4px;">
      <p style="margin:0 0 8px;color:#00FF41;font-size:18px;opacity:0.4;">&ldquo;</p>
      <p style="margin:0;color:#ccc;font-size:14px;line-height:1.8;font-style:italic;">${h.quote}</p>
    </div>
    ${ctaButton(`${APP_URL}/admin/testimonials`, "Approve or Reject", "#00FF41")}
  `);

  return send({
    to: ADMIN_TO,
    subject: `New Testimonial — ${data.name}`,
    html,
    text: `New testimonial from ${data.name} (${data.type})\n"${data.quote}"\nManage: ${APP_URL}/admin/testimonials`,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// USER CONFIRMATIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function sendContactConfirmationEmail(data: {
  name: string;
  email: string;
  topic: string;
}): Promise<boolean> {
  const h = escapeFields(data);
  const html = baseEmail("#FFFF00", `
    ${heading("We got your message", "#FFFF00")}
    <p style="margin:0 0 24px;color:#888;font-size:14px;line-height:1.7;">
      Hi ${h.name}, thanks for reaching out about <strong style="color:#ccc;">"${h.topic}"</strong>.<br/>
      We'll get back to you within 24–48 hours.
    </p>
    <div style="padding:16px 20px;background:#0d0d0d;border:1px solid #FFFF0018;border-radius:8px;">
      <p style="margin:0;color:#555;font-size:12px;line-height:1.7;">
        For urgent matters, DM us on Instagram <a href="https://instagram.com/dineatnight" style="color:#FFFF00;text-decoration:none;">@dineatnight</a>
      </p>
    </div>
    ${ctaButton(`${APP_URL}`, "Visit Dine At Night", "#FFFF00")}
  `);

  return send({
    to: data.email,
    subject: `We got your message — Dine At Night`,
    html,
    text: `Hi ${data.name}, we received your message about "${data.topic}" and will reply within 24–48 hours.`,
  });
}

export async function sendTicketConfirmationEmail(data: {
  name: string;
  email: string;
  eventTitle: string;
  eventDate?: Date;
  quantity: number;
  amount: number;
  reference: string;
}): Promise<boolean> {
  const h = escapeFields(data);
  const amountNaira = (h.amount / 100).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  });

  const html = baseEmail("#00FF41", `
    <!-- Check icon -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:#00FF4115;border:2px solid #00FF4140;line-height:56px;font-size:26px;">✓</div>
    </div>

    <div style="text-align:center;margin-bottom:32px;">
      ${heading("You're in!", "#00FF41")}
      <p style="margin:6px 0 0;color:#555;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">${h.eventTitle}</p>
    </div>

    <!-- Ticket card -->
    <div style="background:#0a0a0a;border:1px solid #00FF4125;border-radius:12px;overflow:hidden;margin-bottom:28px;">
      <!-- Top accent bar -->
      <div style="height:3px;background:linear-gradient(90deg,transparent,#00FF41,transparent);"></div>
      <div style="padding:24px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          ${detailRow("Name", h.name)}
          ${h.eventDate ? detailRow("Date", h.eventDate.toDateString()) : ""}
          ${detailRow("Tickets", `${h.quantity}×`)}
          ${detailRow("Amount Paid", amountNaira)}
          ${detailRow("Reference", h.reference)}
        </table>
      </div>
    </div>

    <p style="margin:0 0 8px;color:#808080;font-size:11px;text-align:center;text-transform:uppercase;letter-spacing:0.2em;">Your e-ticket with QR code</p>
    ${ctaButton(`${APP_URL}/tickets/${h.reference}`, "View My Ticket →", "#00FF41")}

    <p style="margin:24px 0 0;color:#808080;font-size:11px;text-align:center;line-height:1.7;">
      Screenshot or save your ticket. Present the QR code at the entrance.<br/>
      See you under the neon lights!
    </p>
  `);

  return send({
    to: data.email,
    subject: `Your Ticket — ${data.eventTitle} | Dine At Night`,
    html,
    text: `Hi ${data.name}, your ticket for ${data.eventTitle} is confirmed.\nReference: ${data.reference}\nView ticket: ${APP_URL}/tickets/${data.reference}`,
  });
}

export async function sendVendorAppliedEmail(data: {
  ownerName: string;
  brandName: string;
  email: string;
  categories?: string[];
}): Promise<boolean> {
  const h = escapeFields(data);
  const html = baseEmail("#FFFF00", `
    ${heading("Application Received", "#FFFF00")}
    <p style="margin:0 0 24px;color:#888;font-size:14px;line-height:1.7;">
      Hi ${h.ownerName}, your application for <strong style="color:#ccc;">${h.brandName}</strong> has been received.
    </p>

    <!-- Steps -->
    <div style="space-y:12px;">
      ${[
        ["01", "Application Received", "Your details are in our system."],
        ["02", "Under Review", "Our team reviews every application carefully — we'll be in touch closer to the event date."],
        ["03", "Decision Email", "We'll notify you with the outcome by email."],
      ].map(([num, title, desc]) => `
      <div style="display:flex;gap:16px;margin-bottom:16px;padding:14px 16px;background:#0d0d0d;border-radius:8px;border:1px solid #FFFF0010;">
        <div style="min-width:28px;">
          <span style="color:#FFFF00;font-size:10px;font-weight:900;letter-spacing:0.1em;">${num}</span>
        </div>
        <div>
          <p style="margin:0 0 3px;color:#ddd;font-size:13px;font-weight:700;">${title}</p>
          <p style="margin:0;color:#555;font-size:12px;line-height:1.5;">${desc}</p>
        </div>
      </div>`).join("")}
    </div>

    <p style="margin:24px 0 0;color:#808080;font-size:12px;text-align:center;">
      Follow us for updates: <a href="https://instagram.com/dineatnight" style="color:#FFFF00;text-decoration:none;">@dineatnight</a>
    </p>
  `);

  return send({
    to: data.email,
    subject: `Application Received — ${data.brandName} | Dine At Night`,
    html,
    text: `Hi ${data.ownerName}, your application for ${data.brandName} has been received. We'll reach out closer to the event date.`,
  });
}

type ApprovalEmailData = {
  ownerName: string;
  brandName: string;
  email: string;
  template: VendorEmailTemplate;
  /** The vendor's event. Falls back to VENDOR_APPROVAL_DEFAULTS. */
  eventTitle?: string;
  eventDate?: string; // ISO date string
  venue?: string;
};

/**
 * Renders a vendor approval email from an editable template (see
 * lib/vendorEmailTemplates.ts). Also used by the admin preview.
 */
export function renderVendorApprovalEmail(data: Omit<ApprovalEmailData, "email">): {
  subject: string;
  html: string;
  text: string;
} {
  const vars: TemplateVars = {
    ownerName: data.ownerName,
    brandName: data.brandName,
    eventTitle: data.eventTitle || VENDOR_APPROVAL_DEFAULTS.eventTitle,
    eventDate: formatOrdinalDate(data.eventDate || VENDOR_APPROVAL_DEFAULTS.eventDate),
    venue: data.venue || VENDOR_APPROVAL_DEFAULTS.venue,
  };
  const accent = "#00FF41";
  const preview = renderLine(data.template.preview, vars);
  const html = baseEmail(
    accent,
    `
    ${heading("You've Been Selected!", accent)}
    ${renderBodyHtml(data.template.body, vars, accent)}
    <p style="margin:24px 0 0;color:#808080;font-size:11px;line-height:1.6;">To make sure our emails reach you, please add ${escapeHtml(FROM_EMAIL)} to your contacts. If this landed in spam or promotions, mark it “Not spam”.</p>
  `,
    preview ? escapeHtml(preview) : undefined,
  );
  return { subject: renderLine(data.template.subject, vars), html, text: renderBodyText(data.template.body, vars) };
}

export async function sendVendorApprovalEmail(data: ApprovalEmailData): Promise<boolean> {
  const { subject, html, text } = renderVendorApprovalEmail(data);
  return send({ to: data.email, subject, html, text });
}

/** Decline / revoke emails. (Approvals use sendVendorApprovalEmail.) */
export async function sendVendorStatusEmail(data: {
  ownerName: string;
  brandName: string;
  email: string;
  status: "declined" | "revoked";
  reason?: string;
}): Promise<boolean> {
  const h = escapeFields(data);
  const isDeclined = h.status === "declined";
  const accent = isDeclined ? "#FF3333" : "#FFFF00";
  const statusLabel = isDeclined ? "Application Update" : "Approval Revoked";

  const bodyContent = isDeclined ? `
    <p style="margin:0 0 20px;color:#888;font-size:14px;line-height:1.7;">
      Hi ${h.ownerName}, thank you for your interest in vending at Dine At Night.
    </p>
    <p style="margin:0 0 20px;color:#888;font-size:14px;line-height:1.7;">
      After carefully reviewing your application for <strong style="color:#ccc;">${h.brandName}</strong>, we're unable to offer a vendor spot at this edition.
    </p>
    <p style="margin:0 0 24px;color:#666;font-size:13px;line-height:1.7;">
      We run multiple editions a year — you're welcome to reapply for a future edition.
    </p>
    ${ctaButton(`${APP_URL}/vendors`, "Learn About Future Editions", "#FF3333")}
  ` : `
    <p style="margin:0 0 20px;color:#888;font-size:14px;line-height:1.7;">
      Hi ${h.ownerName}, the previously granted approval for <strong style="color:#ccc;">${h.brandName}</strong> has been revoked.
    </p>
    ${h.reason ? `
    <div style="padding:16px 20px;background:#0d0d0d;border-left:3px solid #FFFF0030;border-radius:4px;margin-bottom:20px;">
      <p style="margin:0 0 6px;color:#808080;font-size:10px;text-transform:uppercase;letter-spacing:0.2em;">Reason</p>
      <p style="margin:0;color:#888;font-size:13px;line-height:1.7;">${h.reason}</p>
    </div>` : ""}
    <p style="margin:0 0 24px;color:#666;font-size:13px;line-height:1.7;">
      Your spot for this edition is no longer reserved. If circumstances change, you're welcome to reapply for a future edition.
    </p>
    ${ctaButton(`${APP_URL}/vendors`, "View Vendor Page", "#FFFF00")}
  `;

  const html = baseEmail(accent, `
    ${heading(statusLabel, accent)}
    ${bodyContent}
  `);

  return send({
    to: data.email,
    subject: isDeclined
      ? `Application update — ${data.brandName} | Dine At Night`
      : `Approval revoked — ${data.brandName} | Dine At Night`,
    html,
    text: isDeclined
      ? `Hi ${data.ownerName}, unfortunately ${data.brandName} was not selected for this edition.`
      : `Hi ${data.ownerName}, the approval for ${data.brandName} has been revoked.${data.reason ? " Reason: " + data.reason : ""}`,
  });
}

export async function sendNewsletterWelcomeEmail(email: string): Promise<boolean> {
  const unsubUrl = await generateUnsubscribeUrl(email);

  const html = baseEmail("#FFFF00", `
    <div style="text-align:center;margin-bottom:28px;">
      ${heading("You're on the list.", "#FFFF00")}
      <p style="margin:8px 0 0;color:#555;font-size:13px;">Welcome to Dine At Night</p>
    </div>

    <p style="margin:0 0 24px;color:#777;font-size:14px;line-height:1.8;text-align:center;">
      You'll be the first to know about new event dates, vendor reveals, early bird tickets, and exclusive announcements.
    </p>

    <!-- Perks -->
    <div style="margin-bottom:28px;">
      ${[
        ["🎟️", "Early bird ticket drops before public sale"],
        ["🍽️", "Exclusive vendor lineup reveals"],
        ["📅", "Event date announcements first"],
        ["🎬", "Behind-the-scenes content"],
      ].map(([icon, text]) => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #111;">
        <span style="font-size:16px;width:24px;text-align:center;">${icon}</span>
        <span style="color:#888;font-size:13px;">${text}</span>
      </div>`).join("")}
    </div>

    ${ctaButton(`${APP_URL}/event`, "See Upcoming Events →", "#FFFF00")}

    <p style="margin:32px 0 4px;color:#555;font-size:13px;text-align:center;line-height:1.8;">
      Stay hungry. Stay out late.
    </p>
    <p style="margin:0 0 24px;color:#FFFF00;font-size:13px;font-weight:700;text-align:center;letter-spacing:0.1em;">
      — Dine At Night
    </p>

    <p style="margin:0;text-align:center;">
      <a href="${unsubUrl}" style="color:#808080;font-size:10px;text-decoration:underline;">Unsubscribe</a>
    </p>
  `);

  return send({
    to: email,
    subject: `Welcome to Dine At Night`,
    html,
    text: `You're on the Dine At Night list! You'll be first to know about events, tickets, and vendor reveals.\n\nSee upcoming events: ${APP_URL}/event\n\nStay hungry. Stay out late.\n— Dine At Night\n\nUnsubscribe: ${unsubUrl}`,
    headers: {
      "List-Unsubscribe": `<${unsubUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}

export async function sendOrderStatusEmail(data: {
  name: string;
  email: string;
  reference: string;
  deliveryStatus: "dispatched" | "delivered" | "returned";
  note?: string;
}): Promise<boolean> {
  const h = escapeFields(data);
  const configs = {
    dispatched: {
      accent: "#FFFF00" as const,
      icon: "📦",
      title: "Order Dispatched",
      message: "Your Dine At Night merch is on its way! Your package has been handed to our courier and is en route to your delivery address.",
    },
    delivered: {
      accent: "#00FF41" as const,
      icon: "✅",
      title: "Order Delivered",
      message: "Your Dine At Night merch has been delivered! We hope you love it — see you at the next event.",
    },
    returned: {
      accent: "#FF3333" as const,
      icon: "↩️",
      title: "Order Returned",
      message: "Your order has been marked as returned. Please contact us via the link below if you have questions.",
    },
  };

  const cfg = configs[h.deliveryStatus];

  const html = baseEmail(cfg.accent, `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;margin-bottom:12px;">${cfg.icon}</div>
      ${heading(cfg.title, cfg.accent)}
    </div>

    <p style="margin:0 0 24px;color:#777;font-size:14px;line-height:1.7;text-align:center;">
      Hi ${h.name}, ${cfg.message}
    </p>

    <div style="background:#0a0a0a;border:1px solid ${cfg.accent}20;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${detailRow("Reference", h.reference)}
        ${detailRow("Status", cfg.title)}
        ${h.note ? detailRow("Note", h.note) : ""}
      </table>
    </div>

    ${h.deliveryStatus === "returned"
      ? ctaButton(`${APP_URL}/contact`, "Contact Support", cfg.accent)
      : ctaButton(`${APP_URL}/shop`, "Shop More →", cfg.accent)}
  `);

  return send({
    to: data.email,
    subject: `Order ${cfg.title} — ${data.reference} | Dine At Night`,
    html,
    text: `Hi ${data.name}, your order ${data.reference} status: ${cfg.title}. ${cfg.message}${data.note ? " Note: " + data.note : ""}`,
  });
}
