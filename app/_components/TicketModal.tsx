"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Minus, Plus, X } from "lucide-react";
import { useScrollLock } from "@/lib/useScrollLock";
import { type DanEvent } from "@/lib/firestore";
import { track } from "@vercel/analytics";
import { ageConfirmText, ageLimitLabel, allowedAgeRanges, hasAgeLimit } from "@/lib/ageLimits";
import { MAX_TICKET_QUANTITY, PRIVACY_NOTICE_URL, TICKET_TERMS_URL } from "@/lib/constants";

const inputCls =
  "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all placeholder:text-gray-700";

export default function TicketModal({
  initialEvent,
  events,
  onClose,
}: {
  initialEvent: DanEvent;
  events: DanEvent[];
  onClose: () => void;
}) {
  useScrollLock(true);
  const [selectedId, setSelectedId] = useState(initialEvent.id ?? "");
  const event = events.find((e) => e.id === selectedId) ?? initialEvent;
  const soldCount = event.soldTickets ?? 0;
  const remaining = event.totalTickets - soldCount;
  const pct = event.totalTickets > 0 ? Math.round((soldCount / event.totalTickets) * 100) : 0;
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
    ageRange: "",
    quantity: 1,
  });
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  // "Send tickets to different emails": one guest per ticket after the buyer's own
  const [splitTickets, setSplitTickets] = useState(false);
  const [guests, setGuests] = useState<{ name: string; email: string }[]>([]);
  const updateGuest = (i: number, field: "name" | "email", value: string) =>
    setGuests((prev) => {
      const next = [...prev];
      next[i] = { ...(next[i] ?? { name: "", email: "" }), [field]: value };
      return next;
    });

  // The event's age limit (if any) narrows the age ranges and must be confirmed
  const limited = hasAgeLimit(event);
  const ageRanges = allowedAgeRanges(event);
  const ageRange = ageRanges.includes(form.ageRange as (typeof ageRanges)[number]) ? form.ageRange : "";
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
    if (form.quantity < 1) {
      setError("Enter how many tickets you want.");
      return;
    }
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
          ageRange,
          ageConfirmed: limited ? ageConfirmed : undefined,
          termsAccepted,
          marketingConsent,
          ...(splitTickets && form.quantity > 1
            ? {
                splitTickets: true,
                guests: Array.from({ length: form.quantity - 1 }, (_, i) => guests[i] ?? { name: "", email: "" }),
              }
            : {}),
          ticketPrice: activePrice,
          ticketType: hasTiers ? (selectedTier?.name ?? "") : undefined,
        }),
      });
      const data = await res.json();
      if (data.authorization_url) {
        track("ticket_purchase", {
          eventTitle: event.title,
          ticketType: hasTiers ? (selectedTier?.name ?? "general") : "general",
          quantity: form.quantity,
          totalNaira: total,
        });
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

  // Typed quantity: whole numbers from 0 (box cleared while typing) up to the per-order max or what's left
  const maxQty = Math.max(1, Math.min(MAX_TICKET_QUANTITY, tierRemaining));
  const setQuantity = (n: number) =>
    setForm((p) => ({ ...p, quantity: Math.max(0, Math.min(maxQty, Math.floor(n) || 0)) }));

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
                {pct >= 95 && (
                  <p className="text-[#FF3333] text-xs mt-0.5 font-semibold">
                    {hasTiers
                      ? `${Math.round((tierRemaining / event.totalTickets) * 100)}% ${selectedTier?.name ?? ""} tickets remaining`
                      : `${Math.round((remaining / event.totalTickets) * 100)}% tickets remaining`}
                  </p>
                )}
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
                      setAgeConfirmed(false); // each event's limit is confirmed separately
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
                        </button>
                      );
                    })}
                  </div>
                  {selectedTier?.description && (
                    <ul className="mt-3 rounded-lg border border-[#FFFF00]/15 bg-[#FFFF00]/[0.03] px-4 py-3 space-y-1.5">
                      <li className="text-[10px] font-bold uppercase tracking-widest text-[#FFFF00] list-none">
                        {selectedTier.name} includes
                      </li>
                      {selectedTier.description
                        .split("\n")
                        .map((line) => line.replace(/^[-•*]\s*/, "").trim())
                        .filter(Boolean)
                        .map((line, i) => (
                          <li key={i} className="flex gap-2 text-xs text-gray-300 leading-relaxed">
                            <span className="text-[#FFFF00]">•</span>
                            {line}
                          </li>
                        ))}
                    </ul>
                  )}
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
                  WhatsApp Number <span className="normal-case text-gray-700">(optional)</span>
                </label>
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+234 800 000 0000"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                  Age Range *
                </label>
                <select
                  name="ageRange"
                  value={ageRange}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all cursor-pointer invalid:text-gray-600"
                >
                  <option value="" disabled className="bg-[#0a0a0a]">
                    Select your age range
                  </option>
                  {ageRanges.map((range) => (
                    <option key={range} value={range} className="bg-[#0a0a0a] text-white">
                      {range}
                    </option>
                  ))}
                </select>
              </div>
              {limited && (
                <div className="rounded-lg border border-[#FFFF00]/25 bg-[#FFFF00]/[0.04] p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#FFFF00]">
                    Age limit: {ageLimitLabel(event)}
                  </p>
                  <label className="flex items-start gap-3 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ageConfirmed}
                      onChange={(e) => setAgeConfirmed(e.target.checked)}
                      required
                      className="mt-0.5 w-4 h-4 accent-[#FFFF00] cursor-pointer flex-shrink-0"
                    />
                    <span>{ageConfirmText(event)}. ID may be checked at the entrance.</span>
                  </label>
                </div>
              )}
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                  Quantity
                </label>
                <div className="flex items-stretch gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(form.quantity - 1)}
                    disabled={form.quantity <= 1}
                    aria-label="One fewer ticket"
                    className="w-12 flex items-center justify-center rounded-lg border border-white/10 text-white hover:border-[#FFFF00] transition-all disabled:opacity-30"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    name="quantity"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={maxQty}
                    // Empty while the buyer clears the box to type a new number
                    value={form.quantity || ""}
                    onChange={(e) => setQuantity(e.target.value === "" ? 0 : Number(e.target.value))}
                    onBlur={() => form.quantity < 1 && setQuantity(1)}
                    required
                    aria-label="Number of tickets"
                    className="flex-1 min-w-0 px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-center text-base font-bold focus:outline-none focus:border-[#FFFF00] transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(form.quantity + 1)}
                    disabled={form.quantity >= maxQty}
                    aria-label="One more ticket"
                    className="w-12 flex items-center justify-center rounded-lg border border-white/10 text-white hover:border-[#FFFF00] transition-all disabled:opacity-30"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-gray-600 text-[11px] mt-1.5">Up to {maxQty} per order</p>
              </div>
              {form.quantity > 1 && (
                <div className="rounded-lg border border-white/10 p-4 space-y-3">
                  <label className="flex items-start gap-3 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={splitTickets}
                      onChange={(e) => setSplitTickets(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#FFFF00] cursor-pointer flex-shrink-0"
                    />
                    <span>
                      Send tickets to different emails
                      <span className="block text-gray-600 text-xs mt-0.5">
                        Each guest gets their own ticket and QR code by email.
                      </span>
                    </span>
                  </label>
                  {splitTickets && (
                    <div className="space-y-3 pt-1">
                      <p className="text-[11px] text-gray-500">
                        Ticket 1 is yours{form.name.trim() ? ` (${form.name.trim()})` : ""}.
                      </p>
                      {Array.from({ length: form.quantity - 1 }, (_, i) => (
                        <div key={i} className="space-y-2">
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Ticket {i + 2}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              value={guests[i]?.name ?? ""}
                              onChange={(e) => updateGuest(i, "name", e.target.value)}
                              required
                              placeholder="Guest's full name"
                              aria-label={`Ticket ${i + 2} name`}
                              className={inputCls}
                            />
                            <input
                              type="email"
                              value={guests[i]?.email ?? ""}
                              onChange={(e) => updateGuest(i, "email", e.target.value)}
                              required
                              placeholder="guest@example.com"
                              aria-label={`Ticket ${i + 2} email`}
                              className={inputCls}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
              {/* Before you check out — T&Cs required, sponsor sharing optional */}
              <div className="rounded-lg border border-white/10 p-4 space-y-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Before you check out</p>
                <label className="flex items-start gap-3 text-xs text-gray-300 leading-relaxed cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    required
                    className="mt-0.5 w-4 h-4 accent-[#FFFF00] cursor-pointer flex-shrink-0"
                  />
                  <span>
                    I have read and agree to the{" "}
                    <LegalLink href={TICKET_TERMS_URL}>Dine At Night Ticketing Terms &amp; Conditions</LegalLink>{" "}
                    and acknowledge the <LegalLink href={PRIVACY_NOTICE_URL}>Privacy Notice</LegalLink>. *
                  </span>
                </label>
                <div className="border-t border-white/5" />
                <label className="flex items-start gap-3 text-xs text-gray-300 leading-relaxed cursor-pointer">
                  <input
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#FFFF00] cursor-pointer flex-shrink-0"
                  />
                  <span>
                    I consent to Dine At Night sharing my email address and phone number with selected sponsors and
                    partners for marketing and promotional communications.
                  </span>
                </label>
                <p className="text-gray-600 text-[11px]">Marketing consent is optional and can be withdrawn at any time.</p>
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

/** Opens the document in a new tab; plain text until a URL is set in lib/constants.ts. */
function LegalLink({ href, children }: { href: string; children: React.ReactNode }) {
  if (!href) return <span className="text-white">{children}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#FFFF00] underline underline-offset-2">
      {children}
    </a>
  );
}
