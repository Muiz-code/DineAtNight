"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, Search, Camera } from "lucide-react";
import dynamicImport from "next/dynamic";
import LordIcon from "@/app/_components/LordIcon";
import type { GateTicket, ScanResult } from "@/lib/scanners";

const CameraScanner = dynamicImport(() => import("@/app/_components/CameraScanner"), { ssr: false });

type ScanState = "idle" | "loading" | "success" | "already" | "error";

function TicketResult({
  ticket,
  state,
  note,
}: {
  ticket: GateTicket | null;
  state: ScanState;
  note?: string;
}) {
  if (!ticket) return null;

  const colors: Record<ScanState, string> = {
    idle: "#888", loading: "#888", success: "#00FF41", already: "#FFFF00", error: "#FF3333",
  };
  const labels: Record<ScanState, string> = {
    idle: "", loading: "", success: "Admitted!", already: "⚠️ Already Scanned", error: "❌ Not Valid",
  };
  const color = colors[state];

  return (
    <motion.div
      className="rounded-xl border p-6 space-y-3"
      style={{ borderColor: `${color}30`, background: "#0a0a0a", boxShadow: `0 0 25px ${color}15` }}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {state === "success" && (
        <div className="flex justify-center">
          <LordIcon size={80} colors="primary:#00FF41,secondary:#00FF41" trigger="in" />
        </div>
      )}
      <div className="flex items-center justify-between">
        <p
          className="text-sm font-bold uppercase tracking-widest"
          style={{ color, textShadow: `0 0 12px ${color}70` }}
        >
          {labels[state]}
        </p>
        <span
          className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full"
          style={{ background: `${color}15`, color }}
        >
          {ticket.status}
        </span>
      </div>
      {note && <p className="text-xs" style={{ color }}>{note}</p>}

      <div className="border-t border-white/5 pt-4 space-y-2">
        {[
          { label: "Name", value: ticket.name },
          { label: "Admits", value: `${ticket.quantity} ${ticket.quantity === 1 ? "person" : "people"}` },
          ...(ticket.ticketType ? [{ label: "Type", value: ticket.ticketType }] : []),
          { label: "Event", value: ticket.eventTitle },
          { label: "Reference", value: ticket.reference },
        ].map((row) => (
          <div key={row.label} className="flex justify-between text-sm">
            <span className="text-gray-600 text-xs uppercase tracking-widest">{row.label}</span>
            <span className="text-gray-200 text-xs text-right ml-4 truncate max-w-[60%]">{row.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

const timeOf = (ms: number | null) =>
  ms
    ? new Date(ms).toLocaleString("en-NG", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" })
    : "";

/**
 * Scan (camera / USB scanner) or type a ticket reference to admit the attendee.
 * Confirms through POST /api/scan/confirm, which credits the scan to whoever
 * is signed in. Used by /admin/confirm and /scan.
 */
export default function TicketScanner({
  prefillRef = "",
  onAdmitted,
  onSessionEnded,
}: {
  prefillRef?: string;
  onAdmitted?: (ticket: GateTicket) => void;
  onSessionEnded?: () => void;
}) {
  const [reference, setReference] = useState(prefillRef);
  const [state, setState] = useState<ScanState>(prefillRef ? "loading" : "idle");
  const [ticket, setTicket] = useState<GateTicket | null>(null);
  const [note, setNote] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const ranPrefill = useRef(false);

  const handleConfirm = async (ref?: string) => {
    const r = (ref ?? reference).trim();
    if (!r) return;
    setState("loading");
    setTicket(null);
    setNote("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/scan/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: r }),
      });
      if (res.status === 401) {
        setState("error");
        setErrorMsg("Your session has ended. Log in again.");
        onSessionEnded?.();
        return;
      }
      const data = (await res.json()) as ScanResult & { error?: string };
      if (!res.ok || data.error) {
        setState("error");
        setErrorMsg(data.error ?? "Could not check the ticket.");
        return;
      }
      if (data.result === "not_found") {
        setState("error");
        setErrorMsg("Ticket not found. Check the reference and try again.");
        return;
      }
      setTicket(data.ticket);
      if (data.result === "confirmed") {
        setState("success");
        onAdmitted?.(data.ticket);
      } else if (data.result === "already") {
        setState("already");
        setNote(
          `Already scanned${data.confirmedBy ? ` by ${data.confirmedBy}` : ""}${data.confirmedAt ? ` at ${timeOf(data.confirmedAt)}` : ""}. Do not admit again.`,
        );
      } else {
        setState("error");
        setNote("Payment not verified. This ticket has not been paid for.");
      }
    } catch {
      setState("error");
      setErrorMsg("Network error. Check your connection and try again.");
    }
  };

  const handleCameraScan = (scannedRef: string) => {
    setShowCamera(false);
    setReference(scannedRef);
    handleConfirm(scannedRef);
  };

  // Auto-check if the page was opened from a ticket's QR link (?ref=…)
  useEffect(() => {
    if (prefillRef && !ranPrefill.current) {
      ranPrefill.current = true;
      handleConfirm(prefillRef);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillRef]);

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: "rgba(255,255,0,0.15)", background: "#0a0a0a" }}>
        <div className="flex items-center gap-3 text-[#FFFF00] mb-2">
          <QrCode className="w-5 h-5" />
          <span className="text-sm font-bold uppercase tracking-widest">Scan or Enter Reference</span>
        </div>

        <p className="text-gray-600 text-xs leading-relaxed">
          Use your camera, a USB QR scanner, or type the reference manually to verify and admit the attendee.
        </p>

        <motion.button
          onClick={() => setShowCamera(true)}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-xl border-2 border-dashed font-bold text-sm uppercase tracking-widest transition-all"
          style={{ borderColor: "rgba(255,255,0,0.3)", color: "#FFFF00" }}
          whileHover={{ borderColor: "rgba(255,255,0,0.7)", backgroundColor: "rgba(255,255,0,0.05)" }}
          whileTap={{ scale: 0.98 }}
        >
          <Camera className="w-5 h-5" />
          Scan with Camera
        </motion.button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-gray-700 text-xs uppercase tracking-widest">or enter manually</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        <div className="flex gap-2">
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); }}
            placeholder="e.g. paystack_ref_abc123"
            className="flex-1 min-w-0 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all placeholder:text-gray-700 font-mono"
            autoFocus
          />
          <motion.button
            onClick={() => handleConfirm()}
            disabled={state === "loading" || !reference.trim()}
            className="px-5 py-3 rounded-lg font-bold text-sm text-black flex items-center gap-2"
            style={{
              background: state === "loading" || !reference.trim() ? "rgba(255,255,0,0.3)" : "#FFFF00",
              boxShadow: state === "loading" || !reference.trim() ? "none" : "0 0 20px rgba(255,255,0,0.4)",
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            aria-label="Check ticket"
          >
            {state === "loading" ? (
              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Result */}
      <AnimatePresence mode="wait">
        {state !== "idle" && state !== "loading" && (
          <TicketResult key="ticket-result" ticket={ticket} state={state} note={note} />
        )}
        {state === "error" && errorMsg && (
          <motion.p key="error-msg" className="text-center text-[#FF3333] text-xs" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {errorMsg}
          </motion.p>
        )}
        {state !== "idle" && state !== "loading" && (
          <motion.div key="scan-another" className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <button
              onClick={() => { setState("idle"); setTicket(null); setReference(""); setErrorMsg(""); setNote(""); }}
              className="text-gray-600 hover:text-gray-400 text-xs uppercase tracking-widest transition-colors"
            >
              Scan Another Ticket →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {showCamera && (
        <CameraScanner onScan={handleCameraScan} onClose={() => setShowCamera(false)} />
      )}
    </div>
  );
}
