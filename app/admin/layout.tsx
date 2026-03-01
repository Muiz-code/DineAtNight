"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getAuthClient } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  LayoutDashboard,
  Calendar,
  Images,
  Package,
  LogOut,
} from "lucide-react";

/* ── Tab groups (rendered in layout, outside animation) ─────── */
const TAB_GROUPS: Record<string, { label: string; href: string }[]> = {
  events: [
    { label: "Events",  href: "/admin/events"  },
    { label: "Tickets", href: "/admin/tickets" },
    { label: "Vendors", href: "/admin/vendors" },
    { label: "Confirm", href: "/admin/confirm" },
  ],
  store: [
    { label: "Products", href: "/admin/shop"   },
    { label: "Orders",   href: "/admin/orders" },
  ],
};

const getGroupKey = (path: string) => {
  if (["/admin/events", "/admin/tickets", "/admin/vendors", "/admin/confirm"].some((p) => path.startsWith(p))) return "events";
  if (["/admin/gallery", "/admin/testimonials"].some((p) => path.startsWith(p))) return "gallery";
  if (["/admin/shop", "/admin/orders"].some((p) => path.startsWith(p))) return "store";
  return path;
};

/* ── Flat navigation — 4 items ──────────────────────────────── */
const NAV = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    // active only on exact match
    exact: true,
  },
  {
    label: "Events",
    href: "/admin/events",
    icon: Calendar,
    // active for all event-related pages
    activePrefixes: ["/admin/events", "/admin/tickets", "/admin/vendors", "/admin/confirm"],
    exact: false,
  },
  {
    label: "Gallery",
    href: "/admin/gallery",
    icon: Images,
    activePrefixes: ["/admin/gallery", "/admin/testimonials"],
    exact: false,
  },
  {
    label: "Store",
    href: "/admin/shop",
    icon: Package,
    activePrefixes: ["/admin/shop", "/admin/orders"],
    exact: false,
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [configError, setConfigError] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const auth = getAuthClient();
    if (!auth) {
      setConfigError("Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* environment variables in your Vercel dashboard.");
      setChecking(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      if (pathname === "/admin/login") { setChecking(false); return; }
      // Middleware (middleware.ts) handles the server-side block before any page renders.
      // Here we only sync Firebase Auth state for the client-side shell.
      if (!user) { router.replace("/admin/login"); return; }
      setAuthed(true);
      setChecking(false);
    });
    return () => unsub();
  }, [pathname, router]);

  const handleSignOut = async () => {
    const auth = getAuthClient();
    if (auth) await signOut(auth);
    // Clear the httpOnly session cookie so middleware blocks the route immediately
    await fetch("/api/admin/session", { method: "DELETE" });
    router.replace("/admin/login");
  };

  const isActive = (nav: (typeof NAV)[number]) => {
    if (nav.exact) return pathname === nav.href;
    return (nav.activePrefixes ?? [nav.href]).some((p) => pathname.startsWith(p));
  };

  if (pathname === "/admin/login") return <>{children}</>;

  if (configError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-[#FF3333] font-bold uppercase tracking-widest text-lg">Firebase Not Configured</h2>
          <p className="text-gray-500 text-sm leading-relaxed">{configError}</p>
          <p className="text-gray-600 text-xs">
            Go to Vercel → Your Project → Settings → Environment Variables and add all{" "}
            <span className="text-gray-400 font-mono">NEXT_PUBLIC_FIREBASE_*</span> keys.
          </p>
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#FF3333] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#030303]">
      <style>{`
        /* ── Admin scrollbars ─────────────────── */
        .admin-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .admin-scroll::-webkit-scrollbar-track { background: transparent; }
        .admin-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,0,0.30);
          border-radius: 2px;
        }
        .admin-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,0,0.60); }
        .admin-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,0,0.30) transparent; }

        /* ── Horizontal scrollbar flipped to top ── */
        .scroll-flip { transform: scaleY(-1); }
        .scroll-flip-inner { transform: scaleY(-1); }
        .scroll-flip::-webkit-scrollbar { height: 3px; }
        .scroll-flip::-webkit-scrollbar-track { background: transparent; }
        .scroll-flip::-webkit-scrollbar-thumb {
          background: rgba(255,255,0,0.30);
          border-radius: 2px;
        }
        .scroll-flip::-webkit-scrollbar-thumb:hover { background: rgba(255,255,0,0.60); }
        .scroll-flip { scrollbar-width: thin; scrollbar-color: rgba(255,255,0,0.30) transparent; }
      `}</style>

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
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#FF3333] transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </header>

      {/* ── Sidebar + main ── */}
      <div className="flex h-screen overflow-hidden">

        {/* Desktop sidebar */}
        <aside
          className="hidden md:flex w-52 flex-shrink-0 border-r flex-col fixed top-0 bottom-0 left-0 z-40"
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

          <nav className="flex-1 py-4 px-3 space-y-0.5">
            {NAV.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200"
                  style={{
                    color: active ? "#FFFF00" : "rgba(255,255,255,0.35)",
                    background: active ? "rgba(255,255,0,0.08)" : "transparent",
                    boxShadow: active ? "0 0 12px rgba(255,255,0,0.1)" : "none",
                  }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium tracking-wide">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="px-3 pb-6">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full transition-all text-gray-600 hover:text-[#FF3333]"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="admin-scroll flex-1 overflow-auto pt-14 md:pt-0 pb-20 md:pb-0 flex flex-col md:ml-52">
          {/* ── Tab bar — lives here so it never animates on tab switch ── */}
          {TAB_GROUPS[getGroupKey(pathname)] && (
            <div
              className="flex overflow-x-auto scrollbar-hide border-b flex-shrink-0 px-4 sm:px-6 md:px-8 sticky top-0 z-10"
              style={{ borderColor: "rgba(255,255,255,0.07)", background: "#060606" }}
            >
              {TAB_GROUPS[getGroupKey(pathname)].map((tab) => {
                const active = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className="flex-shrink-0 px-5 py-3 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 -mb-px"
                    style={{
                      borderColor: active ? "#FFFF00" : "transparent",
                      color: active ? "#FFFF00" : "rgba(255,255,255,0.35)",
                      background: active ? "rgba(255,255,0,0.04)" : "transparent",
                    }}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Content — key on group so animation only fires between sections */}
          <motion.div
            key={getGroupKey(pathname)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 p-4 sm:p-6 md:p-8"
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
        {NAV.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
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
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
