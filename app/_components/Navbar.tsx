"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Loader from "./loader";
import Image from "next/image";
import { Images } from "@/assets/images";

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "EVENTS", href: "/event" },
  { label: "VENDORS", href: "/vendors" },
  { label: "ABOUT", href: "/aboutUs" },
  { label: "SHOP", href: "/shop" },
  { label: "GALLERY", href: "/gallery" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  if (pathname.startsWith("/admin")) return null;
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

      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between h-16 md:h-18">
            {/* Logo */}
            <Link
              href="/home"
              onClick={handleLogoClick}
              className="flex items-center gap-2 shrink-0"
            >
              <Image
                src={logoText}
                alt="Dine@Night Logo"
                className="w-16 sm:w-20 md:w-24 lg:w-28"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-5 lg:gap-9">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`transition text-sm lg:text-base font-medium tracking-wide ${
                      isActive
                        ? "text-[#00FF41]"
                        : "text-gray-300 hover:text-[#00FF41]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Mobile Menu Button — larger tap target */}
            <button
              onClick={toggleMenu}
              aria-label={isOpen ? "Close menu" : "Open menu"}
              className="md:hidden flex flex-col justify-center gap-[5px] w-10 h-10 z-50 relative -mr-1"
            >
              <span
                className={`block w-6 h-0.5 bg-white transition-all duration-300 origin-center mx-auto ${
                  isOpen ? "rotate-45 translate-y-[7px]" : ""
                }`}
              />
              <span
                className={`block w-6 h-0.5 bg-white transition-all duration-300 mx-auto ${
                  isOpen ? "opacity-0 scale-x-0" : ""
                }`}
              />
              <span
                className={`block w-6 h-0.5 bg-white transition-all duration-300 origin-center mx-auto ${
                  isOpen ? "-rotate-45 -translate-y-[7px]" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Backdrop */}
      <div
        className={`fixed inset-0 bg-black/80 z-30 md:hidden transition-opacity duration-300 ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Mobile Navigation Panel — slides in from right */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-full sm:w-80 bg-black z-40 md:hidden transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Top bar with close button */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-white/8">
          <Image
            src={logoText}
            alt="Dine@Night Logo"
            className="w-14"
          />
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
            className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/30 transition-all text-sm"
          >
            ✕
          </button>
        </div>

        {/* Nav links */}
        <div className="flex flex-col items-center justify-center h-[calc(100svh-4rem)] gap-8 pb-10">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`transition text-2xl font-semibold tracking-widest ${
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
        </div>
      </div>
    </>
  );
}
