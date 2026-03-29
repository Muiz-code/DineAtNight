import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    absolute: "Dine at Night — Nigeria’s first night food market",
  },
  description:
    "Dine at Night is a curated night food market in Lagos, Nigeria, bringing together top food vendors, chefs, and culture for a unique food and nightlife experience.",
  keywords: [
    "Dine At Night", "night food market Lagos", "night dining Lagos",
    "Lagos food event", "night market Lagos", "Lagos nightlife food",
    "street food Lagos", "night out Lagos", "Lagos food festival",
    "after dark dining Lagos", "night market Nigeria", "Lagos date night",
    "outdoor night food market", "Lagos food experience", "things to do in Lagos at night",
  ],
  alternates: { canonical: "https://www.dineatnight.com/home" },
  openGraph: {
    title: "Dine at Night — Nigeria’s first night food market",
    description:
      "Dine at Night is a curated night food market in Lagos, Nigeria, bringing together top food vendors, chefs, and culture for a unique food and nightlife experience.",
    url: "https://www.dineatnight.com/home",
    images: [
      {
        url: "https://www.dineatnight.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Dine At Night — Neon-lit outdoor food market, Lagos",
      },
    ],
  },
};

export default function PagesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
