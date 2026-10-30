"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getAuthClient } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  LayoutDashboard,
  Calendar,
  Images,
  Package,
  LogOut,
  ScrollText,
  Ticket,
  ScanLine,
  Ellipsis,
  ChevronRight,
  X,
  type LucideIcon,
} from "lucide-react";
import { logAdminAction, adminDisplayName } from "@/lib/adminLog";

/* ── Navigation ────────────────────────────────────────────────
   Each section is a sidebar item; its tabs render as the tab bar
   (in the layout, outside the page animation). A section is active
   when the path starts with any of its tab hrefs. */
type Section = {
  key: string;
  label: string;
  icon: LucideIcon;
  tabs: { label: string; href: string }[];
  exact?: boolean; // Dashboard: match "/admin" only
};

const SECTIONS: Section[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true, tabs: [{ label: "Dashboard", href: "/admin" }] },
  {
    key: "events",
    label: "Events",
    icon: Calendar,
    tabs: [
      { label: "Events", href: "/admin/events" },
      { label: "Vendors", href: "/admin/vendors" },
      { label: "Emails", href: "/admin/subscribers" },
      { label: "Test Emails", href: "/admin/test-emails" },
    ],
  },
  {
    key: "tickets",
    label: "Tickets",
    icon: Ticket,
    tabs: [
      { label: "Tickets", href: "/admin/tickets" },
      { label: "Scan Ticket", href: "/admin/confirm" },
    ],
  },
  {
    key: "gallery",
    label: "Gallery",
    icon: Images,
    tabs: [
      { label: "Gallery", href: "/admin/gallery" },
      { label: "Testimonials", href: "/admin/testimonials" },
    ],
  },
  {
    key: "store",
    label: "Store",
    icon: Package,
    tabs: [
      { label: "Products", href: "/admin/shop" },
      { label: "Orders", href: "/admin/orders" },
    ],
  },
  { key: "logs", label: "Logs", icon: ScrollText, tabs: [{ label: "Logs", href: "/admin/logs" }] },
];

/** Shown in the mobile bottom bar; everything else lives under "More". */
const MOBILE_PRIMARY = ["dashboard", "events"];

