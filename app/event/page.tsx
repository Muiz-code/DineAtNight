"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import Link from "next/link";
import VendorModal from "../_components/VendorModal";
import Footer from "../_components/Footer";
import Carousel from "../_components/Carousel";
import { getActiveEvents, getPastEvents, type DanEvent } from "@/lib/firestore";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { X } from "lucide-react";

/* ── helpers ── */
const SectionFadeIn = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

const NeonButton = ({
  children,
  color = "#fff",
  glowColor,
  onClick,
  href,
}: {
  children: React.ReactNode;
  color?: string;
  glowColor: string;
  onClick?: () => void;
  href?: string;
}) => {
  const cls =
    "relative w-full sm:w-auto px-8 py-4 sm:py-3 text-sm font-bold bg-transparent rounded-full uppercase tracking-widest cursor-pointer overflow-hidden group";
  const style = {
    border: `2px solid ${glowColor}`,
    color,
    textShadow: `0 0 10px ${glowColor}`,
    boxShadow: `0 0 15px ${glowColor}, inset 0 0 15px ${glowColor}20`,
  };
  const btn = (
    <motion.button
      onClick={onClick}
      className={cls}
      style={style}
      whileHover={{ boxShadow: `0 0 35px ${glowColor}`, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
    >
      <span
        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
        style={{ backgroundColor: glowColor }}
      />
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
  return href ? (
    <Link href={href} className="w-full sm:w-auto">
      {btn}
    </Link>
  ) : (
    btn
  );
};

/* ── Countdown ── */
const useCountdown = (target: Date | null) => {
  const calc = () => {
    if (!target) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.getTime()]);
  return time;
};

const CountdownUnit = ({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) => (
  <div className="flex flex-col items-center">
    <div
      className="w-14 h-14 sm:w-20 sm:h-20 md:w-28 md:h-28 rounded-xl flex items-center justify-center text-xl sm:text-3xl md:text-5xl font-bold border"
      style={{
        borderColor: color,
        color,
        textShadow: `0 0 20px ${color}`,
        boxShadow: `0 0 20px ${color}40, inset 0 0 20px ${color}10`,
        background: "rgba(0,0,0,0.6)",
      }}
    >
      {String(value).padStart(2, "0")}
    </div>
    <span className="mt-1.5 text-[9px] sm:text-[10px] tracking-[0.3em] text-gray-500 uppercase">
      {label}
    </span>
  </div>
);

function CardCountdown({ targetDate }: { targetDate: Date }) {
  const cd = useCountdown(targetDate);
  const units = [
    { v: cd.days, l: "D" },
    { v: cd.hours, l: "H" },
    { v: cd.minutes, l: "M" },
    { v: cd.seconds, l: "S" },
  ];
  return (
    <div className="flex items-center gap-1 sm:gap-1.5">
      {units.map((u, i) => (
        <div key={u.l} className="flex items-center gap-1 sm:gap-1.5">
          <div className="flex flex-col items-center">
            <div
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold border"
              style={{
                borderColor: "#FFFF00",
                color: "#FFFF00",
                background: "rgba(0,0,0,0.6)",
                boxShadow: "0 0 8px rgba(255,255,0,0.2)",
              }}
            >
              {String(u.v).padStart(2, "0")}
            </div>
            <span className="text-[8px] text-gray-600 uppercase tracking-wider mt-0.5">{u.l}</span>
          </div>
          {i < 3 && <span className="text-gray-700 font-bold pb-3.5 text-[10px]">:</span>}
        </div>
      ))}
    </div>
  );
}

/* ── Ticket Modal ── */
const inputCls =
  "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all placeholder:text-gray-700";

function TicketModal({
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
  const [selectedId, setSelectedId] = useState(initialEvent.id ?? "");
  const event = events.find((e) => e.id === selectedId) ?? initialEvent;
  const soldCount = soldCounts[event.id ?? ""] ?? event.soldTickets ?? 0;
  const remaining = event.totalTickets - soldCount;

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
    if (remaining < form.quantity) {
      setError("Not enough tickets remaining.");
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
          ticketPrice: event.ticketPrice,
        }),
      });
      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        setError(data.error ?? "Failed to initialize payment.");
        setLoading(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const total = event.ticketPrice * form.quantity;

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
        className="relative w-full sm:max-w-md max-h-[93svh] overflow-y-auto bg-[#050505] border border-[#FFFF00]/25 sm:rounded-2xl rounded-t-3xl"
        style={{ boxShadow: "0 0 60px rgba(255,255,0,0.1)" }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className="absolute top-0 left-0 w-8 h-8 hidden sm:block"
          style={{
            borderTop: "2px solid #FFFF00",
            borderLeft: "2px solid #FFFF00",
          }}
        />
        <span
          className="absolute bottom-0 right-0 w-8 h-8 hidden sm:block"
          style={{
            borderBottom: "2px solid #FFFF00",
            borderRight: "2px solid #FFFF00",
          }}
        />
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
                Get Tickets
              </h2>
              <p className="text-gray-500 text-xs mt-1">
                {event.date?.toDate?.()?.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })} · {event.venue}
              </p>
              <p className="text-gray-600 text-xs mt-0.5">
                {remaining} tickets remaining
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
                    <option key={ev.id} value={ev.id} className="bg-[#0a0a0a]">
                      {ev.title}
                    </option>
                  ))}
                </select>
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
                  { length: Math.min(10, remaining) },
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
                  {form.quantity}x ticket @ ₦
                  {event.ticketPrice.toLocaleString()}
                </span>
                <span className="text-gray-300">
                  ₦{(event.ticketPrice * form.quantity).toLocaleString()}
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
      </motion.div>
    </motion.div>
  );
}

