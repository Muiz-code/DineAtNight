import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn the story behind Dine At Night — Lagos's premier outdoor nighttime food market bringing together the best vendors, live music, and unforgettable neon-lit experiences.",
  alternates: { canonical: "/aboutUs" },
  openGraph: {
    title: "About Us — Dine At Night",
    description:
      "The story behind Lagos's premier outdoor nighttime food market.",
    url: "/aboutUs",
  },
};

export default function AboutLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
