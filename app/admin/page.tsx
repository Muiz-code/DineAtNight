"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DanEvent, DanTicket } from "@/lib/firestore";
import Link from "next/link";
import { Calendar, Ticket, TrendingUp, Users, AlertCircle, type LucideIcon } from "lucide-react";

function StatCard({ label, value, icon: Icon, color, glow }: {
  label: string; value: string | number; icon: LucideIcon; color: string; glow: string;
}) {
  return (
    <motion.div
      className="rounded-xl border p-5 flex items-start gap-4"
      style={{ borderColor: `${color}20`, background: "#0a0a0a", boxShadow: `0 0 20px ${glow}08` }}
      whileHover={{ borderColor: `${color}50`, boxShadow: `0 0 25px ${glow}20` }}
      transition={{ duration: 0.2 }}
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
        <Icon className="w-5 h-5" color={color} />
      </div>
      <div>
        <p className="text-gray-600 text-xs uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-bold mt-0.5" style={{ color, textShadow: `0 0 15px ${glow}` }}>{value}</p>
      </div>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const [events, setEvents] = useState<DanEvent[]>([]);
  const [tickets, setTickets] = useState<DanTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        // Simple getDocs with no composite index required — sort client-side
        const [evSnap, txSnap] = await Promise.all([
          getDocs(collection(db, "events")),
          getDocs(collection(db, "tickets")),
        ]);
        const evs = evSnap.docs.map((d) => ({ id: d.id, ...d.data() } as DanEvent));
        const txs = txSnap.docs.map((d) => ({ id: d.id, ...d.data() } as DanTicket));
        // Sort client-side — no Firestore index needed
        evs.sort((a, b) => (b.date?.seconds ?? 0) - (a.date?.seconds ?? 0));
        txs.sort((a, b) => (b.purchasedAt?.seconds ?? 0) - (a.purchasedAt?.seconds ?? 0));
        setEvents(evs);
        setTickets(txs);
      } catch (err) {
        console.error("Firestore load error:", err);
        setError("Could not load data. Check Firestore rules and that the database is created.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const paidTxs = tickets.filter((t) => t.status !== "pending");
  const totalRevenue = paidTxs.reduce((s, t) => s + t.amount, 0) / 100;
  const confirmedTickets = tickets.filter((t) => t.status === "confirmed").reduce((s, t) => s + t.quantity, 0);
  const paidTickets = paidTxs.reduce((s, t) => s + t.quantity, 0);
  const activeEvents = events.filter((e) => e.status === "active").length;

  // Compute actual sold count per event from real ticket data (more accurate than ev.soldTickets)
  const soldByEvent: Record<string, number> = {};
  for (const t of paidTxs) {
    soldByEvent[t.eventId] = (soldByEvent[t.eventId] ?? 0) + t.quantity;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white uppercase tracking-widest" style={{ textShadow: "0 0 20px rgba(255,255,0,0.3)" }}>
          Dashboard
        </h1>
        <p className="text-gray-600 text-sm mt-1">Welcome back — here&apos;s your overview</p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-[#FF3333]/30 bg-[#FF3333]/05 p-4">
          <AlertCircle className="w-4 h-4 text-[#FF3333] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[#FF3333] text-sm font-medium">Firestore Error</p>
            <p className="text-gray-500 text-xs mt-0.5">{error}</p>
            <p className="text-gray-600 text-xs mt-2">
              Fix: Firebase Console → Firestore Database → Create database → Start in test mode
            </p>
          </div>
        </div>
      )}

      {/* Stats grid — show immediately, values update when data loads */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Events" value={loading ? "—" : activeEvents} icon={Calendar} color="#FFFF00" glow="rgba(255,255,0,0.5)" />
        <StatCard label="Tickets Sold" value={loading ? "—" : paidTickets} icon={Ticket} color="#FF3333" glow="rgba(255,51,51,0.5)" />
        <StatCard label="Confirmed" value={loading ? "—" : confirmedTickets} icon={Users} color="#00FF41" glow="rgba(0,255,65,0.5)" />
        <StatCard label="Revenue" value={loading ? "—" : `₦${totalRevenue.toLocaleString()}`} icon={TrendingUp} color="#FFFF00" glow="rgba(255,255,0,0.5)" />
      </div>

      {/* Events summary */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">
            Recent Events
            {loading && <span className="ml-2 inline-block w-3 h-3 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin align-middle" />}
          </h2>
          <Link href="/admin/events" className="text-xs text-gray-600 hover:text-[#FFFF00] transition-colors uppercase tracking-widest">
            Manage All →
          </Link>
        </div>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {!loading && events.length === 0 ? (
            <div className="py-12 text-center text-gray-600 text-sm">
              No events yet. <Link href="/admin/events" className="text-[#FFFF00] underline">Create one →</Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-600 text-[10px] uppercase tracking-widest" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <th className="text-left px-5 py-3">Event</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-3">Tickets</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        <td className="px-5 py-4"><div className="h-3 w-32 bg-white/5 rounded animate-pulse" /></td>
                        <td className="px-4 py-4 hidden sm:table-cell"><div className="h-3 w-20 bg-white/5 rounded animate-pulse" /></td>
                        <td className="px-4 py-4"><div className="h-3 w-12 bg-white/5 rounded animate-pulse" /></td>
                        <td className="px-4 py-4"><div className="h-3 w-14 bg-white/5 rounded animate-pulse" /></td>
                      </tr>
                    ))
                  : events.slice(0, 6).map((ev) => {
                      const evDate = ev.date?.toDate?.()?.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
                      const sold = soldByEvent[ev.id ?? ""] ?? 0;
                      const pct = ev.totalTickets > 0 ? Math.round((sold / ev.totalTickets) * 100) : 0;
                      const statusColor = ev.status === "active" ? "#00FF41" : ev.status === "ended" ? "#FF3333" : "#888";
                      return (
                        <tr key={ev.id} className="border-b transition-colors hover:bg-white/[0.02]" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                          <td className="px-5 py-3">
                            <p className="text-white font-medium">{ev.title}</p>
                            <p className="text-gray-600 text-xs">{ev.edition}</p>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell text-gray-500 text-xs">{evDate}</td>
                          <td className="px-4 py-3">
                            <p className="text-white text-xs">{sold}/{ev.totalTickets}</p>
                            <div className="w-16 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                              <div className="h-full rounded-full bg-[#FFFF00]" style={{ width: `${pct}%` }} />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full" style={{ background: `${statusColor}15`, color: statusColor }}>
                              {ev.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recent tickets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">
            Recent Tickets
            {loading && <span className="ml-2 inline-block w-3 h-3 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin align-middle" />}
          </h2>
          <Link href="/admin/tickets" className="text-xs text-gray-600 hover:text-[#FFFF00] transition-colors uppercase tracking-widest">
            View All →
          </Link>
        </div>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {!loading && tickets.length === 0 ? (
            <div className="py-12 text-center text-gray-600 text-sm">No ticket purchases yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-600 text-[10px] uppercase tracking-widest" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <th className="text-left px-5 py-3">Buyer</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Event</th>
                  <th className="text-left px-4 py-3">Qty</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        <td className="px-5 py-4"><div className="h-3 w-28 bg-white/5 rounded animate-pulse" /></td>
                        <td className="px-4 py-4 hidden md:table-cell"><div className="h-3 w-20 bg-white/5 rounded animate-pulse" /></td>
                        <td className="px-4 py-4"><div className="h-3 w-8 bg-white/5 rounded animate-pulse" /></td>
                        <td className="px-4 py-4"><div className="h-3 w-14 bg-white/5 rounded animate-pulse" /></td>
                      </tr>
                    ))
                  : tickets.slice(0, 8).map((t) => {
                      const color = t.status === "confirmed" ? "#00FF41" : t.status === "paid" ? "#FFFF00" : "#666";
                      return (
                        <tr key={t.id} className="border-b transition-colors hover:bg-white/[0.02]" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                          <td className="px-5 py-3">
                            <p className="text-white font-medium">{t.name}</p>
                            <p className="text-gray-600 text-xs">{t.email}</p>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-gray-500 text-xs">{t.eventTitle}</td>
                          <td className="px-4 py-3 text-gray-300 text-xs">{t.quantity}x</td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full" style={{ background: `${color}15`, color }}>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
