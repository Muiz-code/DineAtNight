import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Get Tickets",
  description:
    "Secure your tickets to Dine At Night, Lagos's premier nighttime food market. Limited spots available — don't miss out.",
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
