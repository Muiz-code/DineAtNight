/**
 * Vendor approval email templates — editable in admin (/admin/email-templates).
 *
 * A template is plain text, so non-developers can edit it:
 *   - a blank line starts a new paragraph
 *   - a line starting with "## " is a section heading
 *   - **text** is bold
 *   - {ownerName}, {brandName}, {eventTitle}, {eventDate}, {venue} are filled in
 *   - [square-bracket text] marks a gap still to be written — sending to a real
 *     vendor is refused while any remain
 *
 * Pure module (no server imports): used by the admin editor, the preview
 * route and lib/resend.ts so all three render identically. Saved templates
 * live in Firestore `email_templates/{key}` (lib/emailTemplates.ts); these
 * defaults apply until an admin saves a change.
 */

export const VENDOR_PACKAGES = ["standard", "mini_market"] as const;
export type VendorPackage = (typeof VENDOR_PACKAGES)[number];

export const PACKAGE_LABELS: Record<VendorPackage, string> = {
  standard: "Standard stall",
  mini_market: "Mini Market",
};

export type VendorEmailTemplate = {
  subject: string;
  /** Inbox preview line shown after the subject (hidden in the email itself). */
  preview: string;
  body: string;
};

export const TEMPLATE_FIELDS: { key: string; description: string }[] = [
  { key: "ownerName", description: "Vendor contact's name" },
  { key: "brandName", description: "Vendor's brand" },
  { key: "eventTitle", description: "Event name, e.g. Dine At Night 2026" },
  { key: "eventDate", description: "Event date, e.g. 17th December" },
  { key: "venue", description: "Event venue" },
];

export type TemplateVars = Record<"ownerName" | "brandName" | "eventTitle" | "eventDate" | "venue", string>;

export const DEFAULT_VENDOR_TEMPLATES: Record<VendorPackage, VendorEmailTemplate> = {
  standard: {
    // Plain, business-like subject — "Congratulations, you've been selected"
    // next to a ₦ amount reads as lottery spam to filters
    subject: "{eventTitle}: your vendor application ({brandName})",
    preview: "Your stall at {eventTitle}, {eventDate}, {venue}. Please reply by Friday, 6th November 2026.",
    body: `Hi {ownerName},

Congratulations! 🎉

We’re excited to let you know that you’ve been selected as a vendor for **{eventTitle}**, taking place on **{eventDate}** at **{venue}**!

We’re looking forward to having you be part of this year’s experience.

## Stall Fee & Confirmation

Our vendor participation fee is a flat rate of **₦180,000**, with zero commission on sales. All revenue generated from your stall is entirely yours!

If you’re happy to proceed, kindly reply to this email confirming your acceptance by **Friday, 6th November 2026**, and we’ll share the payment details to secure your spot.

Please note that the payment deadline is **Sunday, 15th November 2026**.

## Event Sponsorships

As we finalise partnerships for this year’s event, we wanted to make you aware that some of our official sponsors, including a potential financial partner, may have certain requirements for participating vendors. These could include a simple onboarding process or the use of a designated POS system during the event.

Nothing has been finalised at this stage, and we want to assure you that any requirements will be reasonable, clearly communicated in advance and designed to minimise disruption to your operations.

Please also confirm that you’re comfortable with this in principle, subject to the specific requirements being shared with you.

## Next Steps

Kindly reply by **6th November** confirming your acceptance of the stall fee and acknowledging the potential sponsor requirements.

Once we receive your confirmation, we’ll share the payment details. Full payment must be completed by **15th November** to officially secure your spot.

Following payment confirmation, our team will be in touch with stall allocations, setup requirements and further event logistics.

We can’t wait to bring {eventTitle} to life with you!

Warm regards,
**The Dine At Night Team**`,
  },
  mini_market: {
    subject: "{eventTitle}: the Mini Market ({brandName})",
    preview: "You’ve been selected for the Mini Market at {eventTitle}, {eventDate}, {venue}.",
    body: `Hi {ownerName},

Congratulations! 🎉

We’re excited to let you know that **{brandName}** has been selected for the **Mini Market** at **{eventTitle}**, taking place on **{eventDate}** at **{venue}**!

## What is the Mini Market?

[Describe the Mini Market concept here — what it is and how it differs from a standard stall.]

## Participation Fee

[Add the Mini Market fee, what it includes, and whether there is any commission on sales.]

If you’re happy to proceed, kindly reply to this email confirming your acceptance by **[acceptance deadline]**, and we’ll share the payment details to secure your spot.

Please note that the payment deadline is **[payment deadline]**.

## Next Steps

Once we receive your confirmation, we’ll share the payment details. Following payment confirmation, our team will be in touch with setup requirements and further event logistics.

We can’t wait to bring {eventTitle} to life with you!

Warm regards,
**The Dine At Night Team**`,
  },
};

/** "[Describe the Mini Market…]"-style gaps still left in the text. */
export function findPlaceholders(t: Pick<VendorEmailTemplate, "subject" | "preview" | "body">): string[] {
  const text = `${t.subject}\n${t.preview}\n${t.body}`;
  return Array.from(new Set(text.match(/\[[^\]\n]{3,}\]/g) ?? []));
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Replaces {field} with its value; unknown fields are left as written. */
export function fillFields(text: string, vars: Partial<TemplateVars>, escape = false): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key as keyof TemplateVars];
    if (value === undefined) return match;
    return escape ? escapeHtml(value) : value;
  });
}

/** Fills a one-line field (subject / preview) as plain text. */
export const renderLine = (text: string, vars: Partial<TemplateVars>) =>
  fillFields(text, vars).replace(/\*\*/g, "").trim();

/** The template body as email-safe HTML (paragraphs, headings, bold). */
export function renderBodyHtml(body: string, vars: Partial<TemplateVars>, accent = "#00FF41"): string {
  const bold = (html: string) => html.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#ccc;">$1</strong>');
  // Escape the template first, then fill escaped values, so neither can inject HTML
  const toHtml = (text: string) => bold(fillFields(escapeHtml(text), vars, true));
  const heading = (text: string) =>
    `<p style="margin:28px 0 10px;color:${accent};font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">${toHtml(text)}</p>`;
  const paragraph = (text: string) =>
    `<p style="margin:0 0 16px;color:#888;font-size:14px;line-height:1.7;">${toHtml(text).replace(/\n/g, "<br/>")}</p>`;

  return body
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (!block.startsWith("## ")) return paragraph(block);
      // "## Heading" may be followed directly by text without a blank line
      const [first, ...rest] = block.split("\n");
      return heading(first.slice(3).trim()) + (rest.length ? `\n${paragraph(rest.join("\n").trim())}` : "");
    })
    .join("\n");
}

/** The template body as the plain-text part of the email. */
export function renderBodyText(body: string, vars: Partial<TemplateVars>): string {
  return fillFields(body.replace(/\r\n/g, "\n"), vars)
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^## (.*)$/gm, (_, h: string) => h.toUpperCase())
    .trim();
}
