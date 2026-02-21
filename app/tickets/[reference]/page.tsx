"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { getTicketByReference, getEventById, type DanTicket, type DanSponsor } from "@/lib/firestore";
import { CheckCircle2 } from "lucide-react";

const fmt = (kobo: number) => "₦" + (kobo / 100).toLocaleString("en-NG");

function QRCode({ value, size = 200 }: { value: string; size?: number }) {
  // Black on white — the only colour scheme all phone QR scanners read reliably.
  // Coloured / inverted QR codes (e.g. green on black) fail on iOS Camera and many Android scanners.
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=ffffff&color=000000&qzone=2`;
  return (
    // White padding border so the QR quiet-zone is clearly visible on the dark ticket card
    <div className="rounded-xl p-3 bg-white" style={{ display: "inline-block" }}>
      <Image
        src={url}
        alt="Ticket QR Code"
        width={size}
        height={size}
        className="rounded-md block"
        unoptimized
      />
    </div>
  );
}

export default function TicketPage() {
  const { reference } = useParams<{ reference: string }>();
  const [ticket, setTicket] = useState<DanTicket | null>(null);
  const [sponsors, setSponsors] = useState<DanSponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!reference) return;
    getTicketByReference(reference)
      .then((t) => {
        if (!t) { setError("Ticket not found."); return; }
        if (t.status === "pending") { setError("Payment not yet confirmed."); return; }
        setTicket(t);
        // Load event sponsors in background — doesn't block ticket display
        getEventById(t.eventId).then((ev) => {
          if (ev?.sponsors?.length) setSponsors(ev.sponsors);
        }).catch(() => {});
      })
      .catch(() => setError("Failed to load ticket."))
      .finally(() => setLoading(false));
  }, [reference]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <motion.div
          className="w-12 h-12 border-4 border-[#00FF41] border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-6 px-6 text-center">
        <div className="text-5xl">🎟️</div>
        <h2 className="text-2xl font-bold uppercase text-white">{error || "Ticket Not Found"}</h2>
        <Link href="/event" className="px-8 py-3 rounded-full border-2 border-[#FFFF00] text-[#FFFF00] text-sm font-bold uppercase tracking-widest">
          Back to Events
        </Link>
      </div>
    );
  }

  const statusColor = ticket.status === "confirmed" ? "#00FF41" : "#FFFF00";
  const statusGlow = ticket.status === "confirmed" ? "rgba(0,255,65,0.6)" : "rgba(255,255,0,0.6)";

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-16">
      {/* Glow background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(0,255,65,0.04) 0%, transparent 70%)" }}
      />

      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Ticket card */}
        <div
          className="relative rounded-2xl border overflow-hidden"
          style={{
            borderColor: `${statusColor}40`,
            boxShadow: `0 0 60px ${statusGlow}20`,
            background: "linear-gradient(135deg, #080808, #030303)",
          }}
        >
          {/* Corner accents */}
          <span className="absolute top-0 left-0 w-8 h-8" style={{ borderTop: `2px solid ${statusColor}`, borderLeft: `2px solid ${statusColor}` }} />
          <span className="absolute bottom-0 right-0 w-8 h-8" style={{ borderBottom: `2px solid ${statusColor}`, borderRight: `2px solid ${statusColor}` }} />

          {/* Header */}
          <div className="px-7 pt-8 pb-4 text-center">
            {ticket.status === "confirmed" && (
              <motion.div
                className="flex justify-center mb-2"
                animate={{ scale: [0.9, 1.1, 1] }}
                transition={{ duration: 0.5 }}
              >
                <CheckCircle2 className="w-10 h-10" style={{ color: "#00FF41", filter: "drop-shadow(0 0 10px rgba(0,255,65,0.7))" }} />
              </motion.div>
            )}
            <p
              className="text-xs tracking-[0.4em] uppercase mb-1"
              style={{ color: statusColor, textShadow: `0 0 10px ${statusGlow}` }}
            >
              {ticket.status === "confirmed" ? "Ticket Confirmed" : "Valid Ticket"}
            </p>
            <h1
              className="text-3xl font-bold uppercase tracking-wide"
              style={{ color: statusColor, textShadow: `0 0 20px ${statusGlow}` }}
            >
              {ticket.eventTitle}
            </h1>
          </div>

          {/* Divider */}
          <div className="relative mx-7 border-t border-dashed" style={{ borderColor: `${statusColor}25` }}>
            <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black border" style={{ borderColor: `${statusColor}30` }} />
            <div className="absolute -right-10 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black border" style={{ borderColor: `${statusColor}30` }} />
          </div>

          {/* Details */}
          <div className="px-7 pt-5 pb-4 space-y-3">
            {[
              { label: "Name", value: ticket.name },
              { label: "Email", value: ticket.email },
              { label: "Phone", value: ticket.phone },
              { label: "Tickets", value: `${ticket.quantity}x` },
              { label: "Amount Paid", value: fmt(ticket.amount) },
              { label: "Reference", value: ticket.reference },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-gray-600 text-xs uppercase tracking-widest">{row.label}</span>
                <span className="text-gray-200 text-sm font-medium truncate ml-4 max-w-[55%] text-right">{row.value}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="mx-7 border-t border-dashed" style={{ borderColor: `${statusColor}25` }} />

          {/* QR Code */}
          <div className="flex flex-col items-center py-7 gap-3">
            <QRCode value={`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/admin/confirm?ref=${ticket.reference}`} size={180} />
            <p className="text-gray-700 text-[10px] tracking-widest uppercase">Scan to verify at the gate</p>
          </div>

          {/* Sponsors */}
          {sponsors.length > 0 && (
            <div className="px-7 pb-5 border-t border-dashed" style={{ borderColor: `${statusColor}15` }}>
              <p className="text-gray-700 text-[9px] uppercase tracking-widest text-center mt-4 mb-3">Sponsored By</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {sponsors.map((sp, i) => {
                  const spColors = ["#FFFF00", "#00FF41", "#FF3333"];
                  const c = spColors[i % spColors.length];
                  return (
                    <div
                      key={sp.name}
                      className="w-16 h-10 flex items-center justify-center rounded overflow-hidden p-1"
                      style={{ border: `1px solid ${c}60`, boxShadow: `0 0 8px ${c}30` }}
                    >
                      {sp.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={sp.logoUrl} alt={sp.name} className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-center" style={{ color: c }}>
                          {sp.name}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div
            className="px-7 py-4 text-center"
            style={{ background: `${statusColor}08`, borderTop: `1px solid ${statusColor}15` }}
          >
            <p className="text-gray-600 text-xs">
              Keep this ticket safe. Present the QR code at the entrance.
            </p>
          </div>
        </div>

        {/* Print hint */}
        <p className="text-center text-gray-700 text-xs mt-6 tracking-wide">
          Screenshot or print this ticket for the event.
        </p>

        <div className="flex justify-center mt-4">
          <Link
            href="/event"
            className="text-gray-600 hover:text-gray-400 text-xs uppercase tracking-widest transition-colors"
          >
            ← Back to Events
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
