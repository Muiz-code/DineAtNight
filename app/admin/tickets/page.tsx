"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DanEvent, DanTicket } from "@/lib/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Download, ChevronLeft, ChevronRight, X, Mail, Check } from "lucide-react";
import { logAdminAction } from "@/lib/adminLog";
import { ticketAvailability, ticketKind, TICKET_KINDS, type TicketKind } from "@/lib/ticketInventory";
import TicketOrders from "../_components/TicketOrders";
import * as XLSX from "xlsx";

type TicketTab = "all" | "unscanned" | "scanned";

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
  const [allTickets, setAllTickets] = useState<DanTicket[]>([]);
  const [view, setView] = useState<"tickets" | "orders">("tickets");
  const [now, setNow] = useState(() => Date.now());
  const [resendTarget, setResendTarget] = useState<DanTicket | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [error, setError] = useState("");
  const [ticketTab, setTicketTab] = useState<TicketTab>("all");
  // Single / group QR / sent to guests — see ticketKind
  const [kindFilter, setKindFilter] = useState<TicketKind | "all">("all");
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
        setError("Couldn't load events. Refresh the page — if it keeps happening, contact the site developer.");
      } finally {
        setLoadingEvents(false);
      }
    };
    load();
  }, []);

  // Live updates keep payments and gate confirmations in sync without refreshing.
  useEffect(() => {
    if (!selectedEvent) return;
    setLoadingTickets(true); setTickets([]); setAllTickets([]); setError("");
    return onSnapshot(query(collection(db, "tickets"), where("eventId", "==", selectedEvent)), snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() } as DanTicket));
      rows.sort((a,b) => (b.purchasedAt?.seconds ?? 0)-(a.purchasedAt?.seconds ?? 0));
      setAllTickets(rows);
      setTickets(rows.filter(t => t.status === "paid" || t.status === "confirmed"));
      setLoadingTickets(false);
    }, err => { console.error(err); setError("Could not load tickets."); setLoadingTickets(false); });
  }, [selectedEvent]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 10000); return () => clearInterval(timer); }, []);

  // Reset page on event or tab change
  useEffect(() => { setPage(0); }, [selectedEvent, ticketTab, kindFilter]);

  const activeEvent = events.find((e) => e.id === selectedEvent);
  const soldCount = tickets.reduce((s, t) => s + t.quantity, 0);
  const confirmedCount = tickets.filter((t) => t.status === "confirmed").reduce((s, t) => s + t.quantity, 0);
  const revenue = tickets.filter((t) => t.status !== "pending").reduce((s, t) => s + t.amount, 0) / 100;
  const inventory = activeEvent ? ticketAvailability(activeEvent, allTickets, now) : null;
  const remaining = inventory?.available ?? 0;
  const reviewPayments = allTickets.filter(t => t.paymentReview);
  const paidOrders = tickets.filter(t => !t.parentReference).length;
  const buyerOf = (t: DanTicket) => tickets.find(b => b.reference === (t.parentReference ?? t.reference));

  // Orders sent to different emails: buyer's reference → { buyer, scanned, total }
  const orders = new Map<string, { buyer: string; scanned: number; total: number }>();
  for (const t of tickets) {
    const key = t.parentReference ?? (t.guestReferences?.length ? t.reference : null);
    if (!key) continue;
    const o = orders.get(key) ?? { buyer: "", scanned: 0, total: 0 };
    if (!t.parentReference) o.buyer = t.name;
    o.total += 1;
    if (t.status === "confirmed") o.scanned += 1;
    orders.set(key, o);
  }
  const orderOf = (t: DanTicket) => orders.get(t.parentReference ?? t.reference);

  // Derived display + pagination
  const inTab = (t: DanTicket) =>
    ticketTab === "all" || (ticketTab === "scanned" ? t.status === "confirmed" : t.status === "paid");
  const displayTickets = tickets.filter((t) => inTab(t) && (kindFilter === "all" || ticketKind(t) === kindFilter));
  const kindLabel = kindFilter === "all" ? "" : ` · ${TICKET_KINDS.find((k) => k.key === kindFilter)?.label}`;
  const kindSuffix = kindFilter === "all" ? "" : `-${kindFilter}`;
  const totalPages = Math.ceil(displayTickets.length / pageSize);
  const pageTickets = displayTickets.slice(page * pageSize, (page + 1) * pageSize);
  const fromRow = displayTickets.length > 0 ? page * pageSize + 1 : 0;
  const toRow = Math.min((page + 1) * pageSize, displayTickets.length);

  const exportXlsx = (rows: DanTicket[], suffix: string) => {
    const data = rows.map((t) => ({
      Name: t.name,
      Email: t.email,
      Phone: (t as DanTicket & { phone?: string }).phone ?? "",
      "Age Range": t.ageRange ?? "—",
      // Only the buyer gave consent — guests' emails were entered by the buyer
      "Sponsor Marketing Consent": t.parentReference ? "—" : t.marketingConsent === undefined ? "—" : t.marketingConsent ? "Yes" : "No",
      "Order (buyer)": t.purchasedBy ?? (t.guestReferences?.length ? t.name : ""),
      "Order Ref": t.parentReference ?? (t.guestReferences?.length ? t.reference : ""),
      Reference: t.reference,
      "Ticket Type": t.ticketType ?? "—",
      Quantity: t.quantity,
      "Order payment (NGN; recorded once on buyer)": t.parentReference ? "Included in order" : t.amount / 100,
      "Coupon Code": t.coupon?.code ?? "",
      "Coupon #": t.coupon ? `${t.coupon.codeNumber} of ${t.coupon.codeCount}` : "",
      "Coupon Campaign": t.coupon?.campaignName ?? "",
      "Coupon % Off (1 ticket)": t.coupon?.percentOff ?? "",
      "Coupon Discount (NGN)": t.coupon ? t.coupon.discountKobo / 100 : "",
      "Full Price Before Coupon (NGN)": t.coupon ? t.coupon.fullAmountKobo / 100 : "",
      "Entry Override": t.entryOverride ? `${t.entryOverride.reason} — by ${t.entryOverride.by}` : "",
      Status: t.status,
      Purchased: (buyerOf(t)?.purchasedAt ?? t.purchasedAt)
        ? new Date(((buyerOf(t)?.purchasedAt ?? t.purchasedAt) as { seconds: number }).seconds * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
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
                onClick={() => { setSelectedEvent(ev.id!); setTicketTab("all"); setKindFilter("all"); }}
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
              { label: "Admissions Sold", value: loadingTickets ? "…" : soldCount, color: "#FFFF00", glow: "rgba(255,255,0,0.5)" },
              { label: "Admissions Checked In", value: loadingTickets ? "…" : confirmedCount, color: "#00FF41", glow: "rgba(0,255,65,0.5)" },
              {
                label: "Available to Buy",
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

          <p className="text-xs text-gray-500">Available to buy excludes {inventory?.reserved ?? 0} admissions reserved in active checkouts.</p>
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

          <section className="rounded-xl border border-white/10 p-4 space-y-3">
            <h3 className="text-sm font-bold text-white">Tier allocations</h3>
            {loadingTickets ? <p className="text-gray-500 text-sm">Loading inventory...</p> : <div className="overflow-x-auto"><table className="w-full text-sm text-left">
              <thead className="text-gray-500"><tr>{["Tier", "Allocation", "Sold", "Reserved", "Available"].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead>
              <tbody>{inventory?.tiers.map(t => <tr key={t.name} className="border-t border-white/5 text-gray-300">
                <td className="p-2">{t.name}{t.overAllocation > 0 && <span className="block text-xs text-red-400">{t.overAllocation} over allocation</span>}</td>
                <td className="p-2">{t.limit ?? "Unlimited"}</td><td className="p-2">{t.sold}</td><td className="p-2">{t.reserved}</td><td className="p-2">{t.available ?? "Unlimited"}</td>
              </tr>)}</tbody>
            </table></div>}
            <p className="text-xs text-gray-500">Checkout reservations last 15 minutes. Existing paid tickets remain valid, including sales above allocation.</p>
          </section>
          {reviewPayments.length > 0 && <section className="rounded-xl border border-red-500/40 p-4 space-y-3">
            <h3 className="text-sm font-bold text-red-400">Payments awaiting review / refund ({reviewPayments.length})</h3>
            <p className="text-xs text-gray-400">Payment received after the reservation expired and inventory was unavailable. No entry tickets or guest QR codes were issued. Review each reference and process any refund in Paystack.</p>
            {reviewPayments.map(t => <div key={t.reference} className="text-sm text-white border-t border-white/10 pt-3">
              <p>{t.name} | {t.quantity} admissions requested | {fmt(t.amount)} received</p>
              <p className="text-xs text-gray-400 break-all">{t.email} | {t.ticketType} | {t.reference}</p>
            </div>)}
          </section>}
          <div className="space-y-3">
            <p className="text-sm text-gray-400">{paidOrders} paid orders | {tickets.length} ticket QR codes | {soldCount} admissions sold</p>
            <p className="text-xs text-gray-500">Awaiting check-in: {soldCount-confirmedCount} admissions across {tickets.filter(t => t.status === "paid").length} QR codes. Checked in: {confirmedCount} admissions across {tickets.filter(t => t.status === "confirmed").length} QR codes.</p>
            <div className="flex flex-wrap gap-2">{(["tickets", "orders"] as const).map(v => <button key={v} onClick={() => setView(v)} className={"rounded-lg border px-4 py-2 text-sm " + (view === v ? "border-[#FFFF00] text-[#FFFF00]" : "border-white/10 text-gray-500")}>{v === "tickets" ? "Ticket list" : "Paid orders"}</button>)}</div>
            {view === "orders" && !loadingTickets && <TicketOrders key={selectedEvent} tickets={tickets} onResend={setResendTarget} />}
          </div>
          {/* Ticket list */}
          {view === "tickets" && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                Ticket list
                {loadingTickets
                  ? <span className="ml-2 inline-block w-3 h-3 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin align-middle" />
                  : <span className="text-gray-600 font-normal ml-1">({tickets.length} total)</span>
                }
              </h3>

              {/* Scanned / Unscanned tabs */}
              <div className="flex flex-wrap gap-1 p-1 rounded-xl border border-white/8 bg-white/[0.02]">
                {([
                  { key: "all" as TicketTab, label: "All tickets", accent: "#FFFF00", count: tickets.length },
                  { key: "unscanned" as TicketTab, label: "Awaiting check-in / QR codes", accent: "#FFFF00", count: tickets.filter((t) => t.status === "paid").length },
                  { key: "scanned"   as TicketTab, label: "Checked in / QR codes",   accent: "#00FF41", count: tickets.filter((t) => t.status === "confirmed").length },
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

              {/* How each QR code was bought — Single / Group QR / Sent to guests (own line) */}
              <div className="w-full flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-gray-600 uppercase tracking-widest mr-1">Type</span>
              {([{ key: "all" as const, label: "All", hint: "" }, ...TICKET_KINDS]).map(({ key, label, hint }) => {
                const active = kindFilter === key;
                const count = tickets.filter((t) => inTab(t) && (key === "all" || ticketKind(t) === key)).length;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setKindFilter(key)}
                    title={hint}
                    aria-pressed={active}
                    className={"rounded-full border px-3 py-1.5 text-xs transition-all " + (active ? "border-[#FFFF00] text-[#FFFF00] bg-[#FFFF00]/5" : "border-white/10 text-gray-400 hover:border-white/25")}
                  >
                    {label} <span className="opacity-60">{count}</span>
                  </button>
                );
              })}
              {kindFilter !== "all" && (
                <span className="text-xs text-gray-500">{TICKET_KINDS.find((k) => k.key === kindFilter)?.hint} · counts are QR codes</span>
              )}
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
                        label: `Page ${page + 1} — ${ticketTab === "all" ? "All tickets" : ticketTab === "scanned" ? "Checked in" : "Awaiting check-in"}${kindLabel}`,
                        suffix: `page${page + 1}${kindSuffix}`,
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
                        label: (ticketTab === "all" ? "All tickets" : `All ${ticketTab === "scanned" ? "checked-in" : "awaiting check-in"} tickets`) + kindLabel,
                        suffix: `all${kindSuffix}`,
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
                              <th className="text-left px-5 py-3">Ticket holder</th>
                              <th className="text-left px-4 py-3 hidden sm:table-cell">Reference</th>
                              <th className="text-left px-4 py-3 hidden md:table-cell">Type</th>
                              <th className="text-left px-4 py-3">Admits</th>
                              <th className="text-left px-4 py-3">Order payment</th>
                              <th className="text-left px-4 py-3">
                                {ticketTab === "scanned" ? "Scanned At" : "Purchased"}
                              </th>
                              <th className="px-4 py-3" />
                            </tr>
                          </thead>
                          <tbody>
                            {pageTickets.map((t) => {
                              const dateField = ticketTab === "scanned" ? t.confirmedAt : (buyerOf(t)?.purchasedAt ?? t.purchasedAt);
                              const dateStr = dateField
                                ? new Date((dateField as { seconds: number }).seconds * 1000).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                                : "—";
                              const accent = ticketTab === "scanned" ? "#00FF41" : "#FFFF00";
                              return (
                                <tr key={t.id} className="border-b hover:bg-white/[0.02] transition-colors" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                                  <td className="px-5 py-3">
                                    <p className="text-white font-medium">{t.name}</p>
                                    <p className="text-gray-600 text-xs">
                                      {t.email}
                                      {t.ageRange && <span className="text-gray-500"> · {t.ageRange}</span>}
                                      {orderOf(t) && (
                                        <span className="text-[#C084FC]">
                                          {" "}· {orderOf(t)!.buyer || t.purchasedBy}&apos;s order · {orderOf(t)!.scanned}/{orderOf(t)!.total} scanned
                                        </span>
                                      )}
                                    </p>
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
                                  <td className="px-4 py-3 text-gray-300 text-sm">{t.parentReference ? "Included in order" : fmt(t.amount) + " (order total)"}</td>
                                  <td className="px-4 py-3">
                                    <span className="text-[10px] font-medium" style={{ color: accent }}>{dateStr}</span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={() => setResendTarget(t)}
                                      title="Resend this ticket's email (same ticket and QR code)"
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-white/10 text-gray-400 hover:text-white hover:border-white/25 transition-all whitespace-nowrap"
                                    >
                                      <Mail className="w-3 h-3" /> Resend
                                    </button>
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
          )}
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
                        {["#", "Name", "Email", "Age", "Reference", "Type", "Qty", "Amount", "Status", "Purchased"].map((col) => (
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
                            <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{t.ageRange ?? "—"}</td>
                            <td className="px-4 py-2.5 font-mono text-gray-500 text-[10px] whitespace-nowrap">{t.reference}</td>
                            <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{t.ticketType ?? "—"}</td>
                            <td className="px-4 py-2.5 text-gray-300">{t.quantity}x</td>
                            <td className="px-4 py-2.5 text-gray-300 whitespace-nowrap">{t.parentReference ? "Included in order" : fmt(t.amount) + " (order total)"}</td>
                            <td className="px-4 py-2.5">
                              <span
                                className="px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest text-[9px]"
                                style={{ background: `${statusColor}15`, color: statusColor }}
                              >
                                {t.status}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                              {(buyerOf(t)?.purchasedAt ?? t.purchasedAt)
                                ? new Date(((buyerOf(t)?.purchasedAt ?? t.purchasedAt) as { seconds: number }).seconds * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
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

      <AnimatePresence>
        {resendTarget && <ResendTicketDialog ticket={resendTarget} onClose={() => setResendTarget(null)} />}
      </AnimatePresence>
    </div>
  );
}

/** Re-sends an existing ticket's email — same reference and QR code, never a new ticket. */
function ResendTicketDialog({ ticket, onClose }: { ticket: DanTicket; onClose: () => void }) {
  const [useOther, setUseOther] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");

  const send = async () => {
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/admin/tickets/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: ticket.reference, ...(useOther ? { email } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not resend.");
        setState("idle");
        return;
      }
      setSentTo(data.sentTo);
      setState("sent");
      await logAdminAction(
        "RESEND_TICKET_EMAIL",
        `Resent ticket ${ticket.reference} for "${ticket.name}" to ${data.sentTo}`,
        { type: "ticket", id: ticket.reference, name: ticket.name },
      );
    } catch {
      setError("Network error — please try again.");
      setState("idle");
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={state === "sending" ? undefined : onClose} />
      <motion.div
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 space-y-4"
        initial={{ scale: 0.94, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 16 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#FFFF00]">Resend ticket</h2>
            <p className="text-gray-500 text-xs mt-1">
              {ticket.name} · <span className="font-mono">{ticket.reference}</span>
            </p>
          </div>
          <button onClick={onClose} disabled={state === "sending"} className="text-gray-600 hover:text-white" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {state === "sent" ? (
          <>
            <p className="flex items-start gap-2 text-sm text-[#00FF41]">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" /> Sent to {sentTo}. Ask them to check spam if it doesn&apos;t arrive.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-full text-xs font-bold uppercase tracking-widest bg-[#00FF41] text-black"
            >
              Done
            </button>
          </>
        ) : (
          <>
            <p className="text-gray-400 text-sm leading-relaxed">
              Sends the same ticket and QR code again — no new ticket is created.
              {ticket.parentReference ? " This is a guest ticket, so it goes out as their guest copy." : ""}
            </p>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input type="radio" checked={!useOther} onChange={() => setUseOther(false)} className="accent-[#FFFF00]" />
                <span className="truncate">To {ticket.email}</span>
              </label>
              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input type="radio" checked={useOther} onChange={() => setUseOther(true)} className="accent-[#FFFF00]" />
                To a different email
              </label>
              {useOther && (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correct@example.com"
                  autoFocus
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] placeholder:text-gray-700"
                />
              )}
            </div>
            {error && <p className="text-[#FF3333] text-xs">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={state === "sending"}
                className="flex-1 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/12 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={send}
                disabled={state === "sending" || (useOther && !email.trim())}
                className="flex-1 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest bg-[#FFFF00] text-black disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {state === "sending" && <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />}
                Send
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
