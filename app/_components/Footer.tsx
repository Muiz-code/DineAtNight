"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Images } from "@/assets/images";
import { Linkedin } from "lucide-react";
export default function Footer() {
  const { logo } = Images();
  const [subEmail, setSubEmail] = useState("");
  const [subState, setSubState] = useState<
    "idle" | "loading" | "done" | "exists" | "error"
  >("idle");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subEmail.trim()) return;
    setSubState("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: subEmail.trim() }),
      });
      if (!res.ok) throw new Error("Subscribe failed");
      const data = await res.json();
      setSubState(data.isNew !== false ? "done" : "exists");
      setSubEmail("");
    } catch {
      setSubState("error");
      setSubEmail("");
    }
  };

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
            Nigeria&apos;s first night food market. For those who dine after
            dark.
          </p>
          <p className="text-gray-700 text-xs">
            Powered by{" "}
            <a
              href="https://thosewhodine.co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-white transition-colors"
            >
              Those Who Dine
            </a>
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
              {
                label: "Instagram",
                href: "https://www.instagram.com/dineatnight.ng/",
                color: "#FF3333",
                glow: "rgba(255,51,51,0.5)",
                icon: (
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                ),
              },
              {
                label: "TikTok",
                href: "",
                color: "#FFFF00",
                glow: "rgba(255,255,0,0.5)",
                icon: (
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.3 6.3 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.67a8.18 8.18 0 0 0 4.78 1.52V6.7a4.85 4.85 0 0 1-1-.01z" />
                  </svg>
                ),
              },
              {
                label: "LinkedIn",
                href: "https://www.linkedin.com/company/dine-at-night/",
                color: "#0077B5",
                glow: "rgba(0,119,181,0.5)",
                icon: <Linkedin className="w-4 h-4" />,
              },
            ].map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300"
                style={{
                  borderColor: `${social.color}30`,
                  color: `${social.color}60`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor =
                    social.color;
                  (e.currentTarget as HTMLAnchorElement).style.color =
                    social.color;
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                    `0 0 18px ${social.glow}`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor =
                    `${social.color}30`;
                  (e.currentTarget as HTMLAnchorElement).style.color =
                    `${social.color}60`;
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                    "none";
                }}
              >
                {social.icon}
              </a>
            ))}
          </div>

          <div className="space-y-2 mb-6">
            <p className="text-gray-600 text-sm">
              <span className="text-gray-700">General: </span>
              <a
                href="mailto:contact@dineatnight.com"
                className="hover:text-[#00FF41] transition-colors duration-300"
              >
                contact@dineatnight.com
              </a>
            </p>
            <p className="text-gray-600 text-sm">
              <span className="text-gray-700">Sponsorship: </span>
              <a
                href="mailto:contact@dineatnight.com"
                className="hover:text-[#FFFF00] transition-colors duration-300"
              >
                contact@dineatnight.com
              </a>
            </p>
            <p className="text-gray-600 text-sm">
              <span className="text-gray-700">Location: </span>
              Lagos, Nigeria
            </p>
          </div>

          {/* Newsletter subscribe */}
          <form onSubmit={handleSubscribe} className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
              Email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={subEmail}
                onChange={(e) => {
                  setSubEmail(e.target.value);
                  setSubState("idle");
                }}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white/5 border text-white text-sm placeholder:text-gray-700 focus:outline-none transition-colors"
                style={{
                  borderColor:
                    subState === "error" ? "#FF3333" : "rgba(255,255,255,0.08)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#00FF41")}
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor =
                    subState === "error" ? "#FF3333" : "rgba(255,255,255,0.08)")
                }
              />
              <button
                type="submit"
                disabled={subState === "loading" || subState === "done" || subState === "exists"}
                className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-black transition-all shrink-0"
                style={{
                  background: subState === "done" || subState === "exists" ? "#00FF41" : "#FFFF00",
                  opacity: subState === "loading" ? 0.7 : 1,
                }}
              >
                {subState === "loading"
                  ? "…"
                  : subState === "done" || subState === "exists"
                    ? "✓"
                    : "Join"}
              </button>
            </div>
            {subState === "done" && (
              <p className="text-[11px] text-[#00FF41]">
                You&apos;re on the list. See you under the neon lights 🌙
              </p>
            )}
            {subState === "exists" && (
              <p className="text-[11px] text-[#FFFF00]">
                We know you love us — you&apos;re already in our records!
              </p>
            )}
            {subState === "error" && (
              <p className="text-[11px] text-[#FF3333]">
                Something went wrong — try again.
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800/40 px-6 md:px-16 py-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-700 text-xs">
            © {new Date().getFullYear()} Dine At Night. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a
              href="#"
              className="text-gray-700 hover:text-gray-500 text-xs transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-gray-700 hover:text-gray-500 text-xs transition-colors"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
