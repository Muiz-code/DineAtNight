"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { confirmTicket, type DanTicket } from "@/lib/firestore";
import { QrCode, Search, Camera } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import dynamicImport from "next/dynamic";

const CameraScanner = dynamicImport(() => import("@/app/_components/CameraScanner"), { ssr: false });

type ConfirmState = "idle" | "loading" | "success" | "already" | "error";

function TicketResult({ ticket, state }: { ticket: DanTicket | null; state: ConfirmState }) {
  if (!ticket) return null;

  const colors: Record<ConfirmState, string> = {
    idle: "#888", loading: "#888", success: "#00FF41", already: "#FFFF00", error: "#FF3333",
  };
  const labels: Record<ConfirmState, string> = {
    idle: "", loading: "", success: "✅ Confirmed!", already: "⚠️ Already Confirmed", error: "❌ Error",
  };

  const color = colors[state];

  return (
    <motion.div
      className="rounded-xl border p-6 space-y-3"
      style={{ borderColor: `${color}30`, background: "#0a0a0a", boxShadow: `0 0 25px ${color}15` }}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
    >
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

      <div className="border-t border-white/5 pt-4 space-y-2">
        {[
          { label: "Name", value: ticket.name },
          { label: "Event", value: ticket.eventTitle },
          { label: "Tickets", value: `${ticket.quantity}x` },
          { label: "Email", value: ticket.email },
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

function ConfirmContent() {
  const searchParams = useSearchParams();
  const prefill = searchParams.get("ref") ?? "";

  const [reference, setReference] = useState(prefill);
  const [state, setState] = useState<ConfirmState>(prefill ? "loading" : "idle");
  const [ticket, setTicket] = useState<DanTicket | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const ranPrefill = useRef(false);

  const handleCameraScan = (scannedRef: string) => {
    setShowCamera(false);
    setReference(scannedRef);
    handleConfirm(scannedRef);
  };

  const handleConfirm = async (ref?: string) => {
    const r = (ref ?? reference).trim();
    if (!r) return;
    setState("loading");
    setTicket(null);
    setErrorMsg("");

    try {
      const { ok, already, ticket: t } = await confirmTicket(r);
      setTicket(t);
      if (!t) { setState("error"); setErrorMsg("Ticket not found."); return; }
      if (ok) { setState("success"); return; }
      if (already) { setState("already"); return; }
      if (t.status === "pending") {
        setState("error");
        setErrorMsg("Payment not verified. This ticket has not been paid for.");
        return;
      }
      setState("error");
      setErrorMsg("Could not confirm ticket.");
    } catch {
      setState("error");
      setErrorMsg("Network error.");
    }
  };

  // Auto-confirm if ref is in URL
  useEffect(() => {
    if (prefill && !ranPrefill.current) {
      ranPrefill.current = true;
      handleConfirm(prefill);
    }
  }, [prefill]);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white uppercase tracking-widest">Confirm Tickets</h1>
        <p className="text-gray-600 text-sm mt-0.5">
          Scan or enter a ticket reference to verify and admit the attendee.
        </p>
      </div>

      {/* Input */}
      <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: "rgba(255,255,0,0.15)", background: "#0a0a0a" }}>
        <div className="flex items-center gap-3 text-[#FFFF00] mb-2">
          <QrCode className="w-5 h-5" />
          <span className="text-sm font-bold uppercase tracking-widest">Scan or Enter Reference</span>
        </div>

        <p className="text-gray-600 text-xs leading-relaxed">
          Use your camera, a USB QR scanner, or type the reference manually to verify and admit the attendee.
        </p>

        {/* Camera scan button */}
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
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all placeholder:text-gray-700 font-mono"
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
          <TicketResult key="ticket-result" ticket={ticket} state={state} />
        )}
        {state !== "idle" && state !== "loading" && (
          <motion.div key="confirm-another" className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <button
              onClick={() => { setState("idle"); setTicket(null); setReference(""); setErrorMsg(""); }}
              className="text-gray-600 hover:text-gray-400 text-xs uppercase tracking-widest transition-colors"
            >
              Confirm Another Ticket →
            </button>
          </motion.div>
        )}
        {state === "error" && (
          <motion.p key="error-msg" className="text-center text-[#FF3333] text-xs" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {errorMsg}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Pro tip */}
      <div className="rounded-lg border p-4 bg-[#0a0a0a]" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <p className="text-gray-600 text-xs uppercase tracking-widest mb-1">💡 Pro tip</p>
        <p className="text-gray-600 text-xs leading-relaxed">
          Tap <strong className="text-gray-400">Scan with Camera</strong> to use your phone or laptop camera. For gate speed, a USB or Bluetooth QR scanner auto-fills and submits instantly.
        </p>
      </div>

      {/* Camera scanner modal */}
      {showCamera && (
        <CameraScanner
          onScan={handleCameraScan}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}

export default function AdminConfirmPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}
