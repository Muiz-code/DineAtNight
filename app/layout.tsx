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
    // Brand
    "Dine At Night",
    "DAN Lagos",
    "dine at night Lagos",
    "dineatnight",
    // Core concept
    "night food market Lagos",
    "nighttime food festival Lagos",
    "night food market Nigeria",
    "night market Lagos",
    "night market Nigeria",
    "outdoor night food market",
    "neon food market Lagos",
    // Night dining
    "night dining Lagos",
    "night dining experience Lagos",
    "after dark dining Lagos",
    "late night food Lagos",
    "night eats Lagos",
    "night bites Lagos",
    "night food event Lagos",
    "night food festival Nigeria",
    "night food vendors Lagos",
    "night out food Lagos",
    "Lagos night out food",
    "night street food Lagos",
    "night food stalls Lagos",
    "evening food market Lagos",
    // Food events
    "Lagos food event",
    "Lagos food festival",
    "Lagos food festival 2025",
    "food festival Nigeria",
    "food event Lagos",
    "Lagos outdoor food event",
    "Lagos pop up food event",
    "pop up dinner Lagos",
    "Lagos food gathering",
    "food and music Lagos",
    "food and drinks Lagos",
    // Street food / vendors
    "street food Lagos",
    "Lagos street food",
    "Lagos street eats",
    "food vendors Lagos",
    "Lagos food vendors",
    "food stalls Lagos",
    "best food vendors Lagos",
    "top food vendors Nigeria",
    "suya night Lagos",
    "Lagos night hawkers",
    // Nightlife
    "Lagos nightlife",
    "Lagos nightlife food",
    "Lagos night entertainment",
    "night out Lagos",
    "Lagos date night",
    "Lagos night experience",
    "Nigerian nightlife food",
    // Food experience
    "Lagos food experience",
    "Lagos food culture",
    "Lagos culinary experience",
    "Nigerian food market",
    "Nigerian street food",
    "Lagos food market",
    "outdoor dining Lagos",
    "Lagos supper club",
    "food tour Lagos",
    // Tickets / events
    "Lagos event tickets",
    "Lagos event 2025",
    "upcoming events Lagos",
    "Lagos outdoor events",
    "things to do in Lagos at night",
    "Lagos weekend events",
    "Lagos events this weekend",
  ],

  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "/",
    siteName: "Dine At Night",
    title: "Dine at Night — Nigeria’s first night food market",
    description:
      "Dine at Night is a curated night food market in Lagos, Nigeria, bringing together top food vendors, chefs, and culture for a unique food and nightlife experience.",
    images: [
      {
        url: "https://www.dineatnight.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Dine At Night — Neon-lit outdoor food market, Lagos",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Dine at Night — Nigeria's first night food market",
    site: "@dineatnight",
    description:
      "Lagos's premier nighttime food market. Local vendors, music, neon-lit vibes. Get your tickets now.",
    images: ["https://www.dineatnight.com/og-image.png"],
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
    icon: [
      { url: "/logo.png", type: "image/png" },
    ],
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://cdn.lordicon.com/lordicon.js" async />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link
          rel="dns-prefetch"
          href="https://firebasestorage.googleapis.com"
        />
        <meta
          name="google-site-verification"
          content="vhx_6AnCrOs5gltcjdAwfBZA45bxx-mBvnXqIYhbwYE"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Dine At Night",
              url: "https://dineatnight.com/",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://dineatnight.com/event",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Dine At Night",
              url: "https://dineatnight.com/",
              logo: {
                "@type": "ImageObject",
                url: "https://www.dineatnight.com/logo.png",
              },
              image: "https://www.dineatnight.com/og-image.png",
              description:
                "Nigeria's first night food market. A curated outdoor food experience in Lagos bringing together top vendors, chefs, and culture after dark.",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Lagos",
                addressCountry: "NG",
              },
              sameAs: [
                "https://www.instagram.com/dineatnight.ng/",
                "https://www.linkedin.com/company/dine-at-night/",
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FoodEstablishment",
              name: "Dine At Night",
              url: "https://dineatnight.com/",
              image: "https://www.dineatnight.com/og-image.png",
              description:
                "Lagos's premier nighttime food market. Local vendors, music, and neon-lit vibes.",
              servesCuisine: ["Nigerian", "African", "Street Food"],
              address: {
                "@type": "PostalAddress",
                addressLocality: "Lagos",
                addressCountry: "NG",
              },
              priceRange: "₦₦",
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
