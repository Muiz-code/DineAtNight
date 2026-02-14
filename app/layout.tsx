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

export const metadata: Metadata = {
  title: "Dine At Night",
  description:
    "Dine At Night is a creative digital marketing agency specializing in branding, web design, development, and marketing strategies.",
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
