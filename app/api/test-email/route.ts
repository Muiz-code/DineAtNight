import { NextRequest, NextResponse } from "next/server";
import { resend, FROM } from "@/lib/resend";

export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to");

  if (!to) {
    return NextResponse.json({ error: "Pass ?to=your@email.com in the URL" }, { status: 400 });
  }

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "Dine At Night — Resend Test ✅",
    html: `
      <div style="background:#0a0a0a;padding:40px;font-family:sans-serif;color:#fff;">
        <h1 style="color:#FFFF00;">Resend is working! 🎉</h1>
        <p style="color:#aaa;">Your email integration for Dine At Night is set up correctly.</p>
      </div>
    `,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}
