import { NextRequest, NextResponse } from "next/server";
import { createVendorApplication } from "@/lib/firestore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brandName, ownerName, email, phone, instagram, category, description, products, imageUrl } = body;

    if (!brandName || !ownerName || !email || !phone || !category || !description || !products || !imageUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const id = await createVendorApplication({
      brandName, ownerName, email, phone,
      instagram: instagram ?? "",
      category, description, products, imageUrl,
    });

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("[vendors/apply]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