/* ── FAQ Data ── */
const faqs = [
  {
    q: "When is the next Dine At Night?",
    a: "Check the Upcoming Events section above for the latest confirmed dates.",
  },
  {
    q: "How do I get tickets?",
    a: "Click \u2018Get Tickets\u2019 on any active event. You\u2019ll be redirected to Paystack to pay, then your ticket is emailed instantly.",
  },
  {
    q: "Is there an age limit?",
    a: "Dine At Night is an all-ages event. However, alcohol service is restricted to guests 18 and above.",
  },
  {
    q: "Can I bring my own food or drinks?",
    a: "No outside food or beverages. Our vendors serve everything you need for an incredible night.",
  },
  {
    q: "How do I become a vendor?",
    a: "Click \u2018Apply to Vend\u2019 on this page to submit your application. We review all applicants carefully.",
  },
];

/* ── Static carousel data ── */
const highlights = [
  {
    id: 1,
    icon: "🍖",
    title: "50+ Vendors",
    desc: "Curated food vendors serving the best bites in Lagos.",
    color: "#FFFF00",
  },
  {
    id: 2,
    icon: "🎵",
    title: "Live Music & DJs",
    desc: "A curated soundtrack that keeps the energy high all night.",
    color: "#FF3333",
  },
  {
    id: 3,
    icon: "📸",
    title: "Content Corners",
    desc: "Instagrammable setups designed for the perfect shot.",
    color: "#00FF41",
  },
  {
    id: 4,
    icon: "🥂",
    title: "Bar Activations",
    desc: "Signature cocktails and drinks from top brands.",
    color: "#FFFF00",
  },
  {
    id: 5,
    icon: "🏆",
    title: "Vendor Competitions",
    desc: "Watch the best vendors compete for the crowd\u2019s favourite.",
    color: "#FF3333",
  },
  {
    id: 6,
    icon: "🌙",
    title: "Open Air Neon Market",
    desc: "An immersive night market unlike anything in Lagos.",
    color: "#00FF41",
  },
];

const testimonials = [
  {
    id: 1,
    quote:
      "The event was well coordinated. Considering it was the first edition, there was a large turnout which was effectively managed.",
    author: "Norma",
    color: "#FFFF00",
  },
  {
    id: 2,
    quote:
      "DAT was a very welcome novel experience to the Lagos food festival scene. The organisers got the M.O. to the T!!",
    author: "Topsis Burger Lab",
    color: "#FF3333",
  },
  {
    id: 3,
    quote:
      "It was a super fun event — we loved how interactive it was, and how vendors had spotlights.",
    author: "Ensweet",
    color: "#00FF41",
  },
];

