"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, KeyRound, Plus, RefreshCw, ShieldOff, Users, X } from "lucide-react";
import TicketScanner from "@/app/_components/TicketScanner";
import { logAdminAction } from "@/lib/adminLog";
import type { ScannerSummary } from "@/lib/scanners";

const inputCls =
  "w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all placeholder:text-gray-700";

const STATUS: Record<ScannerSummary["status"], { label: string; color: string }> = {
  code_issued: { label: "Code not used yet", color: "#FFFF00" },
  logged_in: { label: "Logged in", color: "#00FF41" },
  logged_out: { label: "Logged out", color: "rgba(255,255,255,0.4)" },
  revoked: { label: "Revoked", color: "#FF3333" },
};

const timeOf = (ms: number | null) =>
  ms
    ? new Date(ms).toLocaleString("en-NG", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" })
    : "—";

/* ── Scanner accounts: add people, issue one-time codes, see counts ── */
function ScannerAccounts() {
  const [list, setList] = useState<ScannerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null); // "create" or a scanner id
  const [actionError, setActionError] = useState("");
  const [issued, setIssued] = useState<{ name: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/scanners");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setList(data.scanners);
      setLoadError("");
    } catch {
      setLoadError("Could not load scanner accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh every 30s so counts and code requests stay current during the event
  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (
    body: Record<string, string>,
    key: string,
    logAs: { action: string; details: string; name: string },
  ) => {
    setBusy(key);
    setActionError("");
    try {
      const res = await fetch("/api/admin/scanners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "Something went wrong.");
        return;
      }
      if (data.code) {
        setIssued({ name: logAs.name, code: data.code });
        setCopied(false);
      }
      await logAdminAction(logAs.action, logAs.details, { type: "scanner", id: data.id ?? body.id, name: logAs.name });
      await load();
      if (body.action === "create") setName("");
    } finally {
      setBusy(null);
    }
  };

  const scanUrl = `${(process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dineatnight.com").replace(/\/$/, "")}/scan`;
  const totals = list.reduce(
    (t, s) => ({ scans: t.scans + s.scanCount, admitted: t.admitted + s.admittedCount }),
    { scans: 0, admitted: 0 },
  );
  const requests = list.filter((s) => s.newCodeRequestedAt && s.status !== "revoked");

  return (
    <div className="rounded-xl border p-6 space-y-5" style={{ borderColor: "rgba(255,255,255,0.08)", background: "#0a0a0a" }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[#FFFF00]">
            <Users className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-widest">Ticket Scanners</span>
          </div>
          <p className="text-gray-600 text-xs mt-1 leading-relaxed">
            Add someone by name to get a one-time code. They open{" "}
            <span className="text-gray-400 font-mono">{scanUrl}</span> on their phone and enter it. The code works
            once — if they log out, give them a new one.
          </p>
        </div>
        <div className="text-right">
          <p className="text-white font-bold text-lg leading-none">{totals.admitted}</p>
          <p className="text-gray-600 text-[10px] uppercase tracking-widest mt-1">
            admitted · {totals.scans} tickets
          </p>
        </div>
      </div>

      {/* Add a scanner */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          act({ action: "create", name }, "create", {
            action: "CREATE_SCANNER",
            details: `Added ticket scanner "${name.trim()}"`,
            name: name.trim(),
          });
        }}
        className="flex gap-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Person's name, e.g. Tunde (Gate A)"
          maxLength={60}
          className={inputCls}
        />
        <button
          type="submit"
          disabled={busy === "create" || name.trim().length < 2}
          className="flex items-center gap-1.5 px-4 rounded-lg font-bold text-xs uppercase tracking-widest text-black flex-shrink-0 disabled:opacity-40"
          style={{ background: "#FFFF00" }}
        >
          <Plus className="w-4 h-4" /> Get code
        </button>
      </form>
      {actionError && <p className="text-[#FF3333] text-xs">{actionError}</p>}

      {requests.length > 0 && (
        <div className="rounded-lg border border-[#FFFF00]/30 bg-[#FFFF00]/5 px-4 py-3 text-xs text-[#FFFF00]">
          New code requested by: {requests.map((s) => s.name).join(", ")}
        </div>
      )}

      {/* Accounts */}
      {loading ? (
        <p className="text-gray-700 text-xs">Loading…</p>
      ) : loadError ? (
        <p className="text-[#FF3333] text-xs">{loadError}</p>
      ) : list.length === 0 ? (
        <p className="text-gray-700 text-xs">No scanners yet. Scans you make here are counted under your name.</p>
      ) : (
        <div className="space-y-2">
          {list.map((s) => {
            const st = STATUS[s.status];
            return (
              <div
                key={s.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-lg border border-white/8 bg-white/[0.02]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-bold">{s.name}</span>
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border"
                      style={{ color: st.color, borderColor: `${st.color}55` }}
                    >
                      {s.kind === "admin" ? "Admin" : st.label}
                    </span>
                    {s.newCodeRequestedAt && s.status !== "revoked" && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#FFFF00]">
                        • wants a new code
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">
                    <span className="text-gray-300 font-bold">{s.scanCount}</span> tickets ·{" "}
                    <span className="text-gray-300 font-bold">{s.admittedCount}</span> people admitted · last scan{" "}
                    {timeOf(s.lastScanAt)}
                  </p>
                </div>
                {s.kind === "staff" && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() =>
                        act({ action: "new-code", id: s.id }, s.id, {
                          action: "SCANNER_NEW_CODE",
                          details: `Issued a new scanner code for "${s.name}"`,
                          name: s.name,
                        })
                      }
                      disabled={busy === s.id}
                      title="Issue a new one-time code (signs out their current session)"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-white/10 text-gray-300 hover:text-[#FFFF00] hover:border-yellow-400/30 transition-all disabled:opacity-40"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> New code
                    </button>
                    {s.status !== "revoked" && (
                      <button
                        onClick={() => {
                          if (!window.confirm(`Revoke ${s.name}? They'll be signed out and their code will stop working.`)) return;
                          act({ action: "revoke", id: s.id }, s.id, {
                            action: "REVOKE_SCANNER",
                            details: `Revoked ticket scanner "${s.name}"`,
                            name: s.name,
                          });
                        }}
                        disabled={busy === s.id}
                        title="Sign out and block this scanner"
                        className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-gray-500 hover:text-[#FF3333] hover:border-red-400/25 transition-all disabled:opacity-40"
                      >
                        <ShieldOff className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* One-time code — shown once */}
      <AnimatePresence>
        {issued && (
          <motion.div
            className="fixed inset-0 z-[400] flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/80" onClick={() => setIssued(null)} />
            <motion.div
              className="relative w-full max-w-sm rounded-2xl border border-[#FFFF00]/30 bg-[#0a0a0a] p-6 space-y-4 text-center"
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
            >
              <button onClick={() => setIssued(null)} className="absolute top-4 right-4 text-gray-600 hover:text-white">
                <X className="w-4 h-4" />
              </button>
              <KeyRound className="w-6 h-6 text-[#FFFF00] mx-auto" />
              <p className="text-gray-400 text-sm">One-time code for <span className="text-white font-bold">{issued.name}</span></p>
              <p className="font-mono text-3xl font-bold tracking-[0.2em] text-[#FFFF00]">{issued.code}</p>
              <button
                onClick={() => {
                  navigator.clipboard
                    ?.writeText(`Your Dine At Night ticket scanner code: ${issued.code}\nOpen ${scanUrl} and enter it. It works once — don't log out until your shift ends.`)
                    .then(() => setCopied(true))
                    .catch(() => {});
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-white/15 text-gray-300 hover:text-white"
              >
                <Copy className="w-3.5 h-3.5" /> {copied ? "Copied" : "Copy message"}
              </button>
              <p className="text-gray-600 text-xs leading-relaxed">
                Share it with them now — it won&apos;t be shown again. It works once, on one phone, at{" "}
                <span className="font-mono text-gray-400">{scanUrl}</span>.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ScanContent() {
  const prefill = useSearchParams().get("ref") ?? "";

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white uppercase tracking-widest">Scan Tickets</h1>
        <p className="text-gray-600 text-sm mt-0.5">
          Scan or enter a ticket reference to verify and admit the attendee. Your scans are counted under your name.
        </p>
      </div>

      <TicketScanner
        prefillRef={prefill}
        onAdmitted={(t) =>
          logAdminAction("CONFIRM_TICKET", `Confirmed ticket ${t.reference} for "${t.name}" — ${t.eventTitle}`, {
            type: "ticket",
            id: t.reference,
            name: t.name,
          })
        }
      />

      <ScannerAccounts />
    </div>
  );
}

export default function AdminScanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