const sectionFor = (path: string): Section | undefined =>
  SECTIONS.find((s) => (s.exact ? path === s.tabs[0].href : s.tabs.some((t) => path.startsWith(t.href))));

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [configError, setConfigError] = useState("");
  const [firstName, setFirstName] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const auth = getAuthClient();
    if (!auth) {
      // Deferred: auth is only available in the browser, so this can't be decided at render time
      const t = setTimeout(() => {
        setConfigError("Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* environment variables in your Vercel dashboard.");
        setChecking(false);
      }, 0);
      return () => clearTimeout(t);
    }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (pathname === "/admin/login") { setChecking(false); return; }
      // proxy.ts handles the server-side block before any page renders.
      // Here we only sync Firebase Auth state for the client-side shell.
      if (!user) { router.replace("/admin/login"); return; }
      // Firestore/Storage rules require the `admin` custom claim. Admins signed
      // in before it existed (or after ADMIN_EMAILS changed) get it synced here
      // without having to sign out and back in.
      try {
        const { claims } = await user.getIdTokenResult();
        if (claims.admin !== true) {
          const res = await fetch("/api/admin/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: await user.getIdToken() }),
          });
          if (res.ok && (await res.json()).refreshToken) {
            await user.getIdToken(true);
            await user.reload();
          }
        }
      } catch (err) {
        console.warn("[admin] Could not sync admin claim:", err);
      }
      setFirstName(adminDisplayName(auth.currentUser ?? user).split(" ")[0]);
      setAuthed(true);
      setChecking(false);
    });
    return () => unsub();
  }, [pathname, router]);

  const handleSignOut = async () => {
    const auth = getAuthClient();
    await logAdminAction("LOGOUT", "Signed out of admin panel");
    if (auth) await signOut(auth);
    // Clear the httpOnly session cookie so middleware blocks the route immediately
    await fetch("/api/admin/session", { method: "DELETE" });
    router.replace("/admin/login");
  };

  const current = sectionFor(pathname);
  const isActive = (section: Section) => current?.key === section.key;
  const moreSections = SECTIONS.filter((s) => !MOBILE_PRIMARY.includes(s.key));
  const moreActive = !!current && !MOBILE_PRIMARY.includes(current.key);

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
          {firstName || "Admin"}
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
              {firstName || "Admin"}
            </h2>
            <p className="text-gray-700 text-[10px] mt-0.5">Dine At Night Admin</p>
          </div>

          <nav className="flex-1 py-4 px-3 space-y-0.5">
            {SECTIONS.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.tabs[0].href}
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
          {current && current.tabs.length > 1 && (
            <div
              className="flex overflow-x-auto scrollbar-hide border-b flex-shrink-0 px-4 sm:px-6 md:px-8 sticky top-0 z-10"
              style={{ borderColor: "rgba(255,255,255,0.07)", background: "#060606" }}
            >
              {current.tabs.map((tab) => {
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
            key={current?.key ?? pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 p-4 sm:p-6 md:p-8"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* ── Mobile: bottom navigation — Dashboard, Events, More ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-16 z-50 flex items-stretch md:hidden border-t"
        style={{ background: "#060606", borderColor: "rgba(255,255,0,0.08)" }}
      >
        {SECTIONS.filter((s) => MOBILE_PRIMARY.includes(s.key)).map((item) => {
          const active = isActive(item) && !moreOpen;
          return (
            <Link
              key={item.key}
              href={item.tabs[0].href}
              onClick={() => setMoreOpen(false)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all"
              style={{ borderTop: active ? "2px solid #FFFF00" : "2px solid transparent" }}
            >
              <MobileNavLabel icon={item.icon} label={item.label} active={active} />
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen((o) => !o)}
          aria-expanded={moreOpen}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all"
          style={{ borderTop: moreActive || moreOpen ? "2px solid #FFFF00" : "2px solid transparent" }}
        >
          <MobileNavLabel icon={Ellipsis} label="More" active={moreActive || moreOpen} />
        </button>
      </nav>

      {/* ── Mobile: "More" bottom sheet ── */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            className="fixed inset-0 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/70" onClick={() => setMoreOpen(false)} />
            <motion.div
              className="absolute left-0 right-0 bottom-16 rounded-t-2xl border-t px-4 pt-3 pb-4 max-h-[70vh] overflow-y-auto"
              style={{ background: "#0a0a0a", borderColor: "rgba(255,255,0,0.15)" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="relative flex justify-center mb-3">
                <div className="w-10 h-1 rounded-full bg-white/15" />
                <button
                  onClick={() => setMoreOpen(false)}
                  className="absolute right-0 -top-1 text-gray-600 hover:text-white"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Gate shortcut */}
              <Link
                href="/admin/confirm"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 px-4 py-3 mb-3 rounded-xl border font-bold text-sm uppercase tracking-widest"
                style={{ borderColor: "rgba(255,255,0,0.35)", color: "#FFFF00", background: "rgba(255,255,0,0.06)" }}
              >
                <ScanLine className="w-5 h-5" /> Scan Ticket
              </Link>

              <div className="space-y-1">
                {moreSections.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item);
                  return (
                    <Link
                      key={item.key}
                      href={item.tabs[0].href}
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
                      style={{
                        color: active ? "#FFFF00" : "rgba(255,255,255,0.6)",
                        background: active ? "rgba(255,255,0,0.08)" : "transparent",
                      }}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 font-medium tracking-wide">{item.label}</span>
                      {item.tabs.length > 1 && (
                        <span className="text-[10px] text-gray-600 truncate max-w-[45%]">
                          {item.tabs.map((t) => t.label).join(" · ")}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-700 flex-shrink-0" />
                    </Link>
                  );
                })}
              </div>

              <button
                onClick={handleSignOut}
                className="mt-3 flex items-center gap-3 px-4 py-3 rounded-xl text-sm w-full border-t border-white/5 text-gray-500 hover:text-[#FF3333]"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileNavLabel({ icon: Icon, label, active }: { icon: LucideIcon; label: string; active: boolean }) {
  const color = active ? "#FFFF00" : "rgba(255,255,255,0.3)";
  return (
    <>
      <Icon className="w-5 h-5" style={{ color }} />
      <span className="text-[9px] uppercase tracking-wide font-bold" style={{ color }}>
        {label}
      </span>
    </>
  );
}
