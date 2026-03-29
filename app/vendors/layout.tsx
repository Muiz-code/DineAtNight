import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Our Vendors",
  description:
    "Meet the food vendors at Dine At Night. From street food to gourmet bites — explore the full lineup of Lagos's best culinary talent.",
  keywords: [
    "Dine At Night vendors", "Lagos food vendors", "Nigerian food vendors",
    "Lagos street food vendors", "best food vendors Lagos", "top food vendors Nigeria",
    "Lagos night market vendors", "food stalls Lagos", "Lagos chef vendors",
    "become a vendor Lagos", "vendor application Lagos", "Lagos food stall",
    "Lagos food business", "night market vendor Nigeria",
  ],
  alternates: { canonical: "/vendors" },
  openGraph: {
    title: "Our Vendors — Dine At Night",
    description:
      "From street food to gourmet bites — explore the full vendor lineup at Dine At Night, Lagos.",
    url: "/vendors",
  },
};

export default function VendorsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
