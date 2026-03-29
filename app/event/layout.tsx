import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Get Tickets",
  description:
    "Secure your tickets to Dine At Night, Lagos's premier nighttime food market. Limited spots available — don't miss out.",
  keywords: [
    "Dine At Night tickets", "Lagos food event tickets", "buy night market tickets Lagos",
    "night food festival tickets Nigeria", "Lagos event tickets online",
    "Dine at Night event dates", "Lagos food festival 2025", "night dining Lagos tickets",
    "Lagos outdoor event tickets", "upcoming food events Lagos",
    "night market tickets Nigeria", "Lagos night event",
  ],
  alternates: { canonical: "/event" },
  openGraph: {
    title: "Get Tickets — Dine At Night",
    description:
      "Secure your tickets to Dine At Night, Lagos's premier nighttime food market. Limited spots available.",
    url: "/event",
  },
};

export default function EventLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
