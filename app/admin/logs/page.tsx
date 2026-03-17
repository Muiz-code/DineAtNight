"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  subscribeAdminLogs,
  subscribeDeletedEvents,
  subscribeDeletedProducts,
  permanentlyDeleteArchivedEvent,
  permanentlyDeleteArchivedProduct,
  type DanAdminLog,
  type DanDeletedEvent,
  type DanDeletedProduct,
} from "@/lib/firestore";
import { ADMIN_NAME_MAP } from "@/lib/adminLog";
import { Timestamp } from "firebase/firestore";
import { Search, Trash2, AlertTriangle, X } from "lucide-react";

/* ── Helpers ─────────────────────────────────────────────────── */

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  LOGIN:               { label: "Login",              color: "#00FF41" },
  LOGOUT:              { label: "Logout",             color: "#888888" },
  CREATE_EVENT:        { label: "Create Event",       color: "#FFFF00" },
  UPDATE_EVENT:        { label: "Update Event",       color: "#FFB800" },
  DELETE_EVENT:        { label: "Archive Event",      color: "#FF3333" },
  APPROVE_VENDOR:      { label: "Approve Vendor",     color: "#00FF41" },
  DECLINE_VENDOR:      { label: "Decline Vendor",     color: "#FF3333" },
  REVOKE_VENDOR:       { label: "Revoke Vendor",      color: "#FF3333" },
  CREATE_VENDOR:       { label: "Add Vendor",         color: "#FFFF00" },
  DELETE_VENDOR:       { label: "Delete Vendor",      color: "#FF3333" },
  CREATE_PRODUCT:      { label: "Add Product",        color: "#FFFF00" },
  UPDATE_PRODUCT:      { label: "Update Product",     color: "#FFB800" },
  DELETE_PRODUCT:      { label: "Archive Product",    color: "#FF3333" },
  UPLOAD_GALLERY:      { label: "Upload Gallery",     color: "#FFFF00" },
  DELETE_GALLERY:      { label: "Delete Gallery",     color: "#FF3333" },
  CREATE_TESTIMONIAL:  { label: "Add Testimonial",    color: "#FFFF00" },
  UPDATE_TESTIMONIAL:  { label: "Edit Testimonial",   color: "#FFB800" },
  DELETE_TESTIMONIAL:  { label: "Delete Testimonial", color: "#FF3333" },
  APPROVE_TESTIMONIAL: { label: "Approve Review",     color: "#00FF41" },
  UPDATE_ORDER:        { label: "Update Order",       color: "#FFB800" },
  CONFIRM_TICKET:      { label: "Confirm Ticket",     color: "#00FF41" },
};

const ADMINS = Object.entries(ADMIN_NAME_MAP).map(([email, name]) => ({ email, name }));

