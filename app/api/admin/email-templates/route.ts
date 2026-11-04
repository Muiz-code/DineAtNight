import { NextRequest, NextResponse } from "next/server";
import { adminNameFor, getAdminEmail } from "@/lib/session";
import {
  isVendorPackage,
  listVendorTemplates,
  parseTemplate,
  resetVendorTemplate,
  saveVendorTemplate,
} from "@/lib/emailTemplates";

/** GET /api/admin/email-templates — the vendor approval templates (saved or default). */
export async function GET(req: NextRequest) {
  if (!(await getAdminEmail(req))) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  return NextResponse.json({ templates: await listVendorTemplates() });
}

/**
 * POST /api/admin/email-templates
 *   { package, subject, preview, body }  save
 *   { package, reset: true }             back to the built-in wording
 */
export async function POST(req: NextRequest) {
  const adminEmail = await getAdminEmail(req);
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!isVendorPackage(body.package)) {
    return NextResponse.json({ error: "Unknown template." }, { status: 400 });
  }

  if (body.reset === true) {
    await resetVendorTemplate(body.package);
    return NextResponse.json({ ok: true });
  }

  const parsed = parseTemplate(body);
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });
  await saveVendorTemplate(body.package, parsed, adminNameFor(adminEmail) ?? adminEmail);
  return NextResponse.json({ ok: true });
}
