"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, KeyRound, Plus, RefreshCw, ShieldOff, Ticket, UserCheck, Users, X, Activity } from "lucide-react";
import TicketScanner from "@/app/_components/TicketScanner";
import { useConfirm } from "@/app/_components/ConfirmDialog";
import { logAdminAction } from "@/lib/adminLog";
import type { CheckinProgress, ScannerSummary } from "@/lib/scanners";

const STATUS: Record<ScannerSummary["status"], { label: string; color: string }> = {
  code_issued: { label: "Code not used", color: "#FFFF00" },
  logged_in: { label: "Logged in", color: "#00FF41" },
  logged_out: { label: "Logged out", color: "rgba(255,255,255,0.45)" },
  revoked: { label: "Revoked", color: "#FF3333" },
};

const SCAN_URL = `${(process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dineatnight.com").replace(/\/$/, "")}/scan`;

const timeOf = (ms: number | null) =>
  ms
    ? new Date(ms).toLocaleString("en-NG", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" })
    : "—";

const card = "rounded-xl border border-white/8 bg-[#0a0a0a]";

/* ── Data: scanner accounts + check-in progress, refreshed every 30s ── */
function useScannerData() {
  const [scanners, setScanners] = useState<ScannerSummary[]>([]);
  const [progress, setProgress] = useState<CheckinProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/scanners", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setScanners(data.scanners);
      setProgress(data.progress);
      setError("");
    } catch {
      setError("Could not load scanner accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  return { scanners, progress, loading, error, reload: load };
}

/* ── Stat cards ── */
function Stat({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string | number; sub?: string }) {
  return (
    <div className={`${card} px-4 py-4`}>
      <div className="flex items-center gap-2 text-gray-500">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white mt-2 leading-none">{value}</p>
      {sub && <p className="text-gray-600 text-[11px] mt-1.5 truncate">{sub}</p>}
    </div>
  );
}

function StatCards({ scanners, progress }: { scanners: ScannerSummary[]; progress: CheckinProgress | null }) {
  const scans = scanners.reduce((n, s) => n + s.scanCount, 0);
  const admitted = scanners.reduce((n, s) => n + s.admittedCount, 0);
  const active = scanners.filter((s) => s.kind === "staff" && s.status === "logged_in").length;
  const pct = progress && progress.peopleSold ? Math.round((progress.peopleCheckedIn / progress.peopleSold) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat icon={UserCheck} label="People admitted" value={admitted} sub="All scanners" />
        <Stat icon={Ticket} label="Tickets scanned" value={scans} sub="One ticket can admit several" />
        <Stat icon={Users} label="Scanners on duty" value={active} sub={`${scanners.filter((s) => s.kind === "staff").length} staff accounts`} />
        <Stat
          icon={Activity}
          label="Checked in"
          value={progress ? `${pct}%` : "—"}
          sub={progress ? `${progress.peopleCheckedIn} of ${progress.peopleSold} people` : "No upcoming event"}
        />
      </div>
      {progress && (
        <div className={`${card} px-4 py-3`}>
          <div className="flex items-center justify-between text-xs mb-2 gap-3">
            <span className="text-gray-400 truncate">{progress.eventTitle}</span>
            <span className="text-gray-500 flex-shrink-0">
              {progress.ticketsCheckedIn} / {progress.ticketsSold} tickets
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "#00FF41" }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Scanner accounts table ── */
function ScannersPanel({
  scanners,
  loading,
  error,
  reload,
}: {
  scanners: ScannerSummary[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null); // "create" or a scanner id
  const [actionError, setActionError] = useState("");
  const [issued, setIssued] = useState<{ name: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const { confirm, dialog } = useConfirm();

  const act = async (body: Record<string, string>, key: string, log: { action: string; details: string; name: string }) => {
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
        setIssued({ name: log.name, code: data.code });
        setCopied(false);
      }
      if (body.action === "create") setName("");
      await logAdminAction(log.action, log.details, { type: "scanner", id: data.id ?? body.id, name: log.name });
      await reload();
    } finally {
      setBusy(null);
    }
  };

  const newCode = (s: ScannerSummary) =>
    act({ action: "new-code", id: s.id }, s.id, {
      action: "SCANNER_NEW_CODE",
      details: `Issued a new scanner code for "${s.name}"`,
      name: s.name,
    });
  const revoke = async (s: ScannerSummary) => {
    const ok = await confirm({
      title: `Revoke ${s.name}?`,
      message: "They'll be signed out straight away and their code will stop working. Their scan history is kept.",
      confirmLabel: "Revoke",
      danger: true,
    });
    if (!ok) return;
    act({ action: "revoke", id: s.id }, s.id, {
      action: "REVOKE_SCANNER",
      details: `Revoked ticket scanner "${s.name}"`,
      name: s.name,
    });
  };

  const totals = scanners.reduce(
    (t, s) => ({ scans: t.scans + s.scanCount, admitted: t.admitted + s.admittedCount }),
    { scans: 0, admitted: 0 },
  );
  const requests = scanners.filter((s) => s.newCodeRequestedAt && s.status !== "revoked");

  const StatusBadge = ({ s }: { s: ScannerSummary }) => {
    const st = s.kind === "admin" ? { label: "Admin", color: "#00BFFF" } : STATUS[s.status];
    return (
      <span
        className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border whitespace-nowrap"
        style={{ color: st.color, borderColor: `${st.color}55` }}
      >
        {st.label}
      </span>
    );
  };

  const Actions = ({ s }: { s: ScannerSummary }) =>
    s.kind === "staff" ? (
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => newCode(s)}
          disabled={busy === s.id}
          title="Issue a new one-time code (signs out their current session)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-white/10 text-gray-300 hover:text-[#FFFF00] hover:border-yellow-400/30 transition-all disabled:opacity-40 whitespace-nowrap"
        >
          <RefreshCw className="w-3 h-3" /> New code
        </button>
        {s.status !== "revoked" && (
          <button
            onClick={() => revoke(s)}
            disabled={busy === s.id}
            title="Sign out and block this scanner"
            aria-label={`Revoke ${s.name}`}
            className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-gray-500 hover:text-[#FF3333] hover:border-red-400/25 transition-all disabled:opacity-40"
          >
            <ShieldOff className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    ) : (
      <span className="text-gray-700 text-xs">—</span>
    );

  return (
    <div className={`${card} overflow-hidden`}>
      {/* Header + add */}
      <div className="px-5 py-4 border-b border-white/8 space-y-3">
        <div>
          <div className="flex items-center gap-2 text-[#FFFF00]">
            <Users className="w-4 h-4" />
            <span className="text-sm font-bold uppercase tracking-widest">Ticket Scanners</span>
          </div>
          <p className="text-gray-600 text-xs mt-1 leading-relaxed">
            Add someone by name to get a one-time code. They open{" "}
            <span className="text-gray-400 font-mono break-all">{SCAN_URL}</span> on their phone and enter it.
          </p>
        </div>
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
            className="flex-1 min-w-0 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all placeholder:text-gray-700"
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
          <p className="rounded-lg border border-[#FFFF00]/30 bg-[#FFFF00]/5 px-3 py-2 text-xs text-[#FFFF00]">
            New code requested by {requests.map((s) => s.name).join(", ")} — tap “New code” on their row.
          </p>
        )}
      </div>

      {loading ? (
        <p className="px-5 py-10 text-center text-gray-700 text-xs">Loading…</p>
      ) : error ? (
        <p className="px-5 py-10 text-center text-[#FF3333] text-xs">{error}</p>
      ) : scanners.length === 0 ? (
        <div className="px-5 py-10 text-center space-y-1">
          <Users className="w-7 h-7 text-gray-800 mx-auto" />
          <p className="text-gray-500 text-sm">No scanners yet</p>
          <p className="text-gray-700 text-xs">Add your gate staff above. Admin scans show here too.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <table className="hidden md:table w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-gray-600 border-b border-white/8">
                <th className="text-left font-medium px-5 py-3">Name</th>
                <th className="text-left font-medium px-3 py-3">Status</th>
                <th className="text-right font-medium px-3 py-3">Tickets</th>
                <th className="text-right font-medium px-3 py-3">People</th>
                <th className="text-left font-medium px-3 py-3">Last scan</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {scanners.map((s) => (
                <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-5 py-3">
                    <p className="text-white font-medium">{s.name}</p>
                    {s.newCodeRequestedAt && s.status !== "revoked" && (
                      <p className="text-[10px] text-[#FFFF00] mt-0.5">Wants a new code</p>
                    )}
                  </td>
                  <td className="px-3 py-3"><StatusBadge s={s} /></td>
                  <td className="px-3 py-3 text-right text-gray-200 font-bold tabular-nums">{s.scanCount}</td>
                  <td className="px-3 py-3 text-right text-gray-200 font-bold tabular-nums">{s.admittedCount}</td>
                  <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{timeOf(s.lastScanAt)}</td>
                  <td className="px-5 py-3"><Actions s={s} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-white/[0.02]">
                <td className="px-5 py-3 text-[10px] uppercase tracking-widest text-gray-500 font-bold" colSpan={2}>
                  Total · {scanners.length} {scanners.length === 1 ? "account" : "accounts"}
                </td>
                <td className="px-3 py-3 text-right text-[#00FF41] font-bold tabular-nums">{totals.scans}</td>
                <td className="px-3 py-3 text-right text-[#00FF41] font-bold tabular-nums">{totals.admitted}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-white/5">
            {scanners.map((s) => (
              <div key={s.id} className="px-5 py-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-white font-medium truncate">{s.name}</p>
                  <StatusBadge s={s} />
                </div>
                {s.newCodeRequestedAt && s.status !== "revoked" && (
                  <p className="text-[10px] text-[#FFFF00]">Wants a new code</p>
                )}
                <div className="flex items-end justify-between gap-3">
                  <p className="text-gray-500 text-xs">
                    <span className="text-gray-200 font-bold">{s.scanCount}</span> tickets ·{" "}
                    <span className="text-gray-200 font-bold">{s.admittedCount}</span> people
                    <br />
                    Last scan {timeOf(s.lastScanAt)}
                  </p>
                  <Actions s={s} />
                </div>
              </div>
            ))}
            <div className="px-5 py-3 flex justify-between text-xs bg-white/[0.02]">
              <span className="uppercase tracking-widest text-gray-500 font-bold text-[10px]">Total</span>
              <span className="text-[#00FF41] font-bold">
                {totals.scans} tickets · {totals.admitted} people
              </span>
            </div>
          </div>
        </>
      )}

      {dialog}

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
              <button onClick={() => setIssued(null)} className="absolute top-4 right-4 text-gray-600 hover:text-white" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
              <KeyRound className="w-6 h-6 text-[#FFFF00] mx-auto" />
              <p className="text-gray-400 text-sm">
                One-time code for <span className="text-white font-bold">{issued.name}</span>
              </p>
              <p className="font-mono text-3xl font-bold tracking-[0.2em] text-[#FFFF00]">{issued.code}</p>
              <button
                onClick={() => {
                  navigator.clipboard
                    ?.writeText(
                      `Your Dine At Night ticket scanner code: ${issued.code}\nOpen ${SCAN_URL} and enter it. It works once — don't log out until your shift ends.`,
                    )
                    .then(() => setCopied(true))
                    .catch(() => {});
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-white/15 text-gray-300 hover:text-white"
              >
                <Copy className="w-3.5 h-3.5" /> {copied ? "Copied" : "Copy message"}
              </button>
              <p className="text-gray-600 text-xs leading-relaxed">
                Share it with them now — it won&apos;t be shown again. It works once, on one phone.
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
  const data = useScannerData();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white uppercase tracking-widest">Scan Tickets</h1>
        <p className="text-gray-600 text-sm mt-0.5">
          Admit attendees and track every scanner. Your own scans are counted under your name.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] gap-6 items-start">
        {/* Scanner */}
        <div className="lg:sticky lg:top-16">
          <TicketScanner
            prefillRef={prefill}
            onAdmitted={(t) => {
              logAdminAction("CONFIRM_TICKET", `Confirmed ticket ${t.reference} for "${t.name}" — ${t.eventTitle}`, {
                type: "ticket",
                id: t.reference,
                name: t.name,
              });
              data.reload();
            }}
          />
        </div>

        {/* Tracking */}
        <div className="space-y-6 min-w-0">
          <StatCards scanners={data.scanners} progress={data.progress} />
          <ScannersPanel scanners={data.scanners} loading={data.loading} error={data.error} reload={data.reload} />
        </div>
      </div>
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
