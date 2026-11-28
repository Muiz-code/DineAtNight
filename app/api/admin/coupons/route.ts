import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/session";
import { createCouponCampaign, listCouponCampaigns } from "@/lib/couponAdmin";

/** GET /api/admin/coupons — every coupon campaign, newest first. Admin-only. */
export async function GET(req: NextRequest) {
  if (!(await getAdminEmail(req))) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  try {
    return NextResponse.json({ campaigns: await listCouponCampaigns() }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[admin/coupons GET]", err);
    return NextResponse.json({ error: "Couldn't load coupon campaigns. Please refresh." }, { status: 500 });
  }
}

/** POST /api/admin/coupons — create a campaign and its codes. Admin-only. */
export async function POST(req: NextRequest) {
  const admin = await getAdminEmail(req);
  if (!admin) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const campaign = await createCouponCampaign(body, admin);
    return NextResponse.json({ campaign });
  } catch (err) {
    console.error("[admin/coupons POST]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't create the campaign." }, { status: 400 });
  }
}
