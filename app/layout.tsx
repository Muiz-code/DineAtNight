import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import Navbar from "./_components/Navbar";
// import Footer from "./_components/Footer";
// import ScrollToTop from "./_components/ScrollToTop";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://dineatnight.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),

  title: {
    default: "Dine At Night — Lagos's Premier Nighttime Food Market",
    template: "%s | Dine At Night",
  },

  description:
    "Dine At Night is Lagos's premier nighttime food market — an outdoor experience combining the best local food vendors, live music, and neon-lit vibes. Get your tickets now.",

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
    title: "Dine At Night — Lagos's Premier Nighttime Food Market",
    description:
      "Lagos's premier nighttime food market. Local vendors, live music, neon-lit vibes. Get your tickets now.",
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
    title: "Dine At Night — Lagos's Premier Nighttime Food Market",
    description:
      "Lagos's premier nighttime food market. Local vendors, live music, neon-lit vibes. Get your tickets now.",
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
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} antialiased`}>
        {/* <ScrollToTop /> */}
        <Navbar />
        {children}
        {/* <Footer /> */}
      </body>
    </html>
  );
}
