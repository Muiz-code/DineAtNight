import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Dine At Night — Lagos's Premier Nighttime Food Market",
  description:
    "Dine At Night is Lagos's premier nighttime food market — an outdoor experience combining the best local food vendors, live music, and neon-lit vibes. Get your tickets now.",
  alternates: { canonical: "/home" },
};

export default function PagesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
