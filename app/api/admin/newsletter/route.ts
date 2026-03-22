import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "hello@dineatnight.com";
const FROM = `Dine At Night <${FROM_EMAIL}>`;
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://dineatnight.com").replace(/\/$/, "");

// Resend free plan: max 50 emails/batch. Paid plan: up to 100.
const BATCH_SIZE = 50;

function buildHtml(subject: string, body: string): string {
  // Convert newlines to <br> for plain-text body
  const bodyHtml = body
    .split("\n")
    .map((line) => line.trim())
    .map((line) => (line ? `<p style="margin:0 0 14px;color:#ccc;font-size:15px;line-height:1.7;">${line}</p>` : "<br/>"))
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#000000;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#080808;border:1px solid rgba(255,255,0,0.2);border-radius:16px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:32px 40px 24px;border-bottom:1px solid rgba(255,255,0,0.08);">
              <p style="margin:0 0 4px;color:#FFFF00;font-size:11px;font-weight:700;letter-spacing:0.35em;text-transform:uppercase;text-shadow:0 0 12px rgba(255,255,0,0.4);">DINE AT NIGHT</p>
              <p style="margin:0;color:#333;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;">Lagos Night Food Experience</p>
            </td>
          </tr>

          <!-- Subject -->
          <tr>
            <td style="padding:32px 40px 8px;">
              <h1 style="margin:0;color:#FFFF00;font-size:22px;font-weight:700;letter-spacing:0.05em;text-shadow:0 0 20px rgba(255,255,0,0.3);">${subject}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:16px 40px 36px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:0 40px 36px;">
              <a href="${APP_URL}" style="display:inline-block;padding:14px 36px;background:#FFFF00;color:#000;font-weight:700;font-size:13px;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;border-radius:100px;box-shadow:0 0 24px rgba(255,255,0,0.4);">View Events →</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:20px 40px;border-top:1px solid rgba(255,255,0,0.06);background:#050505;">
              <p style="margin:0 0 4px;color:#2a2a2a;font-size:11px;">© Dine At Night · Lagos, Nigeria</p>
              <p style="margin:0;color:#1a1a1a;font-size:10px;">You received this because you subscribed or purchased a ticket.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  // Verify admin auth via session cookie
  const sessionCookie = req.cookies.get("session")?.value;
  if (!sessionCookie) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const email = await verifyFirebaseIdToken(sessionCookie);
  if (!email) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const { emails, subject, body } = await req.json();

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: "No recipients" }, { status: 400 });
    }
    if (!subject?.trim() || !body?.trim()) {
      return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
    }

    const validEmails: string[] = emails.filter(
      (e: unknown) => typeof e === "string" && e.includes("@")
    );

    if (validEmails.length === 0) {
      return NextResponse.json({ error: "No valid email addresses" }, { status: 400 });
    }

    const html = buildHtml(subject.trim(), body.trim());
    const text = `${subject}\n\n${body}\n\n---\nDine At Night · ${APP_URL}`;

    // Send in batches to respect Resend rate limits
    let sent = 0;
    for (let i = 0; i < validEmails.length; i += BATCH_SIZE) {
      const batch = validEmails.slice(i, i + BATCH_SIZE);
      await resend.batch.send(
        batch.map((to) => ({
          from: FROM,
          to,
          subject: subject.trim(),
          html,
          text,
        }))
      );
      sent += batch.length;
    }

    console.log(`[newsletter] Sent by ${email} to ${sent} recipients: "${subject}"`);
    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    console.error("[newsletter]", err);
    return NextResponse.json({ error: "Failed to send newsletter" }, { status: 500 });
  }
}
