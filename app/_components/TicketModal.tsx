"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useScrollLock } from "@/lib/useScrollLock";
import { type DanEvent } from "@/lib/firestore";

const inputCls =
  "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all placeholder:text-gray-700";

export default function TicketModal({
  initialEvent,
  events,
  soldCounts,
  onClose,
}: {
  initialEvent: DanEvent;
  events: DanEvent[];
  soldCounts: Record<string, number>;
  onClose: () => void;
}) {
  useScrollLock(true);
  const [selectedId, setSelectedId] = useState(initialEvent.id ?? "");
  const event = events.find((e) => e.id === selectedId) ?? initialEvent;
  const soldCount = soldCounts[event.id ?? ""] ?? event.soldTickets ?? 0;
  const remaining = event.totalTickets - soldCount;
  const router = useRouter();

  const hasTiers = (event.ticketTypes?.length ?? 0) > 0;
  const defaultTier = hasTiers ? event.ticketTypes![0].name : "";
  const [ticketType, setTicketType] = useState(defaultTier);

  const selectedTier = hasTiers
    ? (event.ticketTypes!.find((t) => t.name === ticketType) ??
      event.ticketTypes![0])
    : null;
  const activePrice = selectedTier ? selectedTier.price : event.ticketPrice;

  const tierRemaining =
    selectedTier?.limit != null
      ? Math.min(remaining, selectedTier.limit)
      : remaining;

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    quantity: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) =>
    setForm((p) => ({
      ...p,
      [e.target.name]:
        e.target.name === "quantity" ? Number(e.target.value) : e.target.value,
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tierRemaining < form.quantity) {
      setError("Not enough tickets remaining for this tier.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          eventTitle: event.title,
          ...form,
          ticketPrice: activePrice,
          ticketType: hasTiers ? (selectedTier?.name ?? "") : undefined,
        }),
      });
      const data = await res.json();
      if (data.authorization_url) {
        router.push(data.authorization_url);
      } else {
        setError(data.error ?? "Failed to initialize payment.");
        setLoading(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const total = activePrice * form.quantity;

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
      <motion.div
        className="relative w-full sm:max-w-md bg-[#050505] border border-[#FFFF00]/25 sm:rounded-2xl rounded-t-3xl"
        style={{ boxShadow: "0 0 60px rgba(255,255,0,0.1)" }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className="absolute top-0 left-0 w-8 h-8 hidden sm:block pointer-events-none z-10"
          style={{
            borderTop: "2px solid #FFFF00",
            borderLeft: "2px solid #FFFF00",
          }}
        />
        <span
          className="absolute bottom-0 right-0 w-8 h-8 hidden sm:block pointer-events-none z-10"
          style={{
            borderBottom: "2px solid #FFFF00",
            borderRight: "2px solid #FFFF00",
          }}
        />
        <div className="overflow-y-auto scrollbar-hide max-h-[93svh]">
          <div className="sm:hidden flex justify-center pt-4 pb-1">
            <div className="w-10 h-1 bg-white/20 rounded-full" />
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2
                  className="text-2xl font-bold uppercase tracking-wide"
                  style={{
                    color: "#FFFF00",
                    textShadow: "0 0 20px rgba(255,255,0,0.6)",
                  }}
                >
                  Buy Tickets
                </h2>
                <p className="text-gray-500 text-xs mt-1">
                  {event.date?.toDate?.()?.toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  · {event.venue}
                </p>
                <p className="text-gray-600 text-xs mt-0.5">
                  {hasTiers
                    ? `${tierRemaining} ${selectedTier?.name ?? ""} tickets remaining`
                    : `${remaining} tickets remaining`}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all flex-shrink-0 ml-4"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {events.length > 1 && (
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                    Select Event
                  </label>
                  <select
                    value={selectedId}
                    onChange={(e) => {
                      setSelectedId(e.target.value);
                      setForm((p) => ({ ...p, quantity: 1 }));
                      setError("");
                    }}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all cursor-pointer"
                  >
                    {events.map((ev) => (
                      <option
                        key={ev.id}
                        value={ev.id}
                        className="bg-[#0a0a0a]"
                      >
                        {ev.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {hasTiers && (
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                    Ticket Type
                  </label>
                  <div
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns: `repeat(${Math.min(event.ticketTypes!.length, 3)}, 1fr)`,
                    }}
                  >
                    {event.ticketTypes!.map((tier, tierIdx) => {
                      const active = ticketType === tier.name;
                      return (
                        <button
                          key={`${tier.name}-${tierIdx}`}
                          type="button"
                          onClick={() => setTicketType(tier.name)}
                          className="flex flex-col items-center gap-0.5 py-3 px-2 rounded-xl border text-center transition-all duration-200"
                          style={{
                            borderColor: active
                              ? "#FFFF00"
                              : "rgba(255,255,255,0.1)",
                            background: active
                              ? "rgba(255,255,0,0.07)"
                              : "rgba(255,255,255,0.02)",
                            boxShadow: active
                              ? "0 0 12px rgba(255,255,0,0.15)"
                              : "none",
                          }}
                        >
                          <span
                            className="text-xs font-bold uppercase tracking-widest"
                            style={{
                              color: active
                                ? "#FFFF00"
                                : "rgba(255,255,255,0.55)",
                            }}
                          >
                            {tier.name}
                          </span>
                          <span
                            className="text-[11px] font-medium"
                            style={{
                              color: active
                                ? "#FFFF00"
                                : "rgba(255,255,255,0.35)",
                            }}
                          >
                            ₦{tier.price.toLocaleString()}
                          </span>
                          {tier.limit != null && (
                            <span
                              className="text-[9px] uppercase tracking-widest"
                              style={{
                                color: active
                                  ? "rgba(255,255,0,0.6)"
                                  : "rgba(255,255,255,0.2)",
                              }}
                            >
                              {tier.limit} slots
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                  Full Name *
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Your full name"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                  Email Address *
                </label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="you@example.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                  WhatsApp Number *
                </label>
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  placeholder="+234 800 000 0000"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                  Quantity
                </label>
                <select
                  name="quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all cursor-pointer"
                >
                  {Array.from(
                    { length: Math.min(10, tierRemaining) },
                    (_, i) => i + 1,
                  ).map((n) => (
                    <option key={n} value={n} className="bg-[#0a0a0a]">
                      {n} ticket{n > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-lg border border-[#FFFF00]/15 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    {form.quantity}x {hasTiers ? selectedTier?.name : "ticket"}{" "}
                    @ ₦{activePrice.toLocaleString()}
                  </span>
                  <span className="text-gray-300">
                    ₦{(activePrice * form.quantity).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between font-bold border-t border-white/8 pt-2">
                  <span className="text-gray-300">Total</span>
                  <span
                    style={{
                      color: "#FFFF00",
                      textShadow: "0 0 10px rgba(255,255,0,0.5)",
                    }}
                  >
                    ₦{total.toLocaleString()}
                  </span>
                </div>
              </div>
              {error && (
                <p className="text-[#FF3333] text-xs text-center">{error}</p>
              )}
              <motion.button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-full font-bold uppercase tracking-widest text-sm mt-2"
                style={{
                  background: loading ? "transparent" : "#FFFF00",
                  color: loading ? "#FFFF00" : "#000",
                  border: "2px solid #FFFF00",
                  boxShadow: loading
                    ? "0 0 15px rgba(255,255,0,0.2)"
                    : "0 0 30px rgba(255,255,0,0.5)",
                }}
                whileHover={!loading ? { scale: 1.02 } : {}}
                whileTap={!loading ? { scale: 0.97 } : {}}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="w-4 h-4 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
                    Redirecting to Paystack…
                  </span>
                ) : (
                  `Pay ₦${total.toLocaleString()} via Paystack →`
                )}
              </motion.button>
              <p className="text-gray-700 text-xs text-center">
                Secured by Paystack. Your ticket is emailed after payment.
              </p>
            </form>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
