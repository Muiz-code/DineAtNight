import emailjs from "@emailjs/browser";

const SERVICE   = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!;
const PUB_KEY   = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!;
const T_CONTACT = process.env.NEXT_PUBLIC_EMAILJS_CONTACT_TEMPLATE!;
const T_VENDOR  = process.env.NEXT_PUBLIC_EMAILJS_VENDOR_TEMPLATE!;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://dineatnight.com";

/* ── Contact form — sends to DAN team ──────────────────────────────── */
export async function sendContactEmail(data: {
  name: string;
  email: string;
  topic: string;
  message: string;
}) {
  return emailjs.send(
    SERVICE,
    T_CONTACT,
    {
      from_name:  data.name,
      from_email: data.email,
      topic:      data.topic,
      message:    data.message,
      reply_to:   data.email,
    },
    PUB_KEY,
  );
}

/* ── Ticket confirmation — sent from verify page after payment ──────── */
export async function sendTicketConfirmationEmail(data: {
  name: string;
  email: string;
  eventTitle: string;
  quantity: number;
  amount: number; // kobo
  reference: string;
}) {
  const amountNaira = (data.amount / 100).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  });

  // The QR code value matches what the ticket page and gate scanner expects
  const qrValue = `${APP_URL}/admin/confirm?ref=${data.reference}`;
  const qrUrl =
    `https://api.qrserver.com/v1/create-qr-code/` +
    `?size=250x250&data=${encodeURIComponent(qrValue)}&bgcolor=ffffff&color=000000&qzone=2`;

  return emailjs.send(
    SERVICE,
    T_VENDOR,
    {
      to_email:   data.email,
      owner_name: data.name,
      subject:    `🎟️ Your Dine At Night Ticket — ${data.eventTitle}`,
      message:
        `Your payment is confirmed! Here are your ticket details:<br><br>` +
        `<strong>Event:</strong> ${data.eventTitle}<br>` +
        `<strong>Tickets:</strong> ${data.quantity}x<br>` +
        `<strong>Amount Paid:</strong> ${amountNaira}<br>` +
        `<strong>Reference:</strong> ${data.reference}<br><br>` +
        `<strong>Your QR Code — scan this at the gate:</strong><br>` +
        `<img src="${qrUrl}" alt="Ticket QR Code" width="200" height="200" ` +
        `style="display:block;margin:12px 0;border:4px solid white;border-radius:8px;" /><br>` +
        `<a href="${APP_URL}/tickets/${data.reference}">View full e-ticket online</a><br><br>` +
        `See you under the neon lights! 🌙`,
    },
    PUB_KEY,
  );
}

/* ── Newsletter welcome — sent after successful subscription ────────── */
export async function sendNewsletterWelcomeEmail(email: string) {
  return emailjs.send(
    SERVICE,
    T_VENDOR,
    {
      to_email:   email,
      owner_name: "Night Owl",
      subject:    "Welcome to the Dine At Night community 🌙",
      message:
        `You've joined the Dine At Night community!\n\n` +
        `You'll be the first to know about new event dates, vendor reveals, ` +
        `early bird tickets, and exclusive announcements.\n\n` +
        `See upcoming events at:\n${APP_URL}/event`,
    },
    PUB_KEY,
  );
}

/* ── Vendor application received — confirmation to vendor ───────────── */
export async function sendVendorAppliedEmail(data: {
  ownerName:   string;
  brandName:   string;
  email:       string;
  categories?: string[];
}) {
  return emailjs.send(
    SERVICE,
    T_VENDOR,
    {
      to_email:   data.email,
      owner_name: data.ownerName,
      subject:    `Application Received — ${data.brandName}`,
      message:
        `We received your application for ${data.brandName}` +
        (data.categories?.length ? ` (${data.categories.join(", ")})` : "") +
        `.\n\nOur vendor relations team reviews every application carefully ` +
        `and we'll get back to you within 5 business days.\n\n` +
        `Follow us on Instagram @dineatnight.ng for updates.`,
    },
    PUB_KEY,
  );
}

/* ── Vendor approved or declined — sends to vendor ──────────────────── */
export async function sendVendorStatusEmail(data: {
  ownerName:      string;
  brandName:      string;
  email:          string;
  status:         "approved" | "declined";
  declineReason?: string;
}) {
  const isApproved = data.status === "approved";

  return emailjs.send(
    SERVICE,
    T_VENDOR,
    {
      to_email:   data.email,
      owner_name: data.ownerName,
      subject:    isApproved
        ? `✅ You're approved to vend at Dine At Night!`
        : `Update on your Dine At Night application`,
      message: isApproved
        ? `Congratulations! ${data.brandName} has been approved to vend at Dine At Night.\n\n` +
          `Our team will reach out with your spot assignment, setup time, and logistics ` +
          `as the event date approaches. Keep an eye on your inbox and DMs.\n\n` +
          `See you on the floor! 🌙`
        : `Thank you for applying. After reviewing your application for ${data.brandName}, ` +
          `we're unable to offer you a spot at this edition.` +
          (data.declineReason ? `\n\nFeedback: ${data.declineReason}` : "") +
          `\n\nThis doesn't close the door permanently — we encourage you to reapply for future editions.`,
    },
    PUB_KEY,
  );
}
