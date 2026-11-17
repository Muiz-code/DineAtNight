import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { generateUnsubscribeUrl } from "@/lib/resend";
import { getAdminEmail } from "@/lib/session";
import { broadcastHeaders, renderBroadcastEmail } from "@/lib/broadcastEmail";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "hello@dineatnight.com";
const FROM = `Dine At Night <${FROM_EMAIL}>`;
const BATCH_SIZE = 50;

export async function POST(req: NextRequest) {
  if (!(await getAdminEmail(req))) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  // Created per request: the SDK throws on a missing key, which would crash the route
  if (!process.env.RESEND_API_KEY) {
    console.error("[newsletter] RESEND_API_KEY is not set");
    return NextResponse.json({ error: "Emails can't be sent right now. Please contact the site developer." }, { status: 500 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { emails, subject, body, linkUrl, linkLabel, audience } = await req.json();
    const isVendorSend = audience === "vendors";

    if (!Array.isArray(emails) || emails.length === 0)
      return NextResponse.json({ error: "No recipients" }, { status: 400 });
    if (!subject?.trim() || !body?.trim())
      return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });

    const validEmails: string[] = emails.filter((e: unknown) => typeof e === "string" && e.includes("@"));
    if (validEmails.length === 0)
      return NextResponse.json({ error: "No valid email addresses" }, { status: 400 });

    const sub = subject.trim();
    const msg = body.trim();

    // Pre-generate per-recipient unsubscribe URLs (async HMAC) — newsletter sends only
    const emailData = await Promise.all(
      validEmails.map(async (to) => {
        const unsubUrl = isVendorSend ? null : await generateUnsubscribeUrl(to);
        const { html, text } = renderBroadcastEmail({
          subject: sub,
          body: msg,
          linkUrl: linkUrl || undefined,
          linkLabel: linkLabel || undefined,
          unsubscribeUrl: unsubUrl,
        });
        return { to, html, text, headers: broadcastHeaders(unsubUrl) };
      })
    );

    let sent = 0;
    let failed = 0;
    for (let i = 0; i < emailData.length; i += BATCH_SIZE) {
      const batch = emailData.slice(i, i + BATCH_SIZE);
      const { error } = await resend.batch.send(
        batch.map(({ to, html, text, headers }) => ({
          from: FROM,
          to,
          subject: sub,
          html,
          text,
          ...(headers ? { headers } : {}),
        }))
      );
      if (error) {
        console.error(`[newsletter] batch starting at ${i} failed:`, error);
        failed += batch.length;
      } else {
        sent += batch.length;
      }
    }

    if (sent === 0) {
      return NextResponse.json({ error: "Email provider rejected the send. Nothing was delivered." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, sent, failed, recipients: validEmails });
  } catch (err) {
    console.error("[newsletter]", err);
    return NextResponse.json({ error: "Failed to send newsletter" }, { status: 500 });
  }
}
