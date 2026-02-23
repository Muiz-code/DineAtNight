import { NextRequest, NextResponse } from "next/server";

// Contact form emails are sent client-side via EmailJS (lib/emailjs.ts).
// This route is kept as a no-op stub so any legacy callers don't 404.
export async function POST(_req: NextRequest) {
  return NextResponse.json({ ok: true });
}
