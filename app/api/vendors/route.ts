import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import type { DanVendor, PublicVendor } from "@/lib/firestore";

/**
 * GET /api/vendors — approved vendors for the public site.
 *
 * Vendor documents also hold private data (owner name, review history,
 * decline reasons, re-application snapshots), so security rules make them
 * admin-only. This route reads them with the Admin SDK and returns ONLY the
 * whitelisted public fields below. The business contact email/phone and the
 * menu (price list) are public by design so customers can reach vendors.
 */
export async function GET() {
  try {
    const snap = await adminDb().collection("vendors").where("status", "==", "approved").get();
    const vendors: PublicVendor[] = snap.docs.map((d) => {
      const v = d.data() as DanVendor;
      return {
        id: d.id,
        brandName: v.brandName,
        description: v.description ?? "",
        imageUrl: v.imageUrl ?? "",
        ...(v.imageUrls ? { imageUrls: v.imageUrls } : {}),
        ...(v.logoUrl ? { logoUrl: v.logoUrl } : {}),
        ...(v.categories ? { categories: v.categories } : {}),
        ...(v.category ? { category: v.category } : {}),
        ...(v.events ? { events: v.events } : {}),
        ...(v.products ? { products: v.products } : {}),
        ...(v.instagram ? { instagram: v.instagram } : {}),
        ...(v.email ? { email: v.email } : {}),
        ...(v.phone ? { phone: v.phone } : {}),
        ...(v.menu ? { menu: v.menu } : {}),
      };
    });
    return NextResponse.json(
      { vendors },
      // Edge-cache for 60s; serve stale for up to 5 min while refreshing
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (err) {
    console.error("[GET /api/vendors]", err);
    return NextResponse.json({ error: "Failed to load vendors" }, { status: 500 });
  }
}
