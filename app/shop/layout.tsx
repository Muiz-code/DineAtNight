import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Shop — Merch & Accessories",
  description:
    "Shop official Dine At Night merch — limited edition tees, hoodies, caps and more. Represent the night.",
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
