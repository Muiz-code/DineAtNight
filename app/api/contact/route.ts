import { NextRequest, NextResponse } from "next/server";
import { resend, FROM, ADMIN_EMAIL } from "@/lib/resend";
import { contactAutoReplyEmail, contactAdminEmail } from "@/lib/emails";

export async function POST(req: NextRequest) {
  try {
    const { name, email, topic, message } = await req.json();

    if (!name || !email || !topic || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const data = { name, email, topic, message };

    // Send both emails concurrently
    await Promise.all([
      // Auto-reply to the sender
      resend.emails.send({
        from: FROM,
        to: email,
        subject: `We got your message — Dine At Night`,
        html: contactAutoReplyEmail(data),
      }),
      // Internal notification to the DAN team
      resend.emails.send({
        from: FROM,
        to: ADMIN_EMAIL,
        replyTo: email,
        subject: `[Contact] ${topic} — from ${name}`,
        html: contactAdminEmail(data),
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact]", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
