import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Shop — Merch & Accessories",
  description:
    "Shop official Dine At Night merch — limited edition tees, hoodies, caps and more. Represent the night.",
  keywords: [
    "Dine At Night merch", "DAN merchandise", "Lagos event merch",
    "night market merchandise", "Dine at Night hoodie", "Dine at Night t-shirt",
    "Lagos food festival merch", "Nigerian event merchandise",
    "DAN hoodie", "DAN tshirt", "Lagos streetwear", "night market clothing Nigeria",
  ],
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "DAN Merch Shop — Dine At Night",
    description:
      "Limited edition Dine At Night merch. Tees, hoodies, caps and more — rep the night.",
    url: "/shop",
  },
};

export default function ShopLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
