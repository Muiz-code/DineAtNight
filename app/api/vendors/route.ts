import { NextResponse } from "next/server";
import { getPublicVendors } from "@/lib/publicData";

/**
 * GET /api/vendors — approved vendors for the public site.
 *
 * Vendor documents also hold private data (owner name, review history,
 * decline reasons, re-application snapshots), so security rules make them
 * admin-only. getPublicVendors() reads them with the Admin SDK and returns
 * only whitelisted public fields. The /vendors page renders the same data on
 * the server; this route serves client-side refreshes and the home page.
 */
export async function GET() {
  try {
    const vendors = await getPublicVendors();
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
