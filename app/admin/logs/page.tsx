"use client";

import { useEffect, useState } from "react";
import {
  subscribeAdminLogs,
  deleteOldAdminLogs,
  type DanAdminLog,
} from "@/lib/firestore";
import { ADMIN_NAME_MAP } from "@/lib/adminLog";
import { Timestamp } from "firebase/firestore";
import { Search } from "lucide-react";

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

/* ── Page ─────────────────────────────────────────────────────── */
export default function AdminLogsPage() {
  const [logs, setLogs] = useState<DanAdminLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAdmin, setFilterAdmin] = useState("all");
  const [filterAction, setFilterAction] = useState("all");

  useEffect(() => {
    deleteOldAdminLogs().catch(() => {});
    const u1 = subscribeAdminLogs((items) => { setLogs(items); setLogsLoading(false); });
    return () => { u1(); };
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-widest" style={{ color: "#FFFF00", textShadow: "0 0 20px rgba(255,255,0,0.4)" }}>
          Activity Log
        </h1>
        <p className="text-gray-600 text-xs mt-0.5">Admin activity history · auto-clears after 48 hours</p>
      </div>

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
                          className="border-b transition-colors hover:bg-white/2"
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
    </div>
  );
}
