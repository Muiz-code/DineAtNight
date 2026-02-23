import emailjs from "@emailjs/browser";

const SERVICE       = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!;
const PUB_KEY       = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!;
const T_CONTACT     = process.env.NEXT_PUBLIC_EMAILJS_CONTACT_TEMPLATE!;
const T_VENDOR      = process.env.NEXT_PUBLIC_EMAILJS_VENDOR_TEMPLATE!;

/** Contact form — sends to DAN team */
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

/** Vendor application received — confirmation to vendor */
export async function sendVendorAppliedEmail(data: {
  ownerName:  string;
  brandName:  string;
  email:      string;
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
        `.\n\nOur vendor relations team reviews every application carefully and we'll get back to you within 5 business days.\n\nFollow us on Instagram @dineatnight.ng for updates.`,
    },
    PUB_KEY,
  );
}

/** Vendor approved or declined — sends to vendor */
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
        ? `Congratulations! ${data.brandName} has been approved to vend at Dine At Night.\n\nOur team will reach out with your spot assignment, setup time, and logistics as the event date approaches. Keep an eye on your inbox and DMs.\n\nSee you on the floor! 🌙`
        : `Thank you for applying. After reviewing your application for ${data.brandName}, we're unable to offer you a spot at this edition.` +
          (data.declineReason ? `\n\nFeedback: ${data.declineReason}` : "") +
          `\n\nThis doesn't close the door permanently — we encourage you to reapply for future editions.`,
    },
    PUB_KEY,
  );
}
