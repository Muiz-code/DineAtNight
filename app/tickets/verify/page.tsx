"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";

interface TicketData {
  id?: string;
  eventTitle: string;
  name: string;
  email: string;
  phone: string;
  quantity: number;
  amount: number;
  reference: string;
  status: string;
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");

  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!reference) {
      setError("No payment reference found.");
      setState("error");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/paystack/verify?reference=${reference}`);
        const data = await res.json();
        if (data.ok && data.ticket) {
          setTicket(data.ticket);
          setState("success");
          // Send ticket confirmation email via EmailJS (client-side)
          // Await so the HTTP request completes before navigation
          try {
            const { sendTicketConfirmationEmail } = await import("@/lib/emailjs");
            await sendTicketConfirmationEmail({
              name:       data.ticket.name,
              email:      data.ticket.email,
              eventTitle: data.ticket.eventTitle,
              quantity:   data.ticket.quantity,
              amount:     data.ticket.amount,
              reference:  data.ticket.reference,
            });
          } catch {
            // email failure is non-critical — still redirect
          }
          // Redirect to the ticket view page
          router.replace(`/tickets/${reference}`);
        } else {
          setError(data.error || "Payment verification failed.");
          setState("error");
        }
      } catch {
        setError("Network error. Please contact support.");
        setState("error");
      }
    })();
  }, [reference, router]);

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-6">
        <motion.div
          className="w-16 h-16 border-4 border-[#00FF41] border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p className="text-gray-400 text-sm tracking-widest uppercase">Verifying payment…</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-4 px-6 text-center">
        <div className="text-5xl">❌</div>
        <h2 className="text-2xl font-bold uppercase tracking-wide text-white">Verification Failed</h2>
        <p className="text-gray-400 text-sm max-w-sm leading-relaxed">{error}</p>
        <div
          className="rounded-lg border border-white/10 bg-white/5 px-5 py-3 max-w-sm w-full text-left space-y-1"
        >
          <p className="text-gray-600 text-[10px] uppercase tracking-widest">Debug info</p>
          <p className="text-gray-400 text-xs font-mono break-all">Reference: {reference}</p>
          <p className="text-gray-500 text-xs font-mono break-all">Error: {error}</p>
        </div>
        <p className="text-gray-600 text-xs max-w-sm">
          Screenshot this page and contact support if your payment was deducted.
        </p>
        <Link href="/event" className="mt-2 px-8 py-3 rounded-full border-2 border-[#FF3333] text-[#FF3333] text-sm font-bold uppercase tracking-widest hover:bg-[#FF3333] hover:text-black transition-all">
          Back to Events
        </Link>
      </div>
    );
  }

  // Success — redirect happens automatically, show brief success screen
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-6">
      <div className="text-6xl">✅</div>
      <p className="text-[#00FF41] text-sm tracking-widest uppercase" style={{ textShadow: "0 0 15px rgba(0,255,65,0.6)" }}>
        Payment confirmed! Loading your ticket…
      </p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-12 h-12 border-4 border-[#00FF41] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