/* ── Page ── */
export default function EventPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [ticketEvent, setTicketEvent] = useState<DanEvent | null>(null);
  const [activeEvents, setActiveEvents] = useState<DanEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<DanEvent[]>([]);
  const [soldByEvent, setSoldByEvent] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch events first — tickets are best-effort and must never block event display
    Promise.all([getActiveEvents(), getPastEvents()])
      .then(([active, past]) => {
        setActiveEvents(active);
        setPastEvents(past);
      })
      .finally(() => setLoading(false));

    // Fetch tickets separately — if rules block this it won't affect events showing
    getDocs(collection(db, "tickets"))
      .then((txSnap) => {
        const counts: Record<string, number> = {};
        for (const d of txSnap.docs) {
          const t = d.data();
          if (t.status !== "pending") {
            counts[t.eventId] = (counts[t.eventId] ?? 0) + (t.quantity ?? 1);
          }
        }
        setSoldByEvent(counts);
      })
      .catch(() => {
        // Silently fall back to ev.soldTickets for sold counts
      });
  }, []);

  const nextEventDate =
    activeEvents.length > 0 ? (activeEvents[0].date?.toDate?.() ?? null) : null;
  const countdown = useCountdown(nextEventDate);

  return (
    <div className="relative w-full min-h-screen bg-black overflow-x-hidden">
      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center min-h-[70svh] px-6 text-center pt-24 pb-16">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,0,0.07) 0%, transparent 70%)",
          }}
        />
        <motion.p
          className="text-xs sm:text-sm tracking-[0.4em] uppercase mb-4"
          style={{
            color: "#FFFF00",
            textShadow: "0 0 12px rgba(255,255,0,0.7)",
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Dine At Night
        </motion.p>
        <motion.h1
          className="text-5xl sm:text-7xl md:text-8xl uppercase tracking-tight leading-none"
          style={{
            color: "transparent",
            WebkitTextStroke: "2px #FFFF00",
            textShadow: "0 0 40px rgba(255,255,0,0.4)",
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          Events
        </motion.h1>
        <motion.p
          className="mt-4 text-lg sm:text-2xl tracking-widest italic"
          style={{
            color: "#FF3333",
            textShadow: "0 0 15px rgba(255,51,51,0.6)",
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
        >
          The Night Returns
        </motion.p>
        <motion.div
          className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4 sm:px-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55 }}
        >
          <NeonButton
            color="#FFFF00"
            glowColor="rgba(255,255,0,0.65)"
            onClick={() =>
              activeEvents.length > 0 && setTicketEvent(activeEvents[0])
            }
          >
            Get Tickets
          </NeonButton>
          <NeonButton
            color="#fff"
            glowColor="rgba(255,51,51,0.65)"
            onClick={() => setVendorModalOpen(true)}
          >
            Apply to Vend
          </NeonButton>
        </motion.div>
      </section>

      {/* ── COUNTDOWN ── */}
      <SectionFadeIn>
        <section className="relative z-10 py-16 px-6 bg-black/80 border-y border-white/5">
          <div className="max-w-3xl mx-auto text-center">
            {loading ? (
              <div className="flex items-center justify-center gap-2 text-gray-600 text-sm">
                <div className="w-4 h-4 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
                Loading event data…
              </div>
            ) : nextEventDate ? (
              <>
                <p className="text-xs tracking-[0.4em] uppercase text-gray-500 mb-8">
                  Countdown to {activeEvents[0]?.title ?? "Next Edition"}
                </p>
                <div className="flex items-start justify-center gap-2 sm:gap-4 md:gap-8">
                  <CountdownUnit
                    value={countdown.days}
                    label="Days"
                    color="#FFFF00"
                  />
                  <span className="text-xl sm:text-3xl md:text-5xl font-bold text-gray-700 mt-2 sm:mt-3 md:mt-4">
                    :
                  </span>
                  <CountdownUnit
                    value={countdown.hours}
                    label="Hours"
                    color="#FF3333"
                  />
                  <span className="text-xl sm:text-3xl md:text-5xl font-bold text-gray-700 mt-2 sm:mt-3 md:mt-4">
                    :
                  </span>
                  <CountdownUnit
                    value={countdown.minutes}
                    label="Minutes"
                    color="#00FF41"
                  />
                  <span className="text-xl sm:text-3xl md:text-5xl font-bold text-gray-700 mt-2 sm:mt-3 md:mt-4">
                    :
                  </span>
                  <CountdownUnit
                    value={countdown.seconds}
                    label="Seconds"
                    color="#FFFF00"
                  />
                </div>
                <p className="mt-8 text-gray-600 text-sm tracking-widest uppercase">
                  {nextEventDate.toLocaleDateString("en-NG", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  · {activeEvents[0]?.venue}
                </p>
              </>
            ) : (
              <p className="text-gray-600 text-sm tracking-widest uppercase">
                No upcoming events scheduled. Subscribe below to be first to
                know.
              </p>
            )}
          </div>
        </section>
      </SectionFadeIn>

      {/* ── ACTIVE EVENTS ── */}
      {!loading && activeEvents.length > 0 && (
        <SectionFadeIn>
          <section className="relative z-10 py-20 px-6 md:px-16 bg-black/75">
            <div className="max-w-5xl mx-auto">
              <h2
                className="text-4xl md:text-5xl uppercase tracking-wider text-center mb-12"
                style={{
                  color: "transparent",
                  WebkitTextStroke: "2px #FFFF00",
                  textShadow: "0 0 20px rgba(255,255,0,0.3)",
                }}
              >
                Upcoming Events
              </h2>
              <div className="space-y-6">
                {activeEvents.map((ev) => {
                  const evDate = ev.date
                    ?.toDate?.()
                    ?.toLocaleDateString("en-NG", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    });
                  const evTime = ev.date
                    ?.toDate?.()
                    ?.toLocaleTimeString("en-NG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                  const sold = soldByEvent[ev.id ?? ""] ?? ev.soldTickets ?? 0;
                  const remaining = ev.totalTickets - sold;
                  const pct = ev.totalTickets > 0 ? Math.round((sold / ev.totalTickets) * 100) : 0;
                  const soldOut = remaining <= 0;
                  return (
                    <motion.div
                      key={ev.id}
                      className="relative rounded-2xl border p-6 md:p-8"
                      style={{
                        borderColor: "rgba(255,255,0,0.25)",
                        background: "linear-gradient(135deg, #090909, #040404)",
                        boxShadow: "0 0 30px rgba(255,255,0,0.06)",
                      }}
                      whileHover={{
                        borderColor: "rgba(255,255,0,0.5)",
                        boxShadow: "0 0 40px rgba(255,255,0,0.12)",
                      }}
                    >
                      <span
                        className="absolute top-0 left-0 w-8 h-8"
                        style={{
                          borderTop: "2px solid #FFFF00",
                          borderLeft: "2px solid #FFFF00",
                        }}
                      />
                      <span
                        className="absolute bottom-0 right-0 w-8 h-8"
                        style={{
                          borderBottom: "2px solid #FFFF00",
                          borderRight: "2px solid #FFFF00",
                        }}
                      />
                      <div className="flex flex-col md:flex-row md:items-start gap-6">
                        <div className="flex-1">
                          <h3
                            className="text-2xl md:text-3xl font-bold uppercase tracking-wide"
                            style={{
                              color: "#FFFF00",
                              textShadow: "0 0 20px rgba(255,255,0,0.5)",
                            }}
                          >
                            {ev.title}
                          </h3>
                          <p className="text-gray-400 text-sm mt-1">
                            {evDate} · {evTime}
                          </p>
                          <p className="text-gray-500 text-sm mt-0.5">
                            📍 {ev.venue}
                          </p>
                          {ev.date?.toDate?.() && (
                            <div className="mt-3">
                              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1.5">Starts in</p>
                              <CardCountdown targetDate={ev.date.toDate()} />
                            </div>
                          )}
                          <p className="text-gray-400 text-sm mt-3 max-w-lg leading-relaxed">
                            {ev.description}
                          </p>
                          {ev.highlights?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                              {ev.highlights.map((h) => (
                                <span
                                  key={h}
                                  className="text-xs px-3 py-1 rounded-full border"
                                  style={{
                                    borderColor: "rgba(255,255,0,0.2)",
                                    color: "rgba(255,255,0,0.7)",
                                  }}
                                >
                                  {h}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-start md:items-end gap-4 md:min-w-52">
                          <div>
                            <p className="text-gray-600 text-xs uppercase tracking-widest">
                              Price per ticket
                            </p>
                            <p
                              className="text-2xl font-bold"
                              style={{ color: "#FFFF00" }}
                            >
                              ₦{ev.ticketPrice.toLocaleString()}
                            </p>
                          </div>
                          <div className="w-full">
                            <div className="flex justify-between text-xs mb-1">
                              <span style={{ color: pct >= 90 ? "#FF3333" : "rgba(255,255,255,0.4)" }}>
                                {pct}% sold
                              </span>
                              <span className="text-gray-600">{100 - pct}% remaining</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${pct}%`,
                                  background: pct >= 90 ? "#FF3333" : "#FFFF00",
                                }}
                              />
                            </div>
                          </div>
                          <motion.button
                            disabled={soldOut}
                            onClick={() => !soldOut && setTicketEvent(ev)}
                            className="w-full md:w-auto px-8 py-3 rounded-full font-bold uppercase tracking-widest text-sm"
                            style={{
                              background: soldOut ? "transparent" : "#FFFF00",
                              color: soldOut ? "#666" : "#000",
                              border: soldOut
                                ? "2px solid #333"
                                : "2px solid #FFFF00",
                              boxShadow: soldOut
                                ? "none"
                                : "0 0 20px rgba(255,255,0,0.4)",
                              cursor: soldOut ? "not-allowed" : "pointer",
                            }}
                            whileHover={!soldOut ? { scale: 1.03 } : {}}
                            whileTap={!soldOut ? { scale: 0.97 } : {}}
                          >
                            {soldOut ? "Sold Out" : "Get Tickets →"}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>
        </SectionFadeIn>
      )}

      {/* ── WHAT TO EXPECT Carousel ── */}
      <SectionFadeIn>
        <section className="relative z-10 py-20 px-6 md:px-16 bg-black/75">
          <div className="max-w-3xl mx-auto">
            <Carousel
              title="What to Expect"
              accentColor="#00FF41"
              glowColor="rgba(0,255,65,0.4)"
              autoPlayInterval={4000}
              items={highlights.map((h) => ({
                id: h.id,
                content: (
                  <div
                    className="rounded-xl border p-8 text-center mx-2"
                    style={{
                      borderColor: `${h.color}25`,
                      background: "rgba(10,10,10,0.8)",
                    }}
                  >
                    <div className="text-5xl mb-4">{h.icon}</div>
                    <h3
                      className="text-2xl font-bold uppercase tracking-wide mb-3"
                      style={{ color: h.color }}
                    >
                      {h.title}
                    </h3>
                    <p className="text-gray-400 text-base leading-relaxed max-w-sm mx-auto">
                      {h.desc}
                    </p>
                  </div>
                ),
              }))}
            />
          </div>
        </section>
      </SectionFadeIn>

      {/* ── PAST EDITIONS Carousel (from Firebase) ── */}
      {!loading && pastEvents.length > 0 && (
        <SectionFadeIn>
          <section className="relative z-10 py-20 px-6 md:px-16 bg-black/85 border-t border-white/5">
            <div className="max-w-4xl mx-auto">
              <Carousel
                title="Past Editions"
                accentColor="#FF3333"
                glowColor="rgba(255,51,51,0.4)"
                items={pastEvents.map((ev) => {
                  const evDate = ev.date
                    ?.toDate?.()
                    ?.toLocaleDateString("en-NG", {
                      month: "long",
                      year: "numeric",
                    });
                  return {
                    id: ev.id!,
                    content: (
                      <div
                        className="relative rounded-2xl border p-8 md:p-10 overflow-hidden mx-2"
                        style={{
                          borderColor: "rgba(255,51,51,0.3)",
                          background:
                            "linear-gradient(135deg, #080808, #030303)",
                          boxShadow: "0 0 30px rgba(255,51,51,0.08)",
                        }}
                      >
                        <span
                          className="absolute top-0 left-0 w-8 h-8"
                          style={{
                            borderTop: "2px solid #FF3333",
                            borderLeft: "2px solid #FF3333",
                          }}
                        />
                        <span
                          className="absolute bottom-0 right-0 w-8 h-8"
                          style={{
                            borderBottom: "2px solid #FF3333",
                            borderRight: "2px solid #FF3333",
                          }}
                        />
                        <p
                          className="text-xs tracking-[0.4em] uppercase mb-1"
                          style={{ color: "#FF3333" }}
                        >
                          {evDate}
                        </p>
                        <h3
                          className="text-3xl font-bold uppercase tracking-wide"
                          style={{
                            color: "#FF3333",
                            textShadow: "0 0 20px rgba(255,51,51,0.5)",
                          }}
                        >
                          {ev.edition}
                        </h3>
                        <p className="text-gray-500 text-sm mb-4 tracking-widest">
                          {ev.venue}
                        </p>
                        <p className="text-gray-300 text-base leading-relaxed">
                          {ev.description}
                        </p>
                        <div className="flex gap-4 mt-6 flex-wrap text-xs text-gray-500">
                          <span>{soldByEvent[ev.id ?? ""] ?? ev.soldTickets}+ tickets sold</span>
                          <Link
                            href="/gallery"
                            className="text-[#FF3333] hover:underline"
                          >
                            View Gallery →
                          </Link>
                        </div>
                      </div>
                    ),
                  };
                })}
              />
            </div>
          </section>
        </SectionFadeIn>
      )}

      {/* ── TESTIMONIALS Carousel ── */}
      <SectionFadeIn>
        <section className="relative z-10 py-20 px-6 md:px-16 bg-black/75 border-t border-white/5">
          <div className="max-w-3xl mx-auto">
            <Carousel
              title="What Vendors Say"
              accentColor="#00FF41"
              glowColor="rgba(0,255,65,0.4)"
              autoPlayInterval={6000}
              items={testimonials.map((t) => ({
                id: t.id,
                content: (
                  <div
                    className="relative rounded-xl border p-8 md:p-10 bg-black/60 mx-2"
                    style={{
                      borderColor: `${t.color}25`,
                      boxShadow: `0 0 25px ${t.color}10`,
                    }}
                  >
                    <span
                      className="absolute -top-4 left-8 text-4xl leading-none"
                      style={{ color: t.color }}
                    >
                      &ldquo;
                    </span>
                    <p className="text-gray-300 text-base md:text-lg leading-relaxed italic">
                      {t.quote}
                    </p>
                    <p
                      className="mt-5 font-bold tracking-widest uppercase text-sm"
                      style={{ color: t.color }}
                    >
                      — {t.author}
                    </p>
                  </div>
                ),
              }))}
            />
          </div>
        </section>
      </SectionFadeIn>

      {/* ── FAQ ── */}
      <SectionFadeIn>
        <section className="relative z-10 py-20 px-6 md:px-16 bg-black/75">
          <div className="max-w-3xl mx-auto">
            <h2
              className="text-4xl md:text-5xl uppercase tracking-wider text-center mb-14"
              style={{
                color: "transparent",
                WebkitTextStroke: "2px #FFFF00",
                textShadow: "0 0 20px rgba(255,255,0,0.4)",
              }}
            >
              FAQ
            </h2>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <motion.div
                  key={i}
                  className="rounded-xl border overflow-hidden"
                  style={{
                    borderColor:
                      openFaq === i ? "#FFFF00" : "rgba(255,255,255,0.07)",
                    boxShadow:
                      openFaq === i ? "0 0 20px rgba(255,255,0,0.15)" : "none",
                  }}
                >
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="text-gray-200 text-sm sm:text-base font-medium pr-4">
                      {faq.q}
                    </span>
                    <span
                      className="text-xl flex-shrink-0 transition-transform duration-300"
                      style={{
                        color: "#FFFF00",
                        transform:
                          openFaq === i ? "rotate(45deg)" : "rotate(0deg)",
                      }}
                    >
                      +
                    </span>
                  </button>
                  {openFaq === i && (
                    <motion.div
                      className="px-5 pb-5"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="text-gray-500 text-sm leading-relaxed">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── SUBSCRIBE CTA ── */}
      <SectionFadeIn>
        <section className="relative z-10 py-20 px-6 text-center bg-black/90 border-t border-white/5">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2
              className="text-3xl sm:text-5xl font-bold uppercase tracking-wider"
              style={{
                color: "#FFFF00",
                textShadow: "0 0 30px rgba(255,255,0,0.5)",
              }}
            >
              Don&apos;t Miss Edition 2
            </h2>
            <p className="text-gray-400 text-base">
              Subscribe for early-bird access, vendor reveals, and exclusive
              updates.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <input
                type="email"
                placeholder="Enter your email"
                className="px-6 py-3 bg-white/5 border border-white/15 rounded-full text-white focus:outline-none focus:border-[#FFFF00] transition-all w-full sm:w-80 placeholder:text-gray-700"
              />
              <NeonButton color="#FFFF00" glowColor="rgba(255,255,0,0.65)">
                Notify Me
              </NeonButton>
            </div>
          </div>
        </section>
      </SectionFadeIn>

      <Footer />

      {/* Modals */}
      <VendorModal
        isOpen={vendorModalOpen}
        onClose={() => setVendorModalOpen(false)}
      />
      <AnimatePresence>
        {ticketEvent && (
          <TicketModal
            initialEvent={ticketEvent}
            events={activeEvents}
            soldCounts={soldByEvent}
            onClose={() => setTicketEvent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
