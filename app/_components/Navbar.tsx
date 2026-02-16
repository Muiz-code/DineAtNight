"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Loader from "./loader";
import Image from "next/image";
import { Images } from "@/assets/images";
import { ShoppingCart } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  // { label: "Cart", href: "/cart" },
  { label: "SHOP", href: "/shop" },
  { label: "ABOUT", href: "/aboutUs" },
  { label: "EVENT", href: "/event" },
  { label: "CONTACT", href: "/contact" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { logoText } = Images();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Don't show loader if already on home page
    if (pathname === "/" || pathname === "/home") {
      return;
    }
    setIsNavigating(true);
    setTimeout(() => {
      router.push("/home");
      // Reset after navigation
      setTimeout(() => {
        setIsNavigating(false);
      }, 500);
    }, 1500);
  };

  return (
    <>
      {/* Full Screen Loader Overlay */}
      {isNavigating && (
        <div className="fixed inset-0 z-[100]">
          <Loader />
        </div>
      )}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-none backdrop-blur-md px-4 md:px-25 md:py-2.5 w-full">
        <div className=" md:w-340 w-full">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/home"
              onClick={handleLogoClick}
              className="flex items-center gap-2"
            >
              <Image
                src={logoText}
                alt="Dine@Night Logo"
                className="md:w-25 w-16"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`transition text-lg font-medium ${
                      isActive
                        ? "text-[#008000]"
                        : "text-gray-300 hover:text-[#008000]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Desktop Cart Button */}
            <button
              onClick={() => router.push("/cart")}
              className="hidden md:flex items-center gap-2 border-2 border-white text-white px-6 py-2 rounded-full hover:bg-white hover:text-black transition-all duration-300 font-medium text-sm group"
            >
              <ShoppingCart className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Cart</span>
              <span className="bg-[#008000] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                0
              </span>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMenu}
              className="md:hidden flex flex-col gap-1.5 relative w-5 h-5 z-50"
            >
              <span
                className={`w-full h-0.5 bg-white transition-all ${
                  isOpen ? "rotate-45 translate-y-2" : ""
                }`}
              />
              <span
                className={`w-full h-0.5 bg-white transition-all ${
                  isOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`w-full h-0.5 bg-white transition-all ${
                  isOpen ? "-rotate-45 -translate-y-2" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation - Full Screen Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`fixed top-0 left-0 right-0 bottom-0 bg-gradient-to-b from-black via-black to-black z-35 md:hidden transition-transform duration-300 transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col items-center justify-center h-screen space-y-10">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`transition text-2xl font-semibold ${
                  isActive
                    ? "text-[#00FF41]"
                    : "text-gray-300 hover:text-[#00FF41]"
                }`}
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
          {/* <button className="border-2 border-white text-white px-8 py-3 rounded-full hover:bg-white hover:text-black transition font-medium mt-8">
            cart
          </button> */}
        </div>
      </div>
    </>
  );
}
