import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/session";
import { getCouponCampaign, updateCouponCampaign } from "@/lib/couponAdmin";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/coupons/:id — a campaign with all its codes and who used them. Admin-only. */
export async function GET(req: NextRequest, { params }: Ctx) {
  if (!(await getAdminEmail(req))) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { id } = await params;
  try {
    const found = await getCouponCampaign(id);
    if (!found) return NextResponse.json({ error: "That campaign no longer exists." }, { status: 404 });
    return NextResponse.json(found, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[admin/coupons/:id GET]", err);
    return NextResponse.json({ error: "Couldn't load this campaign. Please refresh." }, { status: 500 });
  }
}

/** PATCH /api/admin/coupons/:id — { name?, active?, expiresAt? }. Admin-only. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  if (!(await getAdminEmail(req))) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    await updateCouponCampaign(id, { name: body.name, active: body.active, expiresAt: body.expiresAt });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/coupons/:id PATCH]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't save the change." }, { status: 400 });
  }
}
