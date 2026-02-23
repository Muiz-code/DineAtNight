import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Relive the Dine At Night experience. Browse photos from past editions — the food, the people, the neon-lit vibes.",
  alternates: { canonical: "/gallery" },
  openGraph: {
    title: "Gallery — Dine At Night",
    description:
      "Browse photos from past Dine At Night editions — food, people, and neon-lit vibes.",
    url: "/gallery",
  },
};

export default function GalleryLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
