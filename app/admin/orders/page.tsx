"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  ChevronDown,
  ChevronUp,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  PackageX,
  Undo2,
  X,
  Trash2,
} from "lucide-react";
import {
  subscribeMerchOrders,
  updateMerchOrderDelivery,
  deleteMerchOrder,
  type DanMerchOrder,
} from "@/lib/firestore";
type DeliveryStatus = DanMerchOrder["deliveryStatus"];
type Tab = "all" | DeliveryStatus;

const TABS: { key: Tab; label: string }[] = [
  { key: "all",        label: "All Orders" },
  { key: "pending",    label: "Pending" },
  { key: "dispatched", label: "Dispatched" },
  { key: "delivered",  label: "Delivered" },
  { key: "returned",   label: "Returned" },
];

const statusColor = (s: DeliveryStatus): string => {
  if (s === "delivered")  return "#00FF41";
  if (s === "dispatched") return "#FFFF00";
  if (s === "returned")   return "#FF8C00";
  return "#FF3333";
};

type LucideComponent = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

const statusIcon = (s: DeliveryStatus): LucideComponent => {
  if (s === "delivered")  return CheckCircle2;
  if (s === "dispatched") return Truck;
  if (s === "returned")   return PackageX;
  return Clock;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<DanMerchOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<{
    id: string;
    targetStatus: DeliveryStatus;
    label: string;
  } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    return subscribeMerchOrders((data) => {
      setOrders(data);
      setLoading(false);
    });
  }, []);

  const paidOrders = orders.filter((o) => o.status === "paid");
  const totalRevenue = paidOrders.reduce((s, o) => s + o.total, 0);
  const filtered = tab === "all" ? orders : orders.filter((o) => (o.deliveryStatus ?? "pending") === tab);

  const handleDelivery = async (id: string, status: DeliveryStatus, note?: string) => {
    setUpdating((prev) => new Set(prev).add(id));
    setUpdateError(null);
    try {
      await updateMerchOrderDelivery(id, status, note);
    } catch (err) {
      console.error("[orders] Delivery update failed:", err);
      setUpdateError("Update failed — please try again.");
    } finally {
      setUpdating((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  // Opens the note modal for reversing actions
  const openNoteModal = (id: string, targetStatus: DeliveryStatus, label: string) => {
    setNoteText("");
    setNoteModal({ id, targetStatus, label });
  };

  const confirmNote = async () => {
    if (!noteModal) return;
    await handleDelivery(noteModal.id, noteModal.targetStatus, noteText.trim() || undefined);
    setNoteModal(null);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteMerchOrder(id);
    } catch (err) {
      console.error("[orders] Delete failed:", err);
    } finally {
      setDeleting(null);
      setDeleteConfirm(null);
      if (expanded === id) setExpanded(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-white uppercase tracking-widest"
          style={{ textShadow: "0 0 20px rgba(0,255,65,0.3)" }}
        >
          Merch Orders
        </h1>
        <p className="text-gray-600 text-sm mt-1">
          {loading ? "Loading…" : `${paidOrders.length} paid order${paidOrders.length !== 1 ? "s" : ""} · ₦${totalRevenue.toLocaleString("en-NG")} total revenue`}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map((t) => {
          const count =
            t.key === "all"
              ? orders.length
              : orders.filter((o) => (o.deliveryStatus ?? "pending") === t.key).length;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border"
              style={{
                borderColor: active ? "#00FF41" : "rgba(255,255,255,0.1)",
                color: active ? "#00FF41" : "rgba(255,255,255,0.4)",
                background: active ? "rgba(0,255,65,0.08)" : "transparent",
                boxShadow: active ? "0 0 15px rgba(0,255,65,0.2)" : "none",
              }}
            >
              {t.label}
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                style={{
                  background: active ? "#00FF41" : "rgba(255,255,255,0.1)",
                  color: active ? "#000" : "rgba(255,255,255,0.5)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Error banner */}
      {updateError && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl border text-sm" style={{ borderColor: "rgba(255,51,51,0.35)", background: "rgba(255,51,51,0.08)", color: "#FF3333" }}>
          <span>{updateError}</span>
          <button onClick={() => setUpdateError(null)} className="ml-3 text-[#FF3333] hover:opacity-70">✕</button>
        </div>
      )}

      {/* Orders list */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {loading ? (
          <div className="py-12 flex items-center justify-center gap-3 text-gray-600">
            <div className="w-5 h-5 border-2 border-[#00FF41] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading orders…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-600 space-y-3">
            <Package className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-sm">
              {tab === "all" ? "No orders yet." : `No orders with status "${tab}".`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((order) => {
              const ds = order.deliveryStatus ?? "pending";
              const color = statusColor(ds);
              const StatusIcon = statusIcon(ds);
              const isExpanded = expanded === order.id;

              return (
                <div key={order.id} className="transition-colors hover:bg-white/[0.015]">
                  {/* Row summary */}
                  <div className="flex items-center">
                  <button
                    className="flex-1 flex items-center gap-4 px-5 py-4 text-left"
                    onClick={() => setExpanded(isExpanded ? null : (order.id ?? null))}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}12`, border: `1px solid ${color}25` }}
                    >
                      <StatusIcon className="w-4 h-4" style={{ color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{order.name}</p>
                      <p className="text-gray-600 text-xs truncate">{order.email}</p>
                    </div>

                    <div className="hidden sm:block text-right mr-4">
                      <p className="text-white text-sm font-bold">₦{order.total.toLocaleString("en-NG")}</p>
                      <p className="text-gray-600 text-xs">
                        {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                      </p>
                    </div>

                    <span
                      className="flex-shrink-0 text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full"
                      style={{ background: `${color}15`, color }}
                    >
                      {ds}
                    </span>

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    )}
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => setDeleteConfirm(order.id ?? null)}
                    className="flex-shrink-0 p-2.5 mr-3 rounded-lg transition-colors hover:bg-red-500/10 group"
                    title="Delete order"
                  >
                    <Trash2 className="w-4 h-4 text-gray-700 group-hover:text-red-500 transition-colors" />
                  </button>
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div
                          className="px-5 pb-6 space-y-5"
                          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                        >
                          {/* Customer + Address */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-5">
                            <div className="space-y-1.5">
                              <p className="text-[10px] uppercase tracking-widest text-gray-600 font-bold mb-2">
                                Customer
                              </p>
                              <p className="text-white text-sm font-medium">{order.name}</p>
                              <p className="text-gray-500 text-xs">{order.email}</p>
                              <p className="text-gray-500 text-xs">{order.phone}</p>
                            </div>

                            {order.address ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <MapPin className="w-3 h-3 text-gray-600" />
                                  <p className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">
                                    Delivery Address
                                  </p>
                                </div>
                                <p className="text-white text-sm">{order.address.street}</p>
                                <p className="text-gray-500 text-xs">
                                  {order.address.city}, {order.address.state}
                                </p>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2 text-gray-700 text-xs">
                                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                <span>No delivery address provided</span>
                              </div>
                            )}
                          </div>

                          {/* Order items */}
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-gray-600 font-bold mb-2">
                              Order Items
                            </p>
                            <div
                              className="rounded-xl overflow-hidden"
                              style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                            >
                              {order.items.map((item, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between px-4 py-3"
                                  style={{ borderBottom: i < order.items.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                                >
                                  <span className="text-gray-300 text-sm">
                                    {item.productName}{" "}
                                    <span className="text-gray-600">×{item.qty}</span>
                                  </span>
                                  <span className="text-white text-sm font-medium">
                                    ₦{(item.price * item.qty).toLocaleString("en-NG")}
                                  </span>
                                </div>
                              ))}
                              <div
                                className="flex items-center justify-between px-4 py-3"
                                style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.06)" }}
                              >
                                <span className="text-gray-500 text-xs uppercase tracking-widest font-bold">
                                  Total
                                </span>
                                <span className="font-bold text-base" style={{ color: "#00FF41" }}>
                                  ₦{order.total.toLocaleString("en-NG")}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Payment reference */}
                          <div
                            className="rounded-lg px-4 py-3"
                            style={{
                              background: "rgba(255,255,255,0.02)",
                              border: "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            <p className="text-[10px] uppercase tracking-widest text-gray-600 font-bold mb-1">
                              Paystack Reference
                            </p>
                            <p className="font-mono text-xs text-gray-400 break-all">{order.reference}</p>
                          </div>

                          {/* Status history trail */}
                          {order.statusHistory && order.statusHistory.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase tracking-widest text-gray-600 font-bold mb-3">
                                Status Trail
                              </p>
                              <div className="relative">
                                {/* Vertical line */}
                                <div
                                  className="absolute left-[11px] top-2 bottom-2 w-px"
                                  style={{ background: "rgba(255,255,255,0.06)" }}
                                />
                                <div className="space-y-3">
                                  {[...order.statusHistory]
                                    .sort((a, b) => b.changedAt - a.changedAt)
                                    .map((entry, i) => {
                                      const c = statusColor(entry.status as DeliveryStatus);
                                      const d = new Date(entry.changedAt);
                                      const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                                      const timeStr = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                                      return (
                                        <div key={i} className="flex gap-3 items-start">
                                          {/* Dot */}
                                          <div
                                            className="w-[23px] h-[23px] rounded-full flex-shrink-0 flex items-center justify-center border"
                                            style={{ background: `${c}12`, borderColor: `${c}35` }}
                                          >
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                                          </div>
                                          {/* Content */}
                                          <div className="flex-1 min-w-0 pb-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span
                                                className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                                                style={{ background: `${c}15`, color: c }}
                                              >
                                                {entry.status}
                                              </span>
                                              <span className="text-gray-700 text-[10px]">
                                                {dateStr} · {timeStr}
                                              </span>
                                            </div>
                                            {entry.note && (
                                              <p className="text-gray-500 text-xs mt-1 leading-relaxed pl-0.5">
                                                {entry.note}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Delivery controls */}
                          {order.status === "paid" && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {/* Forward actions */}
                              {ds === "pending" && (
                                <button
                                  onClick={() => handleDelivery(order.id!, "dispatched")}
                                  disabled={updating.has(order.id!)}
                                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border transition-all disabled:opacity-60"
                                  style={{ borderColor: "#FFFF00", color: "#FFFF00", background: "rgba(255,255,0,0.06)" }}
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                  {updating.has(order.id!) ? "Updating…" : "Mark Dispatched"}
                                </button>
                              )}
                              {(ds === "pending" || ds === "dispatched") && (
                                <button
                                  onClick={() => handleDelivery(order.id!, "delivered")}
                                  disabled={updating.has(order.id!)}
                                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border transition-all disabled:opacity-60"
                                  style={{ borderColor: "#00FF41", color: "#00FF41", background: "rgba(0,255,65,0.06)" }}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  {updating.has(order.id!) ? "Updating…" : "Mark Delivered"}
                                </button>
                              )}

                              {/* Mark Returned (from dispatched or delivered) */}
                              {(ds === "dispatched" || ds === "delivered") && (
                                <button
                                  onClick={() => openNoteModal(order.id!, "returned", "Mark as Returned")}
                                  disabled={updating.has(order.id!)}
                                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border transition-all disabled:opacity-60"
                                  style={{ borderColor: "#FF8C00", color: "#FF8C00", background: "rgba(255,140,0,0.06)" }}
                                >
                                  <PackageX className="w-3.5 h-3.5" />
                                  Mark Returned
                                </button>
                              )}

                              {/* Undo to Pending (from dispatched, delivered, or returned) */}
                              {(ds === "dispatched" || ds === "delivered" || ds === "returned") && (
                                <button
                                  onClick={() => openNoteModal(order.id!, "pending", "Undo to Pending")}
                                  disabled={updating.has(order.id!)}
                                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border transition-all disabled:opacity-60"
                                  style={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.04)" }}
                                >
                                  <Undo2 className="w-3.5 h-3.5" />
                                  Undo to Pending
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Note modal — shown when reversing a delivery status */}
      <AnimatePresence>
        {noteModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setNoteModal(null)}
            />
            <motion.div
              className="relative w-full max-w-sm rounded-2xl border p-6 space-y-4"
              style={{ background: "#0d0d0d", borderColor: "rgba(255,140,0,0.3)" }}
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 16 }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "#FF8C00" }}>
                  {noteModal.label}
                </h2>
                <button onClick={() => setNoteModal(null)}>
                  <X className="w-4 h-4 text-gray-600 hover:text-white transition-colors" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-gray-600">
                  Reason / Note (optional)
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="e.g. Package rejected by customer, wrong address…"
                  rows={3}
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white border outline-none placeholder-gray-700 resize-none"
                  style={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,0.1)" }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setNoteModal(null)}
                  className="flex-1 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border"
                  style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmNote}
                  disabled={updating.has(noteModal.id)}
                  className="flex-1 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                  style={{ background: "#FF8C00", color: "#000" }}
                >
                  {updating.has(noteModal.id) ? "Updating…" : "Confirm"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setDeleteConfirm(null)}
            />
            <motion.div
              className="relative w-full max-w-sm rounded-2xl border p-6 space-y-5"
              style={{ background: "#0d0d0d", borderColor: "rgba(255,51,51,0.35)" }}
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 16 }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-red-500">
                  Delete Order
                </h2>
                <button onClick={() => setDeleteConfirm(null)}>
                  <X className="w-4 h-4 text-gray-600 hover:text-white transition-colors" />
                </button>
              </div>

              <p className="text-gray-400 text-sm leading-relaxed">
                This will permanently delete the order. This action{" "}
                <span className="text-red-400 font-bold">cannot be undone.</span>
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border"
                  style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={deleting === deleteConfirm}
                  className="flex-1 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest disabled:opacity-50 transition-colors"
                  style={{ background: "#FF3333", color: "#fff" }}
                >
                  {deleting === deleteConfirm ? "Deleting…" : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
