"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, Minus, Plus, Users, X } from "lucide-react";
import { useScrollLock } from "@/lib/useScrollLock";
import { type DanEvent } from "@/lib/firestore";
import type { TicketAvailability } from "@/lib/ticketInventory";
import { track } from "@vercel/analytics";
import { trackMetaEvent } from "@/lib/metaPixel";
import { ageConfirmText, ageLimitLabel, allowedAgeRanges, hasAgeLimit } from "@/lib/ageLimits";
import { MAX_TICKET_QUANTITY, PRIVACY_NOTICE_URL, TICKET_TERMS_URL } from "@/lib/constants";

const inputCls =
  "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all placeholder:text-gray-700";
const labelCls = "block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5";

/**
 * Checkout in short steps so it never feels like one long form:
 *   Tickets → Your details → Guests (only for 2+ tickets) → Review & pay.
 * Only the current step's fields are rendered, so the browser's own
 * `required` checks validate one step at a time.
 */
type Step = "tickets" | "details" | "guests" | "review";
const STEP_LABELS: Record<Step, string> = {
  tickets: "Tickets",
  details: "Your details",
  guests: "Guests",
  review: "Review & pay",
};

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
  // Meta Pixel: opening the ticket form is the start of checkout
  useEffect(() => {
    trackMetaEvent("InitiateCheckout", { content_name: initialEvent.title, content_type: "product", currency: "NGN" });
  }, [initialEvent.title]);
  const [selectedId, setSelectedId] = useState(initialEvent.id ?? "");
  const event = events.find((e) => e.id === selectedId) ?? initialEvent;
  const [availability, setAvailability] = useState<{ eventId: string; data: TicketAvailability } | null>(null);
  const [availabilityError, setAvailabilityError] = useState("");
  useEffect(() => {
    let active = true;
    const update = async () => {
      try {
        const res = await fetch("/api/tickets/availability?eventId=" + encodeURIComponent(selectedId), { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data: TicketAvailability = await res.json();
        if (active) { setAvailability({ eventId: selectedId, data }); setAvailabilityError(""); }
      } catch { if (active) { setAvailability(null); setAvailabilityError("Could not check ticket availability. Retrying shortly."); } }
    };
    void update(); const timer = setInterval(update, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [selectedId]);
  const inventory = availability?.eventId === selectedId ? availability.data : null;
  const soldCount = inventory?.sold ?? event.soldTickets ?? 0;
  const remaining = inventory ? (inventory.available ?? MAX_TICKET_QUANTITY) : 0;
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

  const tierRemaining = inventory?.tiers.find(t => t.name === selectedTier?.name)?.available ?? remaining;

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

  // ── Steps ──
  const steps: Step[] = ["tickets", "details", ...(form.quantity > 1 ? (["guests"] as Step[]) : []), "review"];
  const [step, setStep] = useState<Step>("tickets");
  const stepIndex = Math.max(0, steps.indexOf(step));
  const isLast = step === "review";
  const scrollRef = useRef<HTMLDivElement>(null);
  const goTo = (next: Step) => {
    setError("");
    setStep(next);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  const total = activePrice * form.quantity;
  const guestList = splitTickets && form.quantity > 1
    ? Array.from({ length: form.quantity - 1 }, (_, i) => guests[i] ?? { name: "", email: "" })
    : [];

  // Typed quantity: whole numbers from 0 (box cleared while typing) up to the per-order max or what's left
  const maxQty = Math.max(0, Math.min(MAX_TICKET_QUANTITY, tierRemaining));
  const soldOut = !!inventory && maxQty === 0;
  const quantityDisabled = !inventory || soldOut;
  const checkoutDisabled = loading || quantityDisabled || form.quantity < 1 || form.quantity > maxQty;
  const setQuantity = (n: number) => {
    if (quantityDisabled) return;
    setForm((p) => ({ ...p, quantity: Math.max(0, Math.min(maxQty, Math.floor(n) || 0)) }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const pay = async () => {
    if (quantityDisabled || form.quantity < 1 || form.quantity > tierRemaining) { setError("Please check ticket availability and quantity."); return; }
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
          ...(guestList.length ? { splitTickets: true, guests: guestList } : {}),
          ticketPrice: activePrice,
          ticketType: hasTiers ? (selectedTier?.name ?? "") : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.authorization_url) {
        track("ticket_purchase", {
          eventTitle: event.title,
          ticketType: hasTiers ? (selectedTier?.name ?? "general") : "general",
          quantity: form.quantity,
          totalNaira: total,
        });
        trackMetaEvent("AddPaymentInfo", {
          content_name: event.title,
          content_type: "product",
          num_items: form.quantity,
          value: total,
          currency: "NGN",
        });
        router.push(data.authorization_url);
      } else {
        setError(data.error ?? "We couldn't start the payment. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  // The form's submit = "Continue" (the browser checks this step's required fields first)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkoutDisabled) return;
    if (step === "tickets") {
      if (!inventory) return setError(availabilityError || "Checking ticket availability. Please wait.");
      if (form.quantity < 1) return setError("Enter how many tickets you want.");
      if (tierRemaining < form.quantity) return setError("Not enough tickets remaining for this ticket type.");
    }
    if (isLast) {
      pay();
      return;
    }
    goTo(steps[stepIndex + 1]);
  };

  const dateLabel = event.date?.toDate?.()?.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

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
        className="relative w-full sm:max-w-md bg-[#050505] border border-[#FFFF00]/25 sm:rounded-2xl rounded-t-3xl flex flex-col max-h-[93svh]"
        style={{ boxShadow: "0 0 60px rgba(255,255,0,0.1)" }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className="absolute top-0 left-0 w-8 h-8 hidden sm:block pointer-events-none z-10"
          style={{ borderTop: "2px solid #FFFF00", borderLeft: "2px solid #FFFF00" }}
        />
        <span
          className="absolute bottom-0 right-0 w-8 h-8 hidden sm:block pointer-events-none z-10"
          style={{ borderBottom: "2px solid #FFFF00", borderRight: "2px solid #FFFF00" }}
        />

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          {/* ── Header + progress ── */}
          <div className="flex-shrink-0 px-6 sm:px-8 pt-4 sm:pt-8 pb-4">
            <div className="sm:hidden flex justify-center pb-3">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <h2
                  className="text-2xl font-bold uppercase tracking-wide"
                  style={{ color: "#FFFF00", textShadow: "0 0 20px rgba(255,255,0,0.6)" }}
                >
                  Buy Tickets
                </h2>
                <p className="text-gray-500 text-xs mt-1 truncate">
                  {dateLabel} · {event.venue}
                </p>
                {pct >= 95 && (
                  <p className="text-[#FF3333] text-xs mt-0.5 font-semibold">Almost sold out</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all flex-shrink-0 ml-4"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5">
              <div className="flex gap-1.5">
                {steps.map((s, i) => (
                  <div
                    key={s}
                    className="h-1 flex-1 rounded-full transition-colors duration-300"
                    style={{ background: i <= stepIndex ? "#FFFF00" : "rgba(255,255,255,0.1)" }}
                  />
                ))}
              </div>
              <p className="mt-2 text-[10px] uppercase tracking-widest text-gray-500">
                Step {stepIndex + 1} of {steps.length} ·{" "}
                <span className="text-[#FFFF00]">{STEP_LABELS[step]}</span>
              </p>
            </div>
          </div>

          {/* ── Current step ── */}
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-6 sm:px-8 pb-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                {step === "tickets" && (
                  <>
                    {events.length > 1 && (
                      <div>
                        <label className={labelCls}>Select Event</label>
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
                            <option key={ev.id} value={ev.id} className="bg-[#0a0a0a]">
                              {ev.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {!inventory && <p role="status" className="text-xs text-gray-400">{availabilityError || "Checking ticket availability..."}</p>}
                    {hasTiers && (
                      <div>
                        <label className={labelCls}>Ticket Type</label>
                        <div
                          className="grid gap-2"
                          style={{ gridTemplateColumns: `repeat(${Math.min(event.ticketTypes!.length, 3)}, 1fr)` }}
                        >
                          {event.ticketTypes!.map((tier, tierIdx) => {
                            const active = ticketType === tier.name;
                            const left = inventory?.tiers.find(t => t.name === tier.name)?.available;
                            return (
                              <button
                                key={`${tier.name}-${tierIdx}`}
                                type="button"
                                disabled={!inventory || left === 0}
                                aria-label={tier.name + (left === 0 ? " - sold out" : "")}
                                onClick={() => { setTicketType(tier.name); setForm(p => ({ ...p, quantity: 1 })); }}
                                className="flex flex-col items-center gap-0.5 py-3 px-2 rounded-xl border text-center transition-all duration-200"
                                style={{
                                  borderColor: active ? "#FFFF00" : "rgba(255,255,255,0.1)",
                                  background: active ? "rgba(255,255,0,0.07)" : "rgba(255,255,255,0.02)",
                                  boxShadow: active ? "0 0 12px rgba(255,255,0,0.15)" : "none",
                                  opacity: left === 0 ? 0.45 : 1,
                                  cursor: left === 0 ? "not-allowed" : "pointer",
                                }}
                              >
                                <span
                                  className="text-xs font-bold uppercase tracking-widest"
                                  style={{ color: active ? "#FFFF00" : "rgba(255,255,255,0.55)" }}
                                >
                                  {tier.name}{left === 0 ? " - Sold out" : ""}
                                </span>
                                <span
                                  className="text-[11px] font-medium"
                                  style={{ color: active ? "#FFFF00" : "rgba(255,255,255,0.35)" }}
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
                      <label className={labelCls}>How many tickets?</label>
                      <fieldset disabled={quantityDisabled} aria-label="Ticket quantity" className="flex min-w-0 items-stretch gap-2">
                        <button
                          type="button"
                          onClick={() => setQuantity(form.quantity - 1)}
                          disabled={quantityDisabled || form.quantity <= 1}
                          aria-label="One fewer ticket"
                          className="w-12 flex items-center justify-center rounded-lg border border-white/10 text-white hover:border-[#FFFF00] transition-all disabled:opacity-30"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          name="quantity"
                          type="number"
                          inputMode="numeric"
                          disabled={quantityDisabled}
                          min={quantityDisabled ? 0 : 1}
                          max={maxQty}
                          // Empty while the buyer clears the box to type a new number
                          value={quantityDisabled ? 0 : form.quantity || ""}
                          onChange={(e) => setQuantity(e.target.value === "" ? 0 : Number(e.target.value))}
                          onBlur={() => form.quantity < 1 && setQuantity(1)}
                          required
                          aria-label="Number of tickets"
                          className="flex-1 min-w-0 px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-center text-base font-bold disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:border-[#FFFF00] transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => setQuantity(form.quantity + 1)}
                          disabled={quantityDisabled || form.quantity >= maxQty}
                          aria-label="One more ticket"
                          className="w-12 flex items-center justify-center rounded-lg border border-white/10 text-white hover:border-[#FFFF00] transition-all disabled:opacity-30"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </fieldset>
                      <p role="status" className="text-gray-500 text-[11px] mt-1.5">{soldOut ? "This ticket type is sold out. Please choose another available ticket type." : !inventory ? "Checking availability..." : `Up to ${maxQty} per order`}</p>
                    </div>

                    {limited && (
                      <p className="text-xs text-[#FFFF00]/80">
                        This event has an age limit: {ageLimitLabel(event)}.
                      </p>
                    )}
                  </>
                )}

                {step === "details" && (
                  <>
                    <div>
                      <label className={labelCls}>Full Name *</label>
                      <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        autoComplete="name"
                        placeholder="Your full name"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Email Address *</label>
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        autoComplete="email"
                        placeholder="you@example.com"
                        className={inputCls}
                      />
                      <p className="text-gray-600 text-[11px] mt-1.5">Your ticket is sent here.</p>
                    </div>
                    <div>
                      <label className={labelCls}>
                        WhatsApp Number <span className="normal-case text-gray-700">(optional)</span>
                      </label>
                      <input
                        name="phone"
                        type="tel"
                        value={form.phone}
                        onChange={handleChange}
                        autoComplete="tel"
                        placeholder="+234 800 000 0000"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Age Range *</label>
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
                  </>
                )}

                {step === "guests" && (
                  <>
                    <p className="text-sm text-gray-300">
                      You&apos;re buying {form.quantity} tickets. Where should they go?
                    </p>
                    <div className="grid gap-2">
                      {[
                        {
                          split: false,
                          icon: Mail,
                          title: "Send all tickets to me",
                          sub: `One ticket for ${form.quantity} people, emailed to ${form.email || "you"}.`,
                        },
                        {
                          split: true,
                          icon: Users,
                          title: "Send each ticket to a different email",
                          sub: "Every guest gets their own ticket and QR code.",
                        },
                      ].map((o) => {
                        const active = splitTickets === o.split;
                        const Icon = o.icon;
                        return (
                          <button
                            key={String(o.split)}
                            type="button"
                            onClick={() => setSplitTickets(o.split)}
                            aria-pressed={active}
                            className="flex items-start gap-3 p-4 rounded-xl border text-left transition-all"
                            style={{
                              borderColor: active ? "#FFFF00" : "rgba(255,255,255,0.1)",
                              background: active ? "rgba(255,255,0,0.06)" : "transparent",
                            }}
                          >
                            <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: active ? "#FFFF00" : "#888" }} />
                            <span>
                              <span className="block text-sm font-bold" style={{ color: active ? "#FFFF00" : "#ddd" }}>
                                {o.title}
                              </span>
                              <span className="block text-xs text-gray-500 mt-0.5">{o.sub}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {splitTickets && (
                      <div className="space-y-4 pt-1">
                        <p className="text-[11px] text-gray-500">
                          Ticket 1 is yours{form.name.trim() ? ` (${form.name.trim()})` : ""}.
                        </p>
                        {Array.from({ length: form.quantity - 1 }, (_, i) => (
                          <div key={i} className="space-y-2">
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Ticket {i + 2}</p>
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
                        ))}
                      </div>
                    )}
                  </>
                )}

                {step === "review" && (
                  <>
                    {/* Order summary */}
                    <div className="rounded-lg border border-[#FFFF00]/15 p-4 space-y-2">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">{event.title}</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">
                          {form.quantity}× {hasTiers ? selectedTier?.name : "ticket"} @ ₦{activePrice.toLocaleString()}
                        </span>
                        <span className="text-gray-300">₦{total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-white/8 pt-2">
                        <span className="text-gray-300">Total</span>
                        <span style={{ color: "#FFFF00", textShadow: "0 0 10px rgba(255,255,0,0.5)" }}>
                          ₦{total.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* What they entered, with quick edit links */}
                    <div className="rounded-lg border border-white/10 p-4 space-y-2 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate">{form.name}</p>
                          <p className="text-gray-500 text-xs truncate">
                            {form.email}
                            {form.phone ? ` · ${form.phone}` : ""} · {ageRange}
                          </p>
                        </div>
                        <EditLink onClick={() => goTo("details")} />
                      </div>
                      {guestList.length > 0 && (
                        <div className="flex items-start justify-between gap-3 border-t border-white/5 pt-2">
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Tickets sent to guests</p>
                            {guestList.map((g, i) => (
                              <p key={i} className="text-gray-400 text-xs truncate">
                                {g.name} · {g.email}
                              </p>
                            ))}
                          </div>
                          <EditLink onClick={() => goTo("guests")} />
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-gray-400">Your tickets will be reserved for 15 minutes when you continue to payment.</p>
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
                          I consent to Dine At Night sharing my email address and phone number with selected sponsors
                          and partners for marketing and promotional communications.
                        </span>
                      </label>
                      <p className="text-gray-600 text-[11px]">
                        Marketing consent is optional and can be withdrawn at any time.
                      </p>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Footer: Back / Continue / Pay ── */}
          <div className="flex-shrink-0 px-6 sm:px-8 pt-3 pb-6 sm:pb-8 border-t border-white/5 space-y-2">
            {error && <p className="text-[#FF3333] text-xs text-center">{error}</p>}
            <div className="flex gap-2">
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={() => goTo(steps[stepIndex - 1])}
                  disabled={loading}
                  aria-label="Back"
                  className="w-14 flex-shrink-0 flex items-center justify-center rounded-full border border-white/15 text-gray-300 hover:text-white hover:border-white/30 transition-all disabled:opacity-30"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <motion.button
                type="submit"
                disabled={checkoutDisabled}
                className="flex-1 py-4 rounded-full font-bold uppercase tracking-widest text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: quantityDisabled ? "#1a1a1a" : loading ? "transparent" : "#FFFF00",
                  color: quantityDisabled ? "#888" : loading ? "#FFFF00" : "#000",
                  border: quantityDisabled ? "2px solid #333" : "2px solid #FFFF00",
                  boxShadow: quantityDisabled ? "none" : loading ? "0 0 15px rgba(255,255,0,0.2)" : "0 0 30px rgba(255,255,0,0.5)",
                }}
                whileHover={!checkoutDisabled ? { scale: 1.02 } : {}}
                whileTap={!checkoutDisabled ? { scale: 0.97 } : {}}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="w-4 h-4 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
                    Redirecting to Paystack…
                  </span>
                ) : soldOut ? (
                  "Sold out"
                ) : !inventory ? (
                  "Checking availability..."
                ) : isLast ? (
                  `Pay ₦${total.toLocaleString()} via Paystack →`
                ) : (
                  `Continue · ₦${total.toLocaleString()}`
                )}
              </motion.button>
            </div>
            {isLast && (
              <p className="text-gray-700 text-xs text-center">Secured by Paystack. Your ticket is emailed after payment.</p>
            )}
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function EditLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[10px] font-bold uppercase tracking-widest text-[#FFFF00] hover:opacity-70 flex-shrink-0"
    >
      Edit
    </button>
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