function formatTs(ts: Timestamp | undefined | null): string {
  if (!ts) return "—";
  try {
    const d = ts.toDate();
    return d.toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch { return "—"; }
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ["#FFFF00", "#00FF41", "#FF3333", "#FFB800", "#00CFFF", "#FF00FF"];
function avatarColor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

function fmt(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

type Tab = "activity" | "events" | "products";

/* ── Confirm Delete Modal ────────────────────────────────────── */
function ConfirmDelete({ name, onConfirm, onCancel, deleting }: {
  name: string; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        className="relative w-full max-w-sm rounded-2xl border p-6 space-y-4"
        style={{ background: "#0d0d0d", borderColor: "rgba(255,51,51,0.3)" }}
        initial={{ scale: 0.93 }} animate={{ scale: 1 }} exit={{ scale: 0.93 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FF3333]/15 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-[#FF3333]" />
          </div>
          <div>
            <p className="text-white text-sm font-bold">Permanent Delete</p>
            <p className="text-gray-600 text-xs">This cannot be undone</p>
          </div>
        </div>
        <p className="text-gray-400 text-sm">
          Permanently delete <span className="text-white font-medium">"{name}"</span>? All associated archive data will be lost forever.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border text-gray-400 text-sm hover:text-white transition-colors"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
            style={{ background: deleting ? "rgba(255,51,51,0.2)" : "#FF3333", color: "#fff" }}
          >
            {deleting ? "Deleting…" : "Delete Forever"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */
export default function AdminLogsPage() {
  const [tab, setTab] = useState<Tab>("activity");

  // Activity logs
  const [logs, setLogs] = useState<DanAdminLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAdmin, setFilterAdmin] = useState("all");
  const [filterAction, setFilterAction] = useState("all");

  // Deleted events
  const [deletedEvents, setDeletedEvents] = useState<DanDeletedEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [deleteEventTarget, setDeleteEventTarget] = useState<DanDeletedEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState(false);

  // Deleted products
  const [deletedProducts, setDeletedProducts] = useState<DanDeletedProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [deleteProductTarget, setDeleteProductTarget] = useState<DanDeletedProduct | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);

  useEffect(() => {
    const u1 = subscribeAdminLogs((items) => { setLogs(items); setLogsLoading(false); });
    const u2 = subscribeDeletedEvents((items) => { setDeletedEvents(items); setEventsLoading(false); });
    const u3 = subscribeDeletedProducts((items) => { setDeletedProducts(items); setProductsLoading(false); });
    return () => { u1(); u2(); u3(); };
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filterAdmin !== "all" && log.adminEmail !== filterAdmin) return false;
    if (filterAction !== "all" && log.action !== filterAction) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !log.details.toLowerCase().includes(q) &&
        !log.adminName.toLowerCase().includes(q) &&
        !log.adminEmail.toLowerCase().includes(q) &&
        !(log.entityName ?? "").toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const actionKeys = Array.from(new Set(logs.map((l) => l.action))).sort();

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "activity", label: "Activity Log",      count: logs.length },
    { key: "events",   label: "Deleted Events",    count: deletedEvents.length },
    { key: "products", label: "Deleted Products",  count: deletedProducts.length },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-widest" style={{ color: "#FFFF00", textShadow: "0 0 20px rgba(255,255,0,0.4)" }}>
          Logs & Archive
        </h1>
        <p className="text-gray-600 text-xs mt-0.5">Activity history and deleted record archive</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl border border-white/8 bg-white/[0.02] w-fit">
        {TABS.map(({ key, label, count }) => {
          const active = tab === key;
          const color = key === "activity" ? "#FFFF00" : "#FF3333";
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
              style={{
                color: active ? color : "rgba(255,255,255,0.3)",
                background: active ? `${color}12` : "transparent",
              }}
            >
              {label}
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                style={{
                  background: active ? `${color}25` : "rgba(255,255,255,0.06)",
                  color: active ? color : "rgba(255,255,255,0.3)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Activity Log tab ── */}
      {tab === "activity" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search logs…"
                className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-400/50 placeholder:text-gray-700 transition-all"
              />
            </div>
            <select
              value={filterAdmin}
              onChange={(e) => setFilterAdmin(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none"
            >
              <option value="all">All admins</option>
              {ADMINS.map((a) => <option key={a.email} value={a.email}>{a.name}</option>)}
            </select>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none"
            >
              <option value="all">All actions</option>
              {actionKeys.map((a) => <option key={a} value={a}>{ACTION_LABELS[a]?.label ?? a}</option>)}
            </select>
          </div>

          {logsLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <p className="text-gray-700 text-sm">
                {logs.length === 0 ? "No activity logged yet." : "No entries match your filters."}
              </p>
              {logs.length === 0 && (
                <p className="text-gray-800 text-xs max-w-sm mx-auto">
                  Make sure your Firestore rules allow authenticated reads/writes to the <code className="text-gray-600">admin_logs</code> collection.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,0,0.03)" }}>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">Admin</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">Action</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">Details</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600 whitespace-nowrap">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, i) => {
                      const ac = ACTION_LABELS[log.action];
                      const color = avatarColor(log.adminEmail);
                      return (
                        <tr
                          key={log.id ?? i}
                          className="border-b transition-colors hover:bg-white/[0.02]"
                          style={{ borderColor: "rgba(255,255,255,0.04)" }}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                                style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}
                              >
                                {getInitials(log.adminName)}
                              </div>
                              <div>
                                <div className="text-white text-xs font-medium">{log.adminName}</div>
                                <div className="text-gray-600 text-[10px]">{log.adminEmail}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest"
                              style={{ color: ac?.color ?? "#888", background: `${ac?.color ?? "#888"}18`, border: `1px solid ${ac?.color ?? "#888"}30` }}
                            >
                              {ac?.label ?? log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs max-w-xs">
                            <span className="line-clamp-2">{log.details}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-[11px] whitespace-nowrap font-mono">
                            {formatTs(log.timestamp)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Deleted Events tab ── */}
      {tab === "events" && (
        <div className="space-y-4">
          <p className="text-gray-600 text-xs">
            Events archived when deleted. Tickets & revenue data is preserved. Permanently delete only when you no longer need the record.
          </p>
          {eventsLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#FF3333] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : deletedEvents.length === 0 ? (
            <div className="text-center py-20 text-gray-700 text-sm">No deleted events.</div>
          ) : (
            <div className="space-y-3">
              {deletedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                  style={{ borderColor: "rgba(255,51,51,0.2)", background: "rgba(255,51,51,0.03)" }}
                >
                  {ev.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ev.imageUrl} alt={ev.title} className="w-16 h-16 rounded-lg object-cover shrink-0 border border-white/10" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-bold text-sm">{ev.title}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase" style={{ background: "rgba(255,51,51,0.15)", color: "#FF3333" }}>
                        Deleted
                      </span>
                    </div>
                    <p className="text-gray-600 text-xs mt-0.5">{ev.venue} — {ev.date?.toDate?.()?.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) ?? "—"}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs">
                      <span className="text-gray-500">🎟 <span className="text-white">{ev.snapshotTicketsSold}</span> tickets sold</span>
                      <span className="text-gray-500">💰 <span className="text-[#00FF41]">{fmt(ev.snapshotRevenue)}</span> revenue</span>
                      <span className="text-gray-500">🗑 Deleted by <span className="text-gray-300">{ev.deletedByName}</span> · {formatTs(ev.deletedAt)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteEventTarget(ev)}
                    className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-widest transition-all hover:bg-[#FF3333]/20"
                    style={{ borderColor: "rgba(255,51,51,0.3)", color: "#FF3333" }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Forever
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Deleted Products tab ── */}
      {tab === "products" && (
        <div className="space-y-4">
          <p className="text-gray-600 text-xs">
            Products archived when deleted. Permanently delete only when the record is no longer needed.
          </p>
          {productsLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#FF3333] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : deletedProducts.length === 0 ? (
            <div className="text-center py-20 text-gray-700 text-sm">No deleted products.</div>
          ) : (
            <div className="space-y-3">
              {deletedProducts.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                  style={{ borderColor: "rgba(255,51,51,0.2)", background: "rgba(255,51,51,0.03)" }}
                >
                  {p.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.name} className="w-16 h-16 rounded-lg object-cover shrink-0 border border-white/10" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-bold text-sm">{p.name}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase capitalize" style={{ background: "rgba(255,184,0,0.15)", color: "#FFB800" }}>
                        {p.category}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">{fmt(p.price)} · {p.soldCount ?? 0} sold</p>
                    <p className="text-gray-600 text-[11px] mt-1">🗑 Deleted by <span className="text-gray-300">{p.deletedByName}</span> · {formatTs(p.deletedAt)}</p>
                  </div>
                  <button
                    onClick={() => setDeleteProductTarget(p)}
                    className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-widest transition-all hover:bg-[#FF3333]/20"
                    style={{ borderColor: "rgba(255,51,51,0.3)", color: "#FF3333" }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Forever
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Confirm modals ── */}
      <AnimatePresence>
        {deleteEventTarget && (
          <ConfirmDelete
            name={deleteEventTarget.title}
            deleting={deletingEvent}
            onCancel={() => setDeleteEventTarget(null)}
            onConfirm={async () => {
              setDeletingEvent(true);
              await permanentlyDeleteArchivedEvent(deleteEventTarget.id!);
              setDeleteEventTarget(null);
              setDeletingEvent(false);
            }}
          />
        )}
        {deleteProductTarget && (
          <ConfirmDelete
            name={deleteProductTarget.name}
            deleting={deletingProduct}
            onCancel={() => setDeleteProductTarget(null)}
            onConfirm={async () => {
              setDeletingProduct(true);
              await permanentlyDeleteArchivedProduct(deleteProductTarget.id!);
              setDeleteProductTarget(null);
              setDeletingProduct(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
