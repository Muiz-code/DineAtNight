"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DanEvent, DanTicket, DanMerchOrder } from "@/lib/firestore";
import { getAllTickets, subscribeMerchOrders } from "@/lib/firestore";
import Link from "next/link";
import {
  Calendar, Ticket, TrendingUp, Users, AlertCircle, ShoppingBag,
  Download, X, type LucideIcon,
} from "lucide-react";
import * as XLSX from "xlsx";

/* ── Helpers ─────────────────────────────────────────────────── */

/** Flatten a Firestore document for full export — converts timestamps, arrays, nested objects */
const flattenDoc = (input: unknown): Record<string, string | number | boolean> => {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (v == null) {
      out[k] = "";
    } else if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    } else if (typeof v === "object" && "seconds" in (v as object)) {
      out[k] = new Date((v as { seconds: number }).seconds * 1000)
        .toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } else if (Array.isArray(v)) {
      out[k] = v.map((i) => (typeof i === "object" ? JSON.stringify(i) : String(i))).join(" | ");
    } else if (typeof v === "object") {
      out[k] = JSON.stringify(v);
    } else {
      out[k] = String(v);
    }
  }
  return out;
};

/** Column definitions for the Basic export mode */
const BASIC_FIELDS: Record<string, string[]> = {
  Summary:        ["Metric", "Value"],
  Events:         ["Title", "Edition", "Date", "Venue", "Status", "Total Tickets", "Tickets Sold", "Fill %"],
  Tickets:        ["Name", "Email", "Reference", "Event", "Ticket Type", "Quantity", "Amount (₦)", "Status", "Purchased", "Scanned At"],
  "Merch Orders": ["Name", "Email", "Phone", "Items", "Total (₦)", "Payment Status", "Delivery Status", "Address", "Reference"],
  Vendors:        ["Brand Name", "Contact Name", "Email", "Phone", "Instagram", "Status", "Categories", "Event Applied", "Description"],
};

/* ── StatCard ─────────────────────────────────────────────────── */
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

