import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { notifyAdminTestimonial } from "@/lib/resend";
import { TESTIMONIAL_RATE_LIMIT, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";

/** POST /api/emails/testimonial-notify — notifies admin of a new user testimonial. */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!(await checkRateLimit(`testimonial:${ip}`, TESTIMONIAL_RATE_LIMIT, RATE_LIMIT_WINDOW_MS))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { name, type, quote, eventTitle } = body as Record<string, string>;

  if (!name || !type || !quote) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (!["vendor", "user"].includes(type)) {
    return NextResponse.json({ error: "Invalid type." }, { status: 400 });
  }

  await notifyAdminTestimonial({
    name,
    type: type as "vendor" | "user",
    quote,
    eventTitle: eventTitle || undefined,
  });

  return NextResponse.json({ ok: true });
}
