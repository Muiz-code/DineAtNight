import VendorsClient from "./VendorsClient";
import { getPublicVendors } from "@/lib/publicData";
import type { PublicVendor } from "@/lib/firestore";

// ISR: render on the server, cache the HTML, refresh at most once a minute.
export const revalidate = 60;

export default async function VendorsPage() {
  let vendors: PublicVendor[] | null = null;
  try {
    vendors = await getPublicVendors();
  } catch (err) {
    // e.g. FIREBASE_SERVICE_ACCOUNT missing at build time — the client fetches instead
    console.error("[/vendors] server render failed, falling back to client fetch:", err);
  }
  return <VendorsClient initialVendors={vendors} />;
}