/* ── Page ─────────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const [events, setEvents] = useState<DanEvent[]>([]);
  const [tickets, setTickets] = useState<DanTicket[]>([]);
  const [orders, setOrders] = useState<DanMerchOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportPreview, setExportPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMode, setExportMode] = useState<"basic" | "full">("basic");

  useEffect(() => {
    const load = async () => {
      try {
        const [evSnap, txs] = await Promise.all([
          getDocs(collection(db, "events")),
          getAllTickets(),
        ]);
        const evs = evSnap.docs.map((d) => ({ id: d.id, ...d.data() } as DanEvent));
        evs.sort((a, b) => (b.date?.seconds ?? 0) - (a.date?.seconds ?? 0));
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
    const unsub = subscribeMerchOrders((ords) => setOrders(ords));
    return () => unsub();
  }, []);

  const { totalRevenue, confirmedTickets, paidTickets, soldByEvent, revenueByEvent } = useMemo(() => {
    const existingEventIds = new Set(events.map((e) => e.id));
    const activeTickets = tickets.filter((t) => existingEventIds.has(t.eventId));
    const paid = activeTickets.filter((t) => t.status !== "pending");
    const byEvent: Record<string, number> = {};
    const revByEvent: Record<string, number> = {};
    for (const t of paid) {
      byEvent[t.eventId]    = (byEvent[t.eventId]    ?? 0) + t.quantity;
      revByEvent[t.eventId] = (revByEvent[t.eventId] ?? 0) + t.amount / 100;
    }
    return {
      totalRevenue:     paid.reduce((s, t) => s + t.amount, 0) / 100,
      confirmedTickets: activeTickets.filter((t) => t.status === "confirmed").reduce((s, t) => s + t.quantity, 0),
      paidTickets:      paid.reduce((s, t) => s + t.quantity, 0),
      soldByEvent:      byEvent,
      revenueByEvent:   revByEvent,
    };
  }, [tickets, events]);

  const activeEvents = useMemo(() => events.filter((e) => e.status === "active").length, [events]);

  const { paidOrders, merchRevenue } = useMemo(() => {
    const paid = orders.filter((o) => o.status === "paid");
    return { paidOrders: paid, merchRevenue: paid.reduce((s, o) => s + o.total, 0) };
  }, [orders]);

  /* ── Preview sample rows (tickets, mode-aware) ────────────── */
  const previewSampleRows = useMemo((): Record<string, string | number | boolean>[] => {
    const rows = tickets.filter((t) => t.status === "paid" || t.status === "confirmed").slice(0, 3);
    if (exportMode === "basic") {
      return rows.map((t) => ({
        Name:           t.name,
        Email:          t.email,
        Reference:      t.reference,
        "Ticket Type":  t.ticketType ?? "—",
        Quantity:       t.quantity,
        "Amount (₦)":   t.amount / 100,
        Status:         t.status,
        Purchased: t.purchasedAt
          ? new Date((t.purchasedAt as { seconds: number }).seconds * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short" })
          : "—",
      }));
    }
    return rows.map((t) => flattenDoc(t));
  }, [tickets, exportMode]);

  const previewSampleCols = useMemo(
    () => (previewSampleRows.length > 0 ? Object.keys(previewSampleRows[0]) : []),
    [previewSampleRows]
  );

  /* ── Export function ─────────────────────────────────────── */
  const exportAll = async () => {
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      const isBasic = exportMode === "basic";

      // ── Summary (same for both modes) ──────────────────────
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
        { Metric: "Active Events",      Value: activeEvents },
        { Metric: "Total Events",       Value: events.length },
        { Metric: "Tickets Sold",       Value: paidTickets },
        { Metric: "Confirmed at Gate",  Value: confirmedTickets },
        { Metric: "Ticket Revenue (₦)", Value: totalRevenue },
        { Metric: "Merch Orders",       Value: paidOrders.length },
        { Metric: "Merch Revenue (₦)",  Value: merchRevenue },
        { Metric: "Export Mode",        Value: isBasic ? "Basic" : "Full" },
        { Metric: "Exported At",        Value: new Date().toLocaleString("en-NG") },
      ]), "Summary");

      if (isBasic) {
        /* ── Basic: curated, human-readable fields ──────────── */

        // Events
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
          events.map((ev) => ({
            Title:           ev.title,
            Edition:         ev.edition ?? "",
            Date:            ev.date?.toDate?.()?.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) ?? "",
            Venue:           (ev as DanEvent & Record<string, unknown>).venue ?? "",
            Status:          ev.status,
            "Total Tickets": ev.totalTickets,
            "Tickets Sold":  soldByEvent[ev.id ?? ""] ?? 0,
            "Fill %":        ev.totalTickets > 0 ? Math.round(((soldByEvent[ev.id ?? ""] ?? 0) / ev.totalTickets) * 100) + "%" : "—",
          }))
        ), "Events");

        // Tickets
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
          tickets.map((t) => ({
            Name:          t.name,
            Email:         t.email,
            Reference:     t.reference,
            Event:         t.eventTitle ?? "",
            "Ticket Type": t.ticketType ?? "—",
            Quantity:      t.quantity,
            "Amount (₦)":  t.amount / 100,
            Status:        t.status,
            Purchased:     t.purchasedAt ? new Date((t.purchasedAt as { seconds: number }).seconds * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—",
            "Scanned At":  t.confirmedAt ? new Date((t.confirmedAt as { seconds: number }).seconds * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—",
          }))
        ), "Tickets");

        // Merch Orders
        type OX = DanMerchOrder & Record<string, unknown>;
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
          orders.map((o) => {
            return {
              Name:              o.name,
              Email:             o.email,
              Phone:             o.phone ?? "",
              Items:             o.items.map((i) => `${i.productName} x${i.qty}`).join("; "),
              "Total (₦)":       o.total,
              "Payment Status":  o.status,
              "Delivery Status": o.deliveryStatus ?? "pending",
              Address:           o.address ? `${o.address.street}, ${o.address.city}, ${o.address.state}` : "",
              Reference:         o.reference ?? "",
            };
          })
        ), "Merch Orders");

        // Vendors (fresh fetch)
        const vendorSnap = await getDocs(collection(db, "vendors"));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
          vendorSnap.docs.map((d) => {
            const v = d.data() as Record<string, unknown>;
            return {
              "Brand Name":    v.brandName    ?? "",
              "Contact Name":  v.contactName  ?? "",
              Email:           v.email        ?? "",
              Phone:           v.phone        ?? "",
              Instagram:       v.instagram    ?? "",
              Status:          v.status       ?? "",
              Categories:      Array.isArray(v.foodCategories) ? (v.foodCategories as string[]).join(", ") : "",
              "Event Applied": v.eventApplied ?? "",
              Description:     v.description  ?? "",
            };
          })
        ), "Vendors");

      } else {
        /* ── Full: every stored field + computed analytics ───── */

        // Events — all document fields + computed ticket/revenue metrics
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
          events.map((ev) => {
            const sold      = soldByEvent[ev.id ?? ""] ?? 0;
            const remaining = ev.totalTickets - sold;
            const revenue   = revenueByEvent[ev.id ?? ""] ?? 0;
            return {
              ...flattenDoc(ev),                        // every stored field
              "computed_tickets_sold":      sold,
              "computed_tickets_remaining": remaining,
              "computed_fill_pct":          ev.totalTickets > 0 ? Math.round((sold / ev.totalTickets) * 100) + "%" : "—",
              "computed_revenue_ngn":       revenue,
            };
          })
        ), "Events");

        // Tickets — every stored field (name, email, phone, reference,
        //   eventId, eventTitle, ticketType, quantity, amount, status,
        //   purchasedAt, confirmedAt, and any future fields)
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
          tickets.map((t) => flattenDoc(t))
        ), "Tickets");

        // Merch Orders — all stored fields + each item expanded into
        //   its own columns (Item 1 Name, Item 1 Qty, Item 1 Price, …)
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
          orders.map((o) => {
            const { items, ...orderWithoutItems } = o;
            const flat = flattenDoc(orderWithoutItems);          // base fields
            items.forEach((item, idx) => {
              const n  = idx + 1;
              const it = item as Record<string, unknown>;
              flat[`item_${n}_name`] = String(it.name      ?? "");
              flat[`item_${n}_qty`]  = Number(it.quantity  ?? 0);
              if (it.price  !== undefined) flat[`item_${n}_price_ngn`] = Number(it.price ?? 0);
              if (it.size)               flat[`item_${n}_size`]       = String(it.size);
              if (it.color)              flat[`item_${n}_color`]      = String(it.color);
              if (it.image)              flat[`item_${n}_image`]      = String(it.image);
            });
            return flat;
          })
        ), "Merch Orders");

        // Vendors — all stored fields (brandName, contactName, email, phone,
        //   instagram, foodCategories, menu, mainImage, logoUrl, status,
        //   eventApplied, description, appliedAt, declineReason, …)
        const vendorSnap = await getDocs(collection(db, "vendors"));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
          vendorSnap.docs.map((d) => flattenDoc({ id: d.id, ...d.data() }))
        ), "Vendors");
      }

      const today = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `dan_analytics_${isBasic ? "basic" : "full"}_${today}.xlsx`);
      setExportPreview(false);
    } finally {
      setExporting(false);
    }
  };

  /* ── JSX ─────────────────────────────────────────────────── */
  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-widest" style={{ textShadow: "0 0 20px rgba(255,255,0,0.3)" }}>
            Dashboard
          </h1>
          <p className="text-gray-600 text-sm mt-1">Welcome back — here&apos;s your overview</p>
        </div>
        <button
          onClick={() => setExportPreview(true)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-30 flex-shrink-0"
          style={{ borderColor: "rgba(255,255,0,0.3)", color: "#FFFF00", background: "rgba(255,255,0,0.06)" }}
        >
          <Download className="w-3.5 h-3.5" /> Export All Data
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-[#FF3333]/30 bg-[#FF3333]/05 p-4">
          <AlertCircle className="w-4 h-4 text-[#FF3333] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[#FF3333] text-sm font-medium">Firestore Error</p>
            <p className="text-gray-500 text-xs mt-0.5">{error}</p>
            <p className="text-gray-600 text-xs mt-2">Fix: Firebase Console → Firestore Database → Create database → Start in test mode</p>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Active Events"  value={loading ? "—" : activeEvents}                                  icon={Calendar}    color="#FFFF00" glow="rgba(255,255,0,0.5)" />
        <StatCard label="Tickets Sold"   value={loading ? "—" : paidTickets}                                  icon={Ticket}      color="#FF3333" glow="rgba(255,51,51,0.5)" />
        <StatCard label="Confirmed"      value={loading ? "—" : confirmedTickets}                             icon={Users}       color="#00FF41" glow="rgba(0,255,65,0.5)" />
        <StatCard label="Ticket Revenue" value={loading ? "—" : `₦${totalRevenue.toLocaleString()}`}         icon={TrendingUp}  color="#FFFF00" glow="rgba(255,255,0,0.5)" />
        <StatCard label="Merch Orders"   value={loading ? "—" : paidOrders.length}                           icon={ShoppingBag} color="#00FF41" glow="rgba(0,255,65,0.5)" />
        <StatCard label="Merch Revenue"  value={loading ? "—" : `₦${merchRevenue.toLocaleString()}`}         icon={TrendingUp}  color="#FF3333" glow="rgba(255,51,51,0.5)" />
      </div>

      {/* Events summary */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">
            Recent Events
            {loading && <span className="ml-2 inline-block w-3 h-3 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin align-middle" />}
          </h2>
          <Link href="/admin/events" className="text-xs text-gray-600 hover:text-[#FFFF00] transition-colors uppercase tracking-widest">Manage All →</Link>
        </div>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {!loading && events.length === 0 ? (
            <div className="py-12 text-center text-gray-600 text-sm">No events yet. <Link href="/admin/events" className="text-[#FFFF00] underline">Create one →</Link></div>
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
                            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full" style={{ background: `${statusColor}15`, color: statusColor }}>{ev.status}</span>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recent merch orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">
            Recent Merch Orders
            {loading && <span className="ml-2 inline-block w-3 h-3 border-2 border-[#00FF41] border-t-transparent rounded-full animate-spin align-middle" />}
          </h2>
          <Link href="/admin/orders" className="text-xs text-gray-600 hover:text-[#00FF41] transition-colors uppercase tracking-widest">Manage All →</Link>
        </div>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {!loading && orders.length === 0 ? (
            <div className="py-12 text-center text-gray-600 text-sm">No merch orders yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-600 text-[10px] uppercase tracking-widest" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <th className="text-left px-5 py-3">Customer</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Items</th>
                  <th className="text-left px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3">Delivery</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        <td className="px-5 py-4"><div className="h-3 w-28 bg-white/5 rounded animate-pulse" /></td>
                        <td className="px-4 py-4 hidden sm:table-cell"><div className="h-3 w-16 bg-white/5 rounded animate-pulse" /></td>
                        <td className="px-4 py-4"><div className="h-3 w-16 bg-white/5 rounded animate-pulse" /></td>
                        <td className="px-4 py-4"><div className="h-3 w-14 bg-white/5 rounded animate-pulse" /></td>
                      </tr>
                    ))
                  : orders.slice(0, 5).map((o) => {
                      const ds = o.deliveryStatus ?? "pending";
                      const dsColor = ds === "delivered" ? "#00FF41" : ds === "dispatched" ? "#FFFF00" : "#FF3333";
                      return (
                        <tr key={o.id} className="border-b transition-colors hover:bg-white/[0.02]" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                          <td className="px-5 py-3">
                            <p className="text-white font-medium">{o.name}</p>
                            <p className="text-gray-600 text-xs">{o.email}</p>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell text-gray-500 text-xs">{o.items.length} item{o.items.length !== 1 ? "s" : ""}</td>
                          <td className="px-4 py-3 text-white text-xs font-medium">₦{o.total.toLocaleString("en-NG")}</td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full" style={{ background: `${dsColor}15`, color: dsColor }}>{ds}</span>
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
          <Link href="/admin/tickets" className="text-xs text-gray-600 hover:text-[#FFFF00] transition-colors uppercase tracking-widest">View All →</Link>
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
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Type</th>
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
                        <td className="px-4 py-4 hidden lg:table-cell"><div className="h-3 w-14 bg-white/5 rounded animate-pulse" /></td>
                        <td className="px-4 py-4"><div className="h-3 w-8 bg-white/5 rounded animate-pulse" /></td>
                        <td className="px-4 py-4"><div className="h-3 w-14 bg-white/5 rounded animate-pulse" /></td>
                      </tr>
                    ))
                  : tickets.filter((t) => events.some((e) => e.id === t.eventId)).slice(0, 8).map((t) => {
                      const color = t.status === "confirmed" ? "#00FF41" : t.status === "paid" ? "#FFFF00" : "#666";
                      return (
                        <tr key={t.id} className="border-b transition-colors hover:bg-white/[0.02]" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                          <td className="px-5 py-3">
                            <p className="text-white font-medium">{t.name}</p>
                            <p className="text-gray-600 text-xs">{t.email}</p>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-gray-500 text-xs">{t.eventTitle}</td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            {t.ticketType
                              ? <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full" style={{ background: "rgba(255,255,0,0.1)", color: "#FFFF00" }}>{t.ticketType}</span>
                              : <span className="text-gray-700 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-300 text-xs">{t.quantity}x</td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full" style={{ background: `${color}15`, color }}>{t.status}</span>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Export preview modal ────────────────────────────────── */}
      <AnimatePresence>
        {exportPreview && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.9)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setExportPreview(false); }}
          >
            <motion.div
              className="w-full max-w-2xl flex flex-col rounded-2xl border overflow-hidden"
              style={{
                borderColor: "rgba(255,255,0,0.2)",
                background: "#0a0a0a",
                maxHeight: "88vh",
                boxShadow: "0 0 60px rgba(255,255,0,0.08)",
              }}
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: "spring", damping: 22, stiffness: 300 }}
            >
              {/* Header */}
              <div className="flex items-start justify-between px-6 py-5 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div>
                  <p className="text-[9px] text-gray-600 uppercase tracking-[0.25em] mb-1">Export Analytics Data</p>
                  <h3 className="text-white font-bold uppercase tracking-widest">Full Data Export</h3>
                  <p className="text-gray-500 text-xs mt-1">
                    Single XLSX · 5 sheets · {new Date().toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <button onClick={() => setExportPreview(false)} className="text-gray-600 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="admin-scroll overflow-auto flex-1 min-h-0">

                {/* ── Mode toggle ──────────────────────────────── */}
                <div className="px-6 pt-5 pb-5 border-b border-white/5">
                  <p className="text-[9px] text-gray-600 uppercase tracking-[0.2em] mb-3">Select Export Mode</p>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      {
                        mode: "basic" as const,
                        title: "Basic Export",
                        accent: "#FFFF00",
                        desc: "Curated key fields only — clean, human-readable. Best for sharing, reviewing, or printing.",
                        tag: "Recommended",
                      },
                      {
                        mode: "full" as const,
                        title: "Full Export",
                        accent: "#00FF41",
                        desc: "All raw Firestore document fields including IDs, timestamps, nested data, and internal flags.",
                        tag: "Complete data",
                      },
                    ]).map(({ mode, title, accent, desc, tag }) => {
                      const active = exportMode === mode;
                      return (
                        <button
                          key={mode}
                          onClick={() => setExportMode(mode)}
                          className="text-left p-4 rounded-xl border transition-all"
                          style={{
                            borderColor: active ? `${accent}50` : "rgba(255,255,255,0.08)",
                            background: active ? `${accent}08` : "transparent",
                            boxShadow: active ? `0 0 20px ${accent}10` : "none",
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: active ? accent : "rgba(255,255,255,0.6)" }}>
                              {title}
                            </p>
                            {active && (
                              <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full" style={{ background: `${accent}20`, color: accent }}>
                                Selected
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] leading-relaxed" style={{ color: active ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.3)" }}>
                            {desc}
                          </p>
                          <p className="text-[9px] mt-2 uppercase tracking-widest" style={{ color: active ? accent : "rgba(255,255,255,0.2)" }}>
                            {tag}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Sheet list ───────────────────────────────── */}
                <div className="px-6 pt-5 pb-4 border-b border-white/5">
                  <p className="text-[9px] text-gray-600 uppercase tracking-[0.2em] mb-3">Sheets & Fields</p>
                  <div className="space-y-0">
                    {[
                      { sheet: "Summary",        rows: 9,                  color: "#888" },
                      { sheet: "Events",         rows: events.length,      color: "#FFFF00" },
                      { sheet: "Tickets",        rows: tickets.length,     color: "#FF3333" },
                      { sheet: "Merch Orders",   rows: orders.length,      color: "#00FF41" },
                      { sheet: "Vendors",        rows: null,               color: "#888" },
                    ].map((s) => (
                      <div key={s.sheet} className="flex items-start justify-between py-2.5 border-b border-white/5 last:border-0 gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: s.color }} />
                          <div className="min-w-0">
                            <p className="text-white text-xs font-bold">{s.sheet}</p>
                            {exportMode === "basic" && BASIC_FIELDS[s.sheet] ? (
                              <p className="text-gray-600 text-[10px] mt-0.5 leading-relaxed">
                                {BASIC_FIELDS[s.sheet].join("  ·  ")}
                              </p>
                            ) : (
                              <p className="text-gray-600 text-[10px] mt-0.5 leading-relaxed">
                                {s.sheet === "Events"        && "All stored fields + computed: tickets sold, remaining, fill %, revenue"}
                                {s.sheet === "Tickets"       && "All stored fields: name, email, phone, reference, eventId, ticketType, amount, purchasedAt, confirmedAt…"}
                                {s.sheet === "Merch Orders"  && "All stored fields + each cart item expanded into individual columns (name, qty, price, size, color)"}
                                {s.sheet === "Vendors"       && "All stored fields: brand, contact, menu, images, food categories, status, declineReason, appliedAt…"}
                                {s.sheet === "Summary"       && "Key metrics snapshot"}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-gray-600 text-[10px] font-mono">{s.rows !== null ? `${s.rows} rows` : "live fetch"}</p>
                          <p className="text-gray-700 text-[10px] font-mono">
                            {exportMode === "basic"
                              ? `${BASIC_FIELDS[s.sheet]?.length ?? 2} cols`
                              : "all cols"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Data sample ──────────────────────────────── */}
                <div className="px-6 pt-5 pb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[9px] text-gray-600 uppercase tracking-[0.2em]">
                      Data Sample <span className="normal-case text-gray-700">(tickets · first 3 rows)</span>
                    </p>
                    <span
                      className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest"
                      style={{
                        background: exportMode === "basic" ? "rgba(255,255,0,0.08)" : "rgba(0,255,65,0.08)",
                        color: exportMode === "basic" ? "#FFFF00" : "#00FF41",
                      }}
                    >
                      {exportMode === "basic" ? "Basic fields" : "All fields"}
                    </span>
                  </div>

                  {previewSampleRows.length === 0 ? (
                    <div className="rounded-xl border border-dashed py-8 text-center" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                      <p className="text-gray-700 text-xs">No ticket data available for preview.</p>
                    </div>
                  ) : (
                    <div className="admin-scroll overflow-x-auto rounded-xl border" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <table className="text-[10px]" style={{ minWidth: "max-content", width: "100%" }}>
                        <thead>
                          <tr
                            className="border-b"
                            style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0d0d0d" }}
                          >
                            {previewSampleCols.map((col) => (
                              <th
                                key={col}
                                className="text-left px-3 py-2.5 text-gray-600 uppercase tracking-widest whitespace-nowrap font-bold text-[9px]"
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewSampleRows.map((row, i) => (
                            <tr
                              key={i}
                              className="border-b last:border-0 hover:bg-white/[0.02] transition-colors"
                              style={{ borderColor: "rgba(255,255,255,0.04)" }}
                            >
                              {previewSampleCols.map((col) => (
                                <td
                                  key={col}
                                  className="px-3 py-2.5 text-gray-400 whitespace-nowrap"
                                  style={{ maxWidth: 160 }}
                                >
                                  <span className="block truncate">{String(row[col] ?? "—")}</span>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>{/* end scrollable body */}

              {/* Footer */}
              <div
                className="flex items-center justify-between px-6 py-4 border-t flex-shrink-0"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <p className="text-gray-700 text-[10px] uppercase tracking-widest">
                  {exportMode === "basic" ? "Human-readable · Key fields only" : "Raw data · All document fields"}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setExportPreview(false)}
                    className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10 text-gray-500 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={exportAll}
                    disabled={exporting}
                    className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest disabled:opacity-60 transition-opacity"
                    style={{
                      background: exportMode === "basic" ? "#FFFF00" : "#00FF41",
                      color: "#000",
                      boxShadow: exportMode === "basic" ? "0 0 20px rgba(255,255,0,0.25)" : "0 0 20px rgba(0,255,65,0.25)",
                    }}
                  >
                    {exporting
                      ? <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      : <Download className="w-3 h-3" />}
                    {exporting ? "Exporting…" : `Download ${exportMode === "basic" ? "Basic" : "Full"} XLSX`}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
