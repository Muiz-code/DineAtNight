import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { notifyAdminContact, sendContactConfirmationEmail } from "@/lib/resend";
import { CONTACT_RATE_LIMIT, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!(await checkRateLimit(`contact:${ip}`, CONTACT_RATE_LIMIT, RATE_LIMIT_WINDOW_MS))) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { name, email, topic, message } = body as Record<string, string>;

  if (!name || typeof name !== "string" || name.trim().length < 2 || name.length > 100) {
    return NextResponse.json({ error: "Invalid name." }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }
  if (!topic || typeof topic !== "string" || topic.trim().length < 2 || topic.length > 100) {
    return NextResponse.json({ error: "Invalid topic." }, { status: 400 });
  }
  if (!message || typeof message !== "string" || message.trim().length < 10 || message.length > 5000) {
    return NextResponse.json({ error: "Message must be between 10 and 5000 characters." }, { status: 400 });
  }

  // Fire both emails in parallel — neither failure blocks the user response
  await Promise.allSettled([
    notifyAdminContact({ name: name.trim(), email, topic: topic.trim(), message: message.trim() }),
    sendContactConfirmationEmail({ name: name.trim(), email, topic: topic.trim() }),
  ]);

  return NextResponse.json({ ok: true });
}
