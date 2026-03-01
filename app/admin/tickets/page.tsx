"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DanEvent, DanTicket } from "@/lib/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Download, ChevronLeft, ChevronRight, X } from "lucide-react";
import * as XLSX from "xlsx";

type TicketTab = "unscanned" | "scanned";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

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

type PreviewState = { rows: DanTicket[]; label: string; suffix: string };

export default function AdminTicketsPage() {
  const [events, setEvents] = useState<DanEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [tickets, setTickets] = useState<DanTicket[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [error, setError] = useState("");
  const [ticketTab, setTicketTab] = useState<TicketTab>("unscanned");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [preview, setPreview] = useState<PreviewState | null>(null);

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
        const snap = await getDocs(
          query(collection(db, "tickets"), where("eventId", "==", selectedEvent))
        );
        const txs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DanTicket));
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

  // Reset page on event or tab change
  useEffect(() => { setPage(0); }, [selectedEvent, ticketTab]);

  const activeEvent = events.find((e) => e.id === selectedEvent);
  const soldCount = tickets.reduce((s, t) => s + t.quantity, 0);
  const confirmedCount = tickets.filter((t) => t.status === "confirmed").reduce((s, t) => s + t.quantity, 0);
  const revenue = tickets.filter((t) => t.status !== "pending").reduce((s, t) => s + t.amount, 0) / 100;
  const remaining = (activeEvent?.totalTickets ?? 0) - soldCount;

  // Derived display + pagination
  const displayTickets = tickets.filter((t) =>
    ticketTab === "scanned" ? t.status === "confirmed" : t.status === "paid"
  );
  const totalPages = Math.ceil(displayTickets.length / pageSize);
  const pageTickets = displayTickets.slice(page * pageSize, (page + 1) * pageSize);
  const fromRow = displayTickets.length > 0 ? page * pageSize + 1 : 0;
  const toRow = Math.min((page + 1) * pageSize, displayTickets.length);

  const exportXlsx = (rows: DanTicket[], suffix: string) => {
    const data = rows.map((t) => ({
      Name: t.name,
      Email: t.email,
      Phone: (t as DanTicket & { phone?: string }).phone ?? "",
      Reference: t.reference,
      "Ticket Type": t.ticketType ?? "—",
      Quantity: t.quantity,
      "Amount (₦)": t.amount / 100,
      Status: t.status,
      Purchased: t.purchasedAt
        ? new Date((t.purchasedAt as { seconds: number }).seconds * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
        : "—",
      "Scanned At": t.confirmedAt
        ? new Date((t.confirmedAt as { seconds: number }).seconds * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
        : "—",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tickets");
    const safeName = (activeEvent?.title ?? "event").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    XLSX.writeFile(wb, `${safeName}_tickets_${suffix}.xlsx`);
  };

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

      {/* Event selector — scroll-flip puts the scrollbar at top */}
      {loadingEvents ? (
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-24 rounded-full bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className="scroll-flip overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="scroll-flip-inner flex gap-2 min-w-max">
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
                glow: remaining < 50 ? "rgba(255,51,51,0.5)" : "rgba(0,255,65,0.5)",
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

          {/* Ticket list */}
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

            {loadingTickets ? (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <table className="w-full text-sm">
                  <tbody>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        <td className="px-5 py-4"><div className="h-3 w-28 bg-white/5 rounded animate-pulse" /></td>
                        <td className="px-4 py-4 hidden sm:table-cell"><div className="h-3 w-24 bg-white/5 rounded animate-pulse" /></td>
                        <td className="px-4 py-4 hidden md:table-cell"><div className="h-3 w-14 bg-white/5 rounded animate-pulse" /></td>
                        <td className="px-4 py-4"><div className="h-3 w-8 bg-white/5 rounded animate-pulse" /></td>
                        <td className="px-4 py-4"><div className="h-3 w-12 bg-white/5 rounded animate-pulse" /></td>
                        <td className="px-4 py-4"><div className="h-3 w-14 bg-white/5 rounded animate-pulse" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : tickets.length === 0 ? (
              <div className="rounded-xl border border-dashed py-12 text-center" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                <p className="text-gray-600 text-sm">No tickets sold for this event yet.</p>
              </div>
            ) : (
              <>
                {/* Pagination + export controls */}
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <select
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                      className="px-3 py-1.5 bg-[#0a0a0a] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#FFFF00] cursor-pointer"
                    >
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <option key={n} value={n} className="bg-[#0a0a0a]">{n} per page</option>
                      ))}
                    </select>
                    <span className="text-gray-600 text-xs">
                      {displayTickets.length > 0
                        ? `Showing ${fromRow}–${toRow} of ${displayTickets.length}`
                        : "No tickets"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Preview + download current page */}
                    <button
                      onClick={() => setPreview({
                        rows: pageTickets,
                        label: `Page ${page + 1} — ${ticketTab === "scanned" ? "Scanned" : "Unscanned"}`,
                        suffix: `page${page + 1}`,
                      })}
                      disabled={pageTickets.length === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all disabled:opacity-30"
                      style={{ borderColor: "rgba(0,255,65,0.3)", color: "#00FF41", background: "rgba(0,255,65,0.06)" }}
                    >
                      <Download className="w-3 h-3" /> Page
                    </button>
                    {/* Preview + download all */}
                    <button
                      onClick={() => setPreview({
                        rows: displayTickets,
                        label: `All ${ticketTab === "scanned" ? "Scanned" : "Unscanned"} Tickets`,
                        suffix: "all",
                      })}
                      disabled={displayTickets.length === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all disabled:opacity-30"
                      style={{ borderColor: "rgba(255,255,0,0.3)", color: "#FFFF00", background: "rgba(255,255,0,0.06)" }}
                    >
                      <Download className="w-3 h-3" /> All
                    </button>

                    {/* Prev / page indicator / next */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage((p) => p - 1)}
                        disabled={page === 0}
                        className="w-7 h-7 rounded-lg border flex items-center justify-center transition-all disabled:opacity-25 hover:border-white/30"
                        style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-gray-600 text-xs px-1">{page + 1} / {totalPages || 1}</span>
                      <button
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page >= totalPages - 1}
                        className="w-7 h-7 rounded-lg border flex items-center justify-center transition-all disabled:opacity-25 hover:border-white/30"
                        style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${ticketTab}-${page}`}
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
                              <th className="text-left px-4 py-3 hidden md:table-cell">Type</th>
                              <th className="text-left px-4 py-3">Qty</th>
                              <th className="text-left px-4 py-3">Amount</th>
                              <th className="text-left px-4 py-3">
                                {ticketTab === "scanned" ? "Scanned At" : "Purchased"}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageTickets.map((t) => {
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
                                  <td className="px-4 py-3 hidden md:table-cell">
                                    {t.ticketType ? (
                                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full" style={{ background: "rgba(255,255,0,0.1)", color: "#FFFF00" }}>
                                        {t.ticketType}
                                      </span>
                                    ) : (
                                      <span className="text-gray-700 text-xs">—</span>
                                    )}
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
              </>
            )}
          </div>
        </>
      )}

      {!loadingEvents && events.length === 0 && !error && (
        <div className="rounded-xl border border-dashed py-16 text-center" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <p className="text-gray-600 text-sm">No events created yet.</p>
        </div>
      )}

      {/* ── Download preview modal ───────────────────────────────── */}
      <AnimatePresence>
        {preview && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.88)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setPreview(null); }}
          >
            <motion.div
              className="w-full max-w-3xl flex flex-col rounded-2xl border overflow-hidden"
              style={{
                borderColor: "rgba(255,255,0,0.2)",
                background: "#0a0a0a",
                maxHeight: "80vh",
                boxShadow: "0 0 60px rgba(255,255,0,0.08)",
              }}
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: "spring", damping: 22, stiffness: 300 }}
            >
              {/* Header */}
              <div className="flex items-start justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div>
                  <p className="text-[9px] text-gray-600 uppercase tracking-[0.25em] mb-1">Export Preview</p>
                  <h3 className="text-white font-bold uppercase tracking-widest text-sm">{preview.label}</h3>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {preview.rows.length} row{preview.rows.length !== 1 ? "s" : ""} · {activeEvent?.title}
                  </p>
                </div>
                <button
                  onClick={() => setPreview(null)}
                  className="text-gray-600 hover:text-white transition-colors mt-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable table preview */}
              <div className="admin-scroll overflow-auto flex-1 min-h-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[680px]">
                    <thead>
                      <tr
                        className="text-gray-600 text-[9px] uppercase tracking-widest border-b sticky top-0"
                        style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0d0d0d" }}
                      >
                        {["#", "Name", "Email", "Reference", "Type", "Qty", "Amount", "Status", "Purchased"].map((col) => (
                          <th key={col} className="text-left px-4 py-2.5 whitespace-nowrap font-bold">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((t, i) => {
                        const statusColor = t.status === "confirmed" ? "#00FF41" : "#FFFF00";
                        return (
                          <tr
                            key={t.id}
                            className="border-b hover:bg-white/[0.02] transition-colors"
                            style={{ borderColor: "rgba(255,255,255,0.04)" }}
                          >
                            <td className="px-4 py-2.5 text-gray-600">{i + 1}</td>
                            <td className="px-4 py-2.5 text-white font-medium whitespace-nowrap">{t.name}</td>
                            <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{t.email}</td>
                            <td className="px-4 py-2.5 font-mono text-gray-500 text-[10px] whitespace-nowrap">{t.reference}</td>
                            <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{t.ticketType ?? "—"}</td>
                            <td className="px-4 py-2.5 text-gray-300">{t.quantity}x</td>
                            <td className="px-4 py-2.5 text-gray-300 whitespace-nowrap">{fmt(t.amount)}</td>
                            <td className="px-4 py-2.5">
                              <span
                                className="px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest text-[9px]"
                                style={{ background: `${statusColor}15`, color: statusColor }}
                              >
                                {t.status}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                              {t.purchasedAt
                                ? new Date((t.purchasedAt as { seconds: number }).seconds * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <button
                  onClick={() => setPreview(null)}
                  className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10 text-gray-500 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { exportXlsx(preview.rows, preview.suffix); setPreview(null); }}
                  className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest"
                  style={{ background: "#FFFF00", color: "#000", boxShadow: "0 0 20px rgba(255,255,0,0.25)" }}
                >
                  <Download className="w-3 h-3" /> Download XLSX
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
