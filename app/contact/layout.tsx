import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the Dine At Night team. Questions, vendor enquiries, sponsorships, or press — we'd love to hear from you.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Us — Dine At Night",
    description:
      "Reach out to the Dine At Night team for vendor enquiries, sponsorships, or press.",
    url: "/contact",
  },
};

export default function ContactLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
