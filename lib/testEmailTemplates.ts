/**
 * Customer-facing emails that admins can send as samples from /admin/test-emails.
 * Shared by the page (labels) and POST /api/admin/test-email (validation).
 */
export const TEST_EMAIL_TEMPLATES = [
  { key: "vendor-approved", label: "Vendor — selected (approval)", group: "Vendors" },
  { key: "vendor-declined", label: "Vendor — not selected (decline / revoke)", group: "Vendors" },
  { key: "vendor-revoked", label: "Vendor — approval revoked (old template)", group: "Vendors" },
  { key: "vendor-applied", label: "Vendor — application received", group: "Vendors" },
  { key: "ticket-confirmation", label: "Ticket — confirmation (creates a scannable test ticket)", group: "Tickets & shop" },
  { key: "order-dispatched", label: "Shop order — dispatched", group: "Tickets & shop" },
  { key: "order-delivered", label: "Shop order — delivered", group: "Tickets & shop" },
  { key: "order-returned", label: "Shop order — returned", group: "Tickets & shop" },
  { key: "contact-confirmation", label: "Contact form — message received", group: "Other" },
  { key: "newsletter-welcome", label: "Newsletter — welcome", group: "Other" },
] as const;

export type TestEmailTemplate = (typeof TEST_EMAIL_TEMPLATES)[number]["key"];

export function isTestEmailTemplate(value: unknown): value is TestEmailTemplate {
  return TEST_EMAIL_TEMPLATES.some((t) => t.key === value);
}
