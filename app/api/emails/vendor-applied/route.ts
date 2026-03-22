import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { sendVendorAppliedEmail, notifyAdminVendorApplied } from "@/lib/resend";
import { VENDOR_APPLY_RATE_LIMIT, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";

/** POST /api/emails/vendor-applied — fires both user confirmation and admin notification. */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!(await checkRateLimit(`vendor-apply:${ip}`, VENDOR_APPLY_RATE_LIMIT, RATE_LIMIT_WINDOW_MS))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { ownerName, brandName, email, phone, instagram, categories, description } =
    body as Record<string, string | string[]>;

  if (!ownerName || !brandName || !email) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  await Promise.allSettled([
    sendVendorAppliedEmail({
      ownerName: String(ownerName),
      brandName: String(brandName),
      email: String(email),
      categories: Array.isArray(categories) ? categories : undefined,
    }),
    notifyAdminVendorApplied({
      ownerName: String(ownerName),
      brandName: String(brandName),
      email: String(email),
      phone: phone ? String(phone) : undefined,
      instagram: instagram ? String(instagram) : undefined,
      categories: Array.isArray(categories) ? categories : undefined,
      description: description ? String(description) : undefined,
    }),
  ]);

  return NextResponse.json({ ok: true });
}
