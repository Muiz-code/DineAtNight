"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DanEvent, DanTicket } from "@/lib/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";

type TicketTab = "unscanned" | "scanned";

const fmt = (kobo: number) => "₦" + (kobo / 100).toLocaleString("en-NG");

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-2 bg-white/8 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
    </div>
  );
}

export default function AdminTicketsPage() {
  const [events, setEvents] = useState<DanEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [tickets, setTickets] = useState<DanTicket[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [error, setError] = useState("");
  const [ticketTab, setTicketTab] = useState<TicketTab>("unscanned");

  // Load events once
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, "events"));
        const evs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DanEvent));
        evs.sort((a, b) => (b.date?.seconds ?? 0) - (a.date?.seconds ?? 0));
        setEvents(evs);
        if (evs.length > 0) setSelectedEvent(evs[0].id!);
      } catch (err) {
        console.error(err);
        setError("Could not load events. Check Firestore rules.");
      } finally {
        setLoadingEvents(false);
      }
    };
    load();
  }, []);

  // Load tickets when selected event changes
  useEffect(() => {
    if (!selectedEvent) return;
    setLoadingTickets(true);
    const load = async () => {
      try {
        // Simple where query — no composite index needed (no orderBy)
        const snap = await getDocs(
          query(
            collection(db, "tickets"),
            where("eventId", "==", selectedEvent),
          )
        );
        const txs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DanTicket));
        // Filter paid/confirmed client-side, sort by purchasedAt client-side
        const filtered = txs
          .filter((t) => t.status === "paid" || t.status === "confirmed")
          .sort((a, b) => (b.purchasedAt?.seconds ?? 0) - (a.purchasedAt?.seconds ?? 0));
        setTickets(filtered);
      } catch (err) {
        console.error(err);
        setError("Could not load tickets.");
      } finally {
        setLoadingTickets(false);
      }
    };
    load();
  }, [selectedEvent]);

  const activeEvent = events.find((e) => e.id === selectedEvent);
  const soldCount = tickets.reduce((s, t) => s + t.quantity, 0);
  const confirmedCount = tickets.filter((t) => t.status === "confirmed").reduce((s, t) => s + t.quantity, 0);
  const revenue = tickets.filter((t) => t.status !== "pending").reduce((s, t) => s + t.amount, 0) / 100;
  const remaining = (activeEvent?.totalTickets ?? 0) - soldCount;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-widest">Ticket Analytics</h1>
        <p className="text-gray-600 text-sm mt-0.5">Sales, confirmations, and revenue per event</p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-[#FF3333]/30 bg-[#FF3333]/05 p-4">
          <AlertCircle className="w-4 h-4 text-[#FF3333] shrink-0 mt-0.5" />
          <div>
            <p className="text-[#FF3333] text-sm font-medium">Error</p>
            <p className="text-gray-500 text-xs mt-0.5">{error}</p>
            <p className="text-gray-600 text-xs mt-2">
              Fix: Firebase Console → Firestore Database → Rules → allow read, write: if true;
            </p>
          </div>
        </div>
      )}

      {/* Event selector */}
      {loadingEvents ? (
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-24 rounded-full bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="flex gap-2 min-w-max">
          {events.map((ev) => (
            <button
              key={ev.id}
              onClick={() => { setSelectedEvent(ev.id!); setTicketTab("unscanned"); }}
              className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border"
              style={{
                borderColor: selectedEvent === ev.id ? "#FFFF00" : "rgba(255,255,255,0.1)",
                color: selectedEvent === ev.id ? "#FFFF00" : "rgba(255,255,255,0.4)",
                background: selectedEvent === ev.id ? "rgba(255,255,0,0.08)" : "transparent",
              }}
            >
              {ev.title}
            </button>
          ))}
        </div>
        </div>
      ) : null}

      {activeEvent && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: "Total Capacity", value: activeEvent.totalTickets, color: "#888", glow: "rgba(136,136,136,0.4)" },
              { label: "Tickets Sold", value: loadingTickets ? "…" : soldCount, color: "#FFFF00", glow: "rgba(255,255,0,0.5)" },
              { label: "Confirmed", value: loadingTickets ? "…" : confirmedCount, color: "#00FF41", glow: "rgba(0,255,65,0.5)" },
              {
                label: "Remaining",
                value: loadingTickets ? "…" : remaining,
                color: remaining < 50 ? "#FF3333" : "#00FF41",
                glow: remaining < 50 ? "rgba(255,51,51,0.5)" : "rgba(0,255,65,0.5)"
              },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border p-4" style={{ borderColor: `${stat.color}20`, background: "#0a0a0a" }}>
                <p className="text-gray-600 text-[10px] uppercase tracking-widest">{stat.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: stat.color, textShadow: `0 0 15px ${stat.glow}` }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Progress bars */}
          <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0a0a0a" }}>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Sales Progress</h3>
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Tickets Sold</span>
                <span>{soldCount} / {activeEvent.totalTickets} ({activeEvent.totalTickets > 0 ? Math.round((soldCount / activeEvent.totalTickets) * 100) : 0}%)</span>
              </div>
              <ProgressBar value={soldCount} max={activeEvent.totalTickets} color="#FFFF00" />
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Confirmed at Gate</span>
                <span>{confirmedCount} / {soldCount} ({soldCount > 0 ? Math.round((confirmedCount / soldCount) * 100) : 0}%)</span>
              </div>
              <ProgressBar value={confirmedCount} max={soldCount} color="#00FF41" />
            </div>
            <div className="pt-2 border-t border-white/5">
              <p className="text-gray-500 text-xs">Total Revenue: <span className="text-[#FFFF00] font-bold text-base">₦{revenue.toLocaleString("en-NG")}</span></p>
            </div>
          </div>

          {/* Ticket list — Scanned / Unscanned tabs */}
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                Ticket Purchases
                {loadingTickets
                  ? <span className="ml-2 inline-block w-3 h-3 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin align-middle" />
                  : <span className="text-gray-600 font-normal ml-1">({tickets.length} total)</span>
                }
              </h3>

              {/* Scanned / Unscanned tabs */}
              <div className="flex gap-1 p-1 rounded-xl border border-white/8 bg-white/[0.02]">
                {([
                  { key: "unscanned" as TicketTab, label: "Unscanned", accent: "#FFFF00", count: tickets.filter((t) => t.status === "paid").length },
                  { key: "scanned"   as TicketTab, label: "Scanned",   accent: "#00FF41", count: tickets.filter((t) => t.status === "confirmed").length },
                ] as const).map(({ key, label, accent, count }) => {
                  const active = ticketTab === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setTicketTab(key)}
                      className="relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-200"
                      style={{
                        color: active ? accent : "rgba(255,255,255,0.3)",
                        background: active ? `${accent}12` : "transparent",
                      }}
                    >
                      {label}
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{
                          background: active ? `${accent}25` : "rgba(255,255,255,0.06)",
                          color: active ? accent : "rgba(255,255,255,0.3)",
                        }}
                      >
                        {count}
                      </span>
                      {active && (
                        <motion.span
                          layoutId="ticket-tab-underline"
                          className="absolute bottom-0 left-3 right-3 h-px rounded-full"
                          style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {(() => {
              const displayTickets = tickets.filter((t) =>
                ticketTab === "scanned" ? t.status === "confirmed" : t.status === "paid"
              );

              if (loadingTickets) return (
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <table className="w-full text-sm">
                    <tbody>
                      {Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i} className="border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                          <td className="px-5 py-4"><div className="h-3 w-28 bg-white/5 rounded animate-pulse" /></td>
                          <td className="px-4 py-4 hidden sm:table-cell"><div className="h-3 w-24 bg-white/5 rounded animate-pulse" /></td>
                          <td className="px-4 py-4"><div className="h-3 w-8 bg-white/5 rounded animate-pulse" /></td>
                          <td className="px-4 py-4"><div className="h-3 w-12 bg-white/5 rounded animate-pulse" /></td>
                          <td className="px-4 py-4"><div className="h-3 w-14 bg-white/5 rounded animate-pulse" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );

              if (tickets.length === 0) return (
                <div className="rounded-xl border border-dashed py-12 text-center" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                  <p className="text-gray-600 text-sm">No tickets sold for this event yet.</p>
                </div>
              );

              return (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={ticketTab}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                  >
                    {displayTickets.length === 0 ? (
                      <div className="rounded-xl border border-dashed py-12 text-center" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                        <p className="text-gray-600 text-sm">
                          {ticketTab === "scanned"
                            ? "No tickets have been scanned yet."
                            : "All tickets have been scanned!"}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-gray-600 text-[10px] uppercase tracking-widest" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                              <th className="text-left px-5 py-3">Buyer</th>
                              <th className="text-left px-4 py-3 hidden sm:table-cell">Reference</th>
                              <th className="text-left px-4 py-3">Qty</th>
                              <th className="text-left px-4 py-3">Amount</th>
                              <th className="text-left px-4 py-3">
                                {ticketTab === "scanned" ? "Scanned At" : "Purchased"}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayTickets.map((t) => {
                              const dateField = ticketTab === "scanned" ? t.confirmedAt : t.purchasedAt;
                              const dateStr = dateField
                                ? new Date((dateField as { seconds: number }).seconds * 1000).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                                : "—";
                              const accent = ticketTab === "scanned" ? "#00FF41" : "#FFFF00";
                              return (
                                <tr key={t.id} className="border-b hover:bg-white/[0.02] transition-colors" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                                  <td className="px-5 py-3">
                                    <p className="text-white font-medium">{t.name}</p>
                                    <p className="text-gray-600 text-xs">{t.email}</p>
                                  </td>
                                  <td className="px-4 py-3 hidden sm:table-cell">
                                    <code className="text-gray-500 text-xs font-mono">{t.reference}</code>
                                  </td>
                                  <td className="px-4 py-3 text-gray-300 text-sm">{t.quantity}x</td>
                                  <td className="px-4 py-3 text-gray-300 text-sm">{fmt(t.amount)}</td>
                                  <td className="px-4 py-3">
                                    <span className="text-[10px] font-medium" style={{ color: accent }}>{dateStr}</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              );
            })()}
          </div>
        </>
      )}

      {!loadingEvents && events.length === 0 && !error && (
        <div className="rounded-xl border border-dashed py-16 text-center" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <p className="text-gray-600 text-sm">No events created yet.</p>
        </div>
      )}
    </div>
  );
}
