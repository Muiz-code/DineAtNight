import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    absolute:
      "Dine at Night - Nigeria’s first night food market | Dine At Night",
  },
  description:
    "Dine at Night is a curated night food market in Lagos, Nigeria, bringing together top food vendors, chefs, and culture for a unique food and nightlife experience.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Dine at Night - Nigeria’s first night food market | Dine At Night",
    description:
      "Dine at Night is a curated night food market in Lagos, Nigeria, bringing together top food vendors, chefs, and culture for a unique food and nightlife experience.",
    url: "/",
  },
};

export default function PagesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
