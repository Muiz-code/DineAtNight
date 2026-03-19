import type { Metadata } from "next";
import { Poppins, Anton, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Navbar from "./_components/Navbar";
import ScrollProgressBar from "./_components/ScrollProgressBar";
import { Analytics } from "@vercel/analytics/next";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://dineatnight.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),

  applicationName: "Dine At Night", // ✅ correct placement

  title: {
    default: "Dine at Night - Nigeria’s first night food market",
    template: "%s | Dine At Night",
  },

  description:
    "Dine at Night is a curated night food market in Lagos, Nigeria, bringing together top food vendors, chefs, and culture for a unique food and nightlife experience.",

  keywords: [
    "Dine At Night",
    "Lagos food market",
    "nighttime food festival",
    "Lagos events",
    "street food Lagos",
    "food vendors Lagos",
    "Lagos nightlife",
    "food festival Nigeria",
    "outdoor food market Lagos",
    "Lagos food experience",
  ],

  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "/",
    siteName: "Dine At Night",
    title: "Dine at Night - Nigeria’s first night food market | Dine At Night",
    description:
      "Dine at Night is a curated night food market in Lagos, Nigeria, bringing together top food vendors, chefs, and culture for a unique food and nightlife experience.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Dine At Night — Neon-lit outdoor food market, Lagos",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title:
      "Dine at Night is a curated night food market in Lagos, Nigeria, bringing together top food vendors, chefs, and culture for a unique food and nightlife experience.",
    site: "@dineatnight",
    description:
      "Lagos's premier nighttime food market. Local vendors, music, neon-lit vibes. Get your tickets now.",
    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link
          rel="dns-prefetch"
          href="https://firebasestorage.googleapis.com"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Dine At Night",
              url: "https://dineatnight.com",
            }),
          }}
        />
      </head>
      <body
        className={`${poppins.variable} ${anton.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <ScrollProgressBar />
        <Navbar />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
