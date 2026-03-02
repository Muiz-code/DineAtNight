import emailjs from "@emailjs/browser";

// ── Environment ───────────────────────────────────────────────────────────────
const SERVICE  = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID               ?? "";
const PUB_KEY  = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY                ?? "";
/** Template 1 — Notification → hardcoded admin inbox */
const T_NOTIFY  = process.env.NEXT_PUBLIC_EMAILJS_NOTIFICATION_TEMPLATE   ?? "";
/** Template 2 — Confirmation → {{to_email}} variable */
const T_CONFIRM = process.env.NEXT_PUBLIC_EMAILJS_CONFIRMATION_TEMPLATE   ?? "";

if (process.env.NODE_ENV !== "production") {
  const missing = [
    !SERVICE  && "NEXT_PUBLIC_EMAILJS_SERVICE_ID",
    !PUB_KEY  && "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY",
    !T_NOTIFY && "NEXT_PUBLIC_EMAILJS_NOTIFICATION_TEMPLATE",
    !T_CONFIRM && "NEXT_PUBLIC_EMAILJS_CONFIRMATION_TEMPLATE",
  ].filter(Boolean);
  if (missing.length) {
    console.warn("[EmailJS] Missing env vars:", missing.join(", "), "— emails will silently fail.");
  }
}

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://dine-at-night.vercel.app"
).replace(/\/$/, "");
const SEP = "──────────────────────────────";

// ── Internal senders ──────────────────────────────────────────────────────────
function notify(params: {
  subject: string;
  message: string;
  from_name: string;
  reply_to: string;
}) {
  return emailjs.send(
    SERVICE,
    T_NOTIFY,
    params,
    PUB_KEY,
  );
}

