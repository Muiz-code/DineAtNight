import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/session";
import { parseTemplate } from "@/lib/emailTemplates";
import { renderVendorApprovalEmail } from "@/lib/resend";
import { findPlaceholders } from "@/lib/vendorEmailTemplates";

/**
 * POST /api/admin/email-templates/preview
 *   { template: { subject, preview, body }, ownerName?, brandName?, eventTitle?, eventDate?, venue? }
 * → { subject, html, placeholders } — the exact email a vendor would receive.
 * Renders only; never sends.
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
  const template = parseTemplate(body.template);
  if (typeof template === "string") return NextResponse.json({ error: template }, { status: 400 });

  const str = (k: string) => (typeof body[k] === "string" && body[k] ? (body[k] as string) : undefined);
  const { subject, html } = renderVendorApprovalEmail({
    template,
    ownerName: str("ownerName") ?? "Ada Okafor",
    brandName: str("brandName") ?? "Sample Suya Spot",
    eventTitle: str("eventTitle"),
    eventDate: str("eventDate"),
    venue: str("venue"),
  });
  return NextResponse.json({ subject, html, placeholders: findPlaceholders(template) });
}
