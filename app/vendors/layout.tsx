import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Our Vendors",
  description:
    "Meet the food vendors at Dine At Night. From street food to gourmet bites — explore the full lineup of Lagos's best culinary talent.",
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
