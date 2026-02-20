"use client";

import Image from "next/image";
import Link from "next/link";
import { Images } from "@/assets/images";

export default function Footer() {
  const { logo } = Images();

  return (
    <footer className="relative z-10 bg-black/95 border-t border-gray-800/60">
      <div className="max-w-6xl mx-auto px-6 md:px-16 py-16 grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Brand */}
        <div className="flex flex-col gap-5">
          <Image
            src={logo}
            alt="Dine At Night"
            width={80}
            height={80}
            className="object-contain"
          />
          <p className="text-gray-600 text-sm leading-relaxed max-w-xs">
            Lagos&apos; first nighttime food market. Where food meets culture
            under neon lights.
          </p>
          <p className="text-gray-700 text-xs">
            Powered by{" "}
            <span className="text-gray-500">Those Who Dine</span>
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4
            className="text-white font-bold uppercase tracking-[0.2em] mb-6 text-xs"
            style={{ textShadow: "0 0 10px rgba(255,255,0,0.3)" }}
          >
            Quick Links
          </h4>
          <ul className="space-y-3">
            {[
              { label: "Home", href: "/home" },
              { label: "Events", href: "/event" },
              { label: "Vendors", href: "/vendors" },
              { label: "About", href: "/aboutUs" },
              { label: "Shop", href: "/shop" },
              { label: "Gallery", href: "/gallery" },
              { label: "Contact", href: "/contact" },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-gray-500 hover:text-[#00FF41] transition-colors duration-300 text-sm tracking-wide"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Connect */}
        <div>
          <h4
            className="text-white font-bold uppercase tracking-[0.2em] mb-6 text-xs"
            style={{ textShadow: "0 0 10px rgba(0,255,65,0.3)" }}
          >
            Connect
          </h4>

          <div className="flex gap-3 mb-6">
            {[
              { label: "Instagram", icon: "IG", href: "https://instagram.com/dineatnight", color: "#FF3333", glow: "rgba(255,51,51,0.5)" },
              { label: "TikTok", icon: "TK", href: "https://tiktok.com/@dineatnight", color: "#FFFF00", glow: "rgba(255,255,0,0.5)" },
              { label: "Twitter / X", icon: "X", href: "https://twitter.com/dineatnight", color: "#00FF41", glow: "rgba(0,255,65,0.5)" },
            ].map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="w-10 h-10 rounded-full border flex items-center justify-center text-xs font-bold tracking-wide transition-all duration-300"
                style={{ borderColor: `${social.color}30`, color: `${social.color}60` }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = social.color;
                  (e.currentTarget as HTMLAnchorElement).style.color = social.color;
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 0 18px ${social.glow}`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = `${social.color}30`;
                  (e.currentTarget as HTMLAnchorElement).style.color = `${social.color}60`;
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
                }}
              >
                {social.icon}
              </a>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-gray-600 text-sm">
              <span className="text-gray-700">General: </span>
              <a href="mailto:hello@dineatnight.com" className="hover:text-[#00FF41] transition-colors duration-300">
                hello@dineatnight.com
              </a>
            </p>
            <p className="text-gray-600 text-sm">
              <span className="text-gray-700">Sponsorship: </span>
              <a href="mailto:sponsors@dineatnight.com" className="hover:text-[#FFFF00] transition-colors duration-300">
                sponsors@dineatnight.com
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800/40 px-6 md:px-16 py-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-700 text-xs">
            © {new Date().getFullYear()} Dine At Night. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-gray-700 hover:text-gray-500 text-xs transition-colors">Privacy Policy</a>
            <a href="#" className="text-gray-700 hover:text-gray-500 text-xs transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