function confirmUser(params: {
  to_email: string;
  subject: string;
  message: string;
}) {
  return emailjs.send(
    SERVICE,
    T_CONFIRM,
    params,
    PUB_KEY,
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN NOTIFICATIONS  (Template 1 → T_NOTIFY → hardcoded admin inbox)
// ══════════════════════════════════════════════════════════════════════════════

// A. Contact form submitted
export async function notifyAdminContact(data: {
  name: string;
  email: string;
  topic: string;
  message: string;
}) {
  return notify({
    subject: `New Contact: ${data.topic} — ${data.name}`,
    from_name: data.name,
    reply_to: data.email,
    message: `
New contact message received via the Dine At Night website.

${SEP}
From:   ${data.name}
Email:  ${data.email}
Topic:  ${data.topic}
${SEP}

Message:
${data.message}

${SEP}
Reply directly to ${data.name} at ${data.email}.
Sent via dineatnight.com
    `.trim(),
  });
}

// B. Vendor application submitted
export async function notifyAdminVendorApplied(data: {
  ownerName: string;
  brandName: string;
  email: string;
  phone?: string;
  instagram?: string;
  categories?: string[];
  description?: string;
}) {
  return notify({
    subject: `New Vendor Application — ${data.brandName}`,
    from_name: data.ownerName,
    reply_to: data.email,
    message: `
New vendor application received via the Dine At Night website.

${SEP}
Brand:      ${data.brandName}
Owner:      ${data.ownerName}
Email:      ${data.email}${data.phone ? `\nPhone:      ${data.phone}` : ""}${data.instagram ? `\nInstagram:  ${data.instagram}` : ""}${data.categories?.length ? `\nCategories: ${data.categories.join(", ")}` : ""}
${SEP}
${data.description ? `\nDescription:\n${data.description}\n` : ""}
Review at: ${APP_URL}/admin/vendors
Sent via dineatnight.com
    `.trim(),
  });
}

// C. Testimonial posted
export async function notifyAdminTestimonial(data: {
  name: string;
  type: "vendor" | "user";
  quote: string;
  eventTitle?: string;
}) {
  return notify({
    subject: `New Testimonial — ${data.name}`,
    from_name: "Dine At Night Site",
    reply_to: "noreply@dineatnight.com",
    message: `
New testimonial submitted on the Dine At Night website.

${SEP}
Name:  ${data.name}
Type:  ${data.type === "vendor" ? "Vendor" : "Event Attendee"}${data.eventTitle ? `\nEvent: ${data.eventTitle}` : ""}
${SEP}

Review:
"${data.quote}"

${SEP}
Manage at: ${APP_URL}/admin/testimonials
Sent via dineatnight.com
    `.trim(),
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// USER CONFIRMATIONS  (Template 2 → T_CONFIRM → {{to_email}})
// ══════════════════════════════════════════════════════════════════════════════

// 1. Contact thank-you
export async function sendContactConfirmationEmail(data: {
  name: string;
  email: string;
  topic: string;
}) {
  return confirmUser({
    to_email: data.email,
    subject: `We got your message — Dine At Night`,
    message: `
Dear ${data.name},

Thank you for reaching out to Dine At Night.

We have received your message regarding "${data.topic}" and will get back to you within 24–48 hours.

For urgent matters, DM us on any of our social media.

Regards,
Dine At Night Team
${APP_URL}
    `.trim(),
  });
}

// 2. Ticket confirmation
export async function sendTicketConfirmationEmail(data: {
  name: string;
  email: string;
  eventTitle: string;
  eventDate?: Date;
  quantity: number;
  amount: number; // in kobo
  reference: string;
}) {
  const amountNaira = (data.amount / 100).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  });

  return confirmUser({
    to_email: data.email,
    subject: `Your Ticket — ${data.eventTitle} | Dine At Night`,
    message: `
Dear ${data.name},

Your payment has been confirmed. You're officially coming to ${data.eventTitle}!

${SEP}
Event:      ${data.eventTitle}${data.eventDate ? `\nDate:       ${data.eventDate.toDateString()}` : ""}
Tickets:    ${data.quantity}×
Amount:     ${amountNaira}
Reference:  ${data.reference}
${SEP}

Your e-ticket with QR code is ready. Show it at the gate for entry.

View your ticket: ${APP_URL}/tickets/${data.reference}

See you under the neon lights!

Dine At Night Team
${APP_URL}
    `.trim(),
  });
}

// 3. Vendor application received (user acknowledgement)
export async function sendVendorAppliedEmail(data: {
  ownerName: string;
  brandName: string;
  email: string;
  categories?: string[];
}) {
  return confirmUser({
    to_email: data.email,
    subject: `Application Received — ${data.brandName} | Dine At Night`,
    message: `
Dear ${data.ownerName},

Your application for ${data.brandName} has been received.

We review all applications carefully and will get back to you within 3–5 business days.

What happens next:
1. Application received — your details are in our system
2. Review (3–5 business days) — our team reviews every application carefully
3. Decision email — we will notify you with the outcome

Follow us for updates: @dineatnight on Instagram.

Dine At Night Team
${APP_URL}
    `.trim(),
  });
}

// 4. Vendor status — approved / declined / revoked
export async function sendVendorStatusEmail(data: {
  ownerName: string;
  brandName: string;
  email: string;
  status: "approved" | "declined" | "revoked";
  reason?: string;
}) {
  let subject: string;
  let message: string;

  if (data.status === "approved") {
    subject = `You're approved — ${data.brandName} | Dine At Night`;
    message = `
Dear ${data.ownerName},

Great news! ${data.brandName} has been approved to vend at Dine At Night.

Our team will reach out with your spot assignment, setup time, and logistics details as the event date approaches. Keep an eye on your inbox and Instagram DMs.

See you on the floor!

Dine At Night Team
${APP_URL}/event
    `.trim();
  } else if (data.status === "declined") {
    subject = `Application update — ${data.brandName} | Dine At Night`;
    message = `
Dear ${data.ownerName},

Thank you for your interest in vending at Dine At Night.

After carefully reviewing your application for ${data.brandName}, we are unable to offer a vendor spot at this edition.
${data.reason ? `\nReason:\n${data.reason}\n` : ""}
This is not the end — we run multiple editions a year and you are welcome to reapply for a future edition.

Dine At Night Team
${APP_URL}/vendors
    `.trim();
  } else {
    subject = `Approval revoked — ${data.brandName} | Dine At Night`;
    message = `
Dear ${data.ownerName},

We are writing to let you know that the previously granted approval for ${data.brandName} to vend at Dine At Night has been revoked.
${data.reason ? `\nReason:\n${data.reason}\n` : ""}
Your spot for this edition is no longer reserved. If circumstances change or you would like to be considered for a future edition, you are welcome to reapply.

We apologise for any inconvenience caused.

Dine At Night Team
${APP_URL}/vendors
    `.trim();
  }

  return confirmUser({ to_email: data.email, subject, message });
}

// 5. Newsletter welcome
export async function sendNewsletterWelcomeEmail(email: string) {
  return confirmUser({
    to_email: email,
    subject: `Welcome to Dine At Night`,
    message: `
You are now on the Dine At Night list!

You will be the first to know about new event dates, vendor reveals, early bird tickets, and exclusive announcements.

What you will get:
- Early bird ticket drops before public sale
- Exclusive vendor lineup reveals
- Event date announcements first
- Behind-the-scenes content

See upcoming events: ${APP_URL}/event

Dine At Night Team
${APP_URL}
    `.trim(),
  });
}

// 6. Order delivery status update
export async function sendOrderStatusEmail(data: {
  name: string;
  email: string;
  reference: string;
  deliveryStatus: "dispatched" | "delivered" | "returned";
  note?: string;
}) {
  const statusLabel: Record<typeof data.deliveryStatus, string> = {
    dispatched: "Dispatched",
    delivered:  "Delivered",
    returned:   "Returned",
  };

  const messages: Record<typeof data.deliveryStatus, string> = {
    dispatched: `
Dear ${data.name},

Your Dine At Night merch order is on its way!

${SEP}
Reference:  ${data.reference}
Status:     Dispatched
${SEP}

Your package has been handed to our courier and is en route to your delivery address. You should receive it within the next few days.

Track your order status: ${APP_URL}/shop/verify?reference=${data.reference}

Dine At Night Team
${APP_URL}
    `.trim(),

    delivered: `
Dear ${data.name},

Your Dine At Night merch order has been delivered!

${SEP}
Reference:  ${data.reference}
Status:     Delivered
${SEP}

We hope you love your merch. Thanks for shopping with us — see you at the next event!

Dine At Night Team
${APP_URL}
    `.trim(),

    returned: `
Dear ${data.name},

We're writing to let you know that your order has been marked as returned.

${SEP}
Reference:  ${data.reference}
Status:     Returned${data.note ? `\nNote:       ${data.note}` : ""}
${SEP}

If you have questions about this, please reach out via our contact page and quote your reference number.

Contact us: ${APP_URL}/contact

Dine At Night Team
${APP_URL}
    `.trim(),
  };

  return confirmUser({
    to_email: data.email,
    subject: `Order ${statusLabel[data.deliveryStatus]} — ${data.reference} | Dine At Night`,
    message: messages[data.deliveryStatus],
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTACT FORM — fires both admin notification + user confirmation in parallel
// ══════════════════════════════════════════════════════════════════════════════
export async function sendContactEmail(data: {
  name: string;
  email: string;
  topic: string;
  message: string;
}) {
  await Promise.allSettled([
    notifyAdminContact(data),
    sendContactConfirmationEmail({
      name: data.name,
      email: data.email,
      topic: data.topic,
    }),
  ]);
}
