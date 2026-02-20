"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { LayoutDashboard, Calendar, Ticket, QrCode, Store, LogOut } from "lucide-react";

const NAV = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Events", href: "/admin/events", icon: Calendar },
  { label: "Tickets", href: "/admin/tickets", icon: Ticket },
  { label: "Confirm", href: "/admin/confirm", icon: QrCode },
  { label: "Vendors", href: "/admin/vendors", icon: Store },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (pathname === "/admin/login") { setChecking(false); return; }
      if (!user) { router.replace("/admin/login"); return; }
      setAuthed(true);
      setChecking(false);
    });
    return () => unsub();
  }, [pathname, router]);

  if (pathname === "/admin/login") return <>{children}</>;

  if (checking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authed) return null;

  return (
    <div className="min-h-screen bg-[#030303]">

      {/* ── Mobile: fixed top header ── */}
      <header
        className="fixed top-0 left-0 right-0 h-14 z-50 flex items-center justify-between px-4 md:hidden border-b"
        style={{ background: "#060606", borderColor: "rgba(255,255,0,0.08)" }}
      >
        <h2
          className="text-sm font-bold uppercase tracking-[0.25em]"
          style={{ color: "#FFFF00", textShadow: "0 0 15px rgba(255,255,0,0.5)" }}
        >
          DAN Admin
        </h2>
        <button
          onClick={async () => { await signOut(auth); router.replace("/admin/login"); }}
          className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#FF3333] transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </header>

      {/* ── Sidebar + main ── */}
      <div className="flex min-h-screen">

        {/* Desktop sidebar — hidden on mobile */}
        <aside
          className="hidden md:flex w-56 min-h-screen flex-shrink-0 border-r flex-col"
          style={{ borderColor: "rgba(255,255,0,0.1)", background: "#060606" }}
        >
          <div className="px-5 py-6 border-b" style={{ borderColor: "rgba(255,255,0,0.08)" }}>
            <h2
              className="text-sm font-bold uppercase tracking-[0.25em]"
              style={{ color: "#FFFF00", textShadow: "0 0 15px rgba(255,255,0,0.5)" }}
            >
              DAN Admin
            </h2>
            <p className="text-gray-700 text-[10px] mt-0.5">Dine At Night</p>
          </div>

          <nav className="flex-1 py-4 px-3 space-y-1">
            {NAV.map(({ label, href, icon: Icon }) => {
              const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200"
                  style={{
                    color: active ? "#FFFF00" : "rgba(255,255,255,0.35)",
                    background: active ? "rgba(255,255,0,0.08)" : "transparent",
                    boxShadow: active ? "0 0 12px rgba(255,255,0,0.1)" : "none",
                  }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium tracking-wide">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="px-3 pb-6">
            <button
              onClick={async () => { await signOut(auth); router.replace("/admin/login"); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full transition-all text-gray-600 hover:text-[#FF3333]"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main content — top padding for mobile header, bottom padding for mobile nav */}
        <main className="flex-1 overflow-auto pt-14 md:pt-0 pb-20 md:pb-0">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="p-4 sm:p-6 md:p-8"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* ── Mobile: fixed bottom navigation ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-16 z-50 flex items-stretch md:hidden border-t"
        style={{ background: "#060606", borderColor: "rgba(255,255,0,0.08)" }}
      >
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all"
              style={{
                borderTop: active ? "2px solid #FFFF00" : "2px solid transparent",
              }}
            >
              <Icon
                className="w-5 h-5"
                style={{ color: active ? "#FFFF00" : "rgba(255,255,255,0.3)" }}
              />
              <span
                className="text-[9px] uppercase tracking-wide font-bold"
                style={{ color: active ? "#FFFF00" : "rgba(255,255,255,0.3)" }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
