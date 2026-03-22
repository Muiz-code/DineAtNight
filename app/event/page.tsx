/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SectionFadeIn from "../_components/SectionFadeIn";
import Link from "next/link";
import VendorModal from "../_components/VendorModal";
import TicketModal from "../_components/TicketModal";
import Toast from "../_components/Toast";
import Footer from "../_components/Footer";
import Carousel from "../_components/Carousel";
import HeroCarousel from "../_components/HeroCarousel";
import TestimonialSection from "../_components/TestimonialSection";
import CardCountdown, { useCountdown } from "../_components/CardCountdown";
import NeonMarquee from "../_components/NeonMarquee";
import {
  subscribeActiveEvents,
  subscribePastEvents,
  getAllGalleryItems,
  type DanEvent,
} from "@/lib/firestore";
import { getCache, setCache } from "@/lib/cache";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  X,
  Utensils,
  Music2,
  Camera,
  Wine,
  Trophy,
  Moon,
  MapPin,
  ChevronDown,
} from "lucide-react";

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

/* ── CountdownUnit (hero display only) ── */
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

/* ── FAQ Data ── */
const faqs = [
  {
    q: "What can I expect at Dine at Night?",
    a: "Expect a curated lineup of food vendors, great music, and a vibrant atmosphere. Come ready to eat, explore, and experience the energy of Lagos at night.",
  },
  {
    q: "When is the next event?",
    a: "Our main event takes place annually in December, with special editions throughout the year. Follow us on Instagram or join our mailing list to be the first to know when tickets drop.",
  },
  {
    q: "How do I get tickets?",
    a: "Tickets are released online ahead of each event and are available until sold out. We recommend purchasing early as tickets are limited and previous editions have sold out.",
  },
  {
    q: "Is there an age limit?",
    a: "Yes, Dine at Night is strictly a 16+ event.",
  },
  {
    q: "How do I become a vendor?",
    a: "Vendors are selected through a curation process. You can apply through our vendor form, and our team reviews each application based on quality, originality, and fit. We’ll reach out if selected.",
  },
  {
    q: "What do you look for in vendors?",
    a: "We prioritise quality, originality, and strong food concepts. We’re looking for vendors who understand the experience and can deliver consistently within a high-energy environment.",
  },
  {
    q: "Is there a fee to vend?",
    a: "Yes. Selected vendors are required to pay a participation fee. Full details are shared with vendors upon acceptance.",
  },
  {
    q: "How do I become a sponsor? ",
    a: "For sponsorship enquiries, please email contact@dineatnight.com with your brand details and the type of partnership you have in mind. Our team will be in touch if there’s a fit.",
  },
];

/* ── Static carousel data ── */
const highlights = [
  {
    id: 1,
    icon: <Utensils className="w-12 h-12 mx-auto" />,
    title: "Curated Vendors",
    desc: "Handpicked food vendors serving the best bites in Lagos.",
    color: "#FFFF00",
    imageUrl:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80",
  },
  {
    id: 2,
    icon: <Music2 className="w-12 h-12 mx-auto" />,
    title: "Music & DJs",
    desc: "A curated soundtrack that keeps the energy high all night.",
    color: "#FF3333",
    imageUrl:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80",
  },
  {
    id: 3,
    icon: <Camera className="w-12 h-12 mx-auto" />,
    title: "Content Corners",
    desc: "Instagrammable setups designed for the perfect shot.",
    color: "#00FF41",
    imageUrl:
      "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=80",
  },
  {
    id: 4,
    icon: <Wine className="w-12 h-12 mx-auto" />,
    title: "Bar Activations",
    desc: "Signature cocktails and drinks from top brands.",
    color: "#FFFF00",
    imageUrl:
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80",
  },
  {
    id: 5,
    icon: <Moon className="w-12 h-12 mx-auto" />,
    title: "Open Air Neon Market",
    desc: "An immersive night market unlike anything in Lagos.",
    color: "#FF3333",
    imageUrl:
      "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80",
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
  const [isMobile, setIsMobile] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [galleryPhotoUrls, setGalleryPhotoUrls] = useState<string[]>([]);
  const [toast, setToast] = useState<{
    message: string;
    type: "info" | "error" | "success";
  } | null>(null);
  const pastResolvedRef = useRef(false);

  useEffect(() => {
    // Client-side initialization to prevent hydration mismatch
    setIsMobile(window.innerWidth < 768);

    const cachedActive = getCache<DanEvent[]>("dan_active_events");
    if (cachedActive) setActiveEvents(cachedActive);

    const cachedPast = getCache<DanEvent[]>("dan_past_events");
    if (cachedPast) {
      setPastEvents(cachedPast);
      setLoading(false);
      pastResolvedRef.current = true;
    }
  }, []);

  useEffect(() => {
    getAllGalleryItems()
      .then((items) => {
        const photos = items
          .filter((i) => i.type === "photo")
          .map((i) => i.src as string);
        // Shuffle and pick up to 6
        const shuffled = [...photos]
          .sort(() => Math.random() - 0.5)
          .slice(0, 6);
        setGalleryPhotoUrls(shuffled);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const unsubActive = subscribeActiveEvents((evs) => {
      setActiveEvents(evs);
      setCache("dan_active_events", evs);
    });
    const unsubPast = subscribePastEvents((evs) => {
      setPastEvents(evs);
      setCache("dan_past_events", evs);
      if (!pastResolvedRef.current) {
        setLoading(false);
        pastResolvedRef.current = true;
      }
    });

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

    return () => {
      unsubActive();
      unsubPast();
    };
  }, []);

  // Hero slideshow: collect images from active events (most recent first)
  const heroImages = activeEvents
    .filter((e) => e.imageUrl)
    .map((e) => e.imageUrl as string);

  const nextEventDate =
    activeEvents.length > 0 ? (activeEvents[0].date?.toDate?.() ?? null) : null;
  const countdown = useCountdown(nextEventDate);

  return (
    <div className="relative w-full min-h-screen bg-black overflow-x-hidden">
      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center h-[50vh] px-6 text-center pt-24 pb-16 overflow-hidden">
        <HeroCarousel accent="#00FF41" />
        {/* <HeroCarousel images={heroImages} accent="#FFFF00" /> */}

        {/* Neon radial glow on top */}
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,0,0.06) 0%, transparent 70%)",
          }}
        />

        {/* Text content */}
        <motion.h1
          className="relative z-10 text-5xl sm:text-7xl md:text-8xl uppercase tracking-tight leading-none"
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
          className="relative z-10 mt-4 text-lg sm:text-2xl tracking-widest italic"
          style={{
            color: "#FF3333",
            textShadow: "0 0 15px rgba(255,51,51,0.6)",
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
        >
          For those who dine after dark
        </motion.p>
        <motion.div
          className="relative z-10 mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4 sm:px-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55 }}
        >
          <NeonButton
            color="#FFFF00"
            glowColor="rgba(255,255,0,0.65)"
            onClick={() => {
              if (activeEvents.length > 0) {
                setTicketEvent(activeEvents[0]);
              } else {
                setToast({
                  message: "No upcoming events available for ticket purchase.",
                  type: "info",
                });
              }
            }}
          >
            Buy Tickets
          </NeonButton>
          <NeonButton
            color="#fff"
            glowColor="rgba(255,51,51,0.65)"
            onClick={() => setVendorModalOpen(true)}
          >
            Become a Vendor
          </NeonButton>
        </motion.div>
      </section>

      {!loading && activeEvents.length > 0 && <NeonMarquee />}

      {/* ── COUNTDOWN ── */}
      {!loading && activeEvents.length > 0 && (
        <SectionFadeIn>
          <section className="relative z-10 pt-10 pb-5 px-6 bg-black/80 border-y border-white/5">
            <div className="max-w-3xl mx-auto text-center">
              {nextEventDate ? (
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
      )}

      {/* ── SPONSORS ── */}
      {(() => {
        const allSponsors = [...activeEvents, ...pastEvents]
          .flatMap((ev) => ev.sponsors ?? [])
          .filter(
            (sp, idx, arr) => arr.findIndex((s) => s.name === sp.name) === idx,
          );
        if (loading || allSponsors.length === 0) return null;
        const colors = ["#FFFF00", "#00FF41", "#FF3333", "#FFFF00"];
        const glows = [
          "rgba(255,255,0,0.5)",
          "rgba(0,255,65,0.5)",
          "rgba(255,51,51,0.5)",
          "rgba(255,255,0,0.5)",
        ];
        const useMarquee = isMobile || allSponsors.length > 4;
        const marqueeDuration = allSponsors.length * (isMobile ? 2 : 5);

        const SponsorCard = ({
          sp,
          i,
          keyPrefix,
        }: {
          sp: { name: string; logoUrl?: string };
          i: number;
          keyPrefix: string;
        }) => {
          const c = colors[i % colors.length];
          const g = glows[i % glows.length];
          return (
            <motion.div
              key={`${keyPrefix}-${sp.name}`}
              className="w-36 h-20 md:w-44 md:h-24 flex items-center justify-center rounded-lg overflow-hidden p-3 flex-shrink-0"
              style={{
                border: `1.5px solid ${c}`,
                boxShadow: `0 0 18px ${g}, inset 0 0 12px ${g}20`,
              }}
              whileHover={{ scale: 1.05 }}
            >
              {sp.logoUrl ? (
                <div className="flex flex-col items-center justify-center gap-1 w-full h-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sp.logoUrl}
                    alt={sp.name}
                    className={`max-w-full object-contain ${sp.name ? "max-h-[65%]" : "max-h-full"}`}
                  />
                  {sp.name && (
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider text-center leading-tight"
                      style={{ color: c, textShadow: `0 0 10px ${g}` }}
                    >
                      {sp.name}
                    </span>
                  )}
                </div>
              ) : (
                <span
                  className="text-base font-bold uppercase tracking-wider"
                  style={{ color: c, textShadow: `0 0 15px ${g}` }}
                >
                  {sp.name}
                </span>
              )}
            </motion.div>
          );
        };

        return (
          <SectionFadeIn>
            <section className="relative z-10 py-14 px-6 md:px-16 bg-black/80 border-t border-white/5">
              <div className="text-center mb-8">
                <p className="text-xs tracking-[0.4em] uppercase text-gray-600">
                  Proudly Supported By
                </p>
              </div>
              {useMarquee ? (
                <div className="relative overflow-hidden -mx-6 md:-mx-16">
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 w-20 z-10"
                    style={{
                      background:
                        "linear-gradient(to right, #000 0%, transparent 100%)",
                    }}
                  />
                  <div
                    className="pointer-events-none absolute inset-y-0 right-0 w-20 z-10"
                    style={{
                      background:
                        "linear-gradient(to left, #000 0%, transparent 100%)",
                    }}
                  />
                  <motion.div
                    className="flex gap-6"
                    style={{ width: "max-content" }}
                    animate={{ x: ["0%", "-50%"] }}
                    transition={{
                      duration: marqueeDuration,
                      ease: "linear",
                      repeat: Infinity,
                    }}
                  >
                    {[...allSponsors, ...allSponsors].map((sp, i) => (
                      <SponsorCard
                        key={`${i}-${sp.name}`}
                        sp={sp}
                        i={i % allSponsors.length}
                        keyPrefix={String(i)}
                      />
                    ))}
                  </motion.div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-6">
                  {allSponsors.map((sp, i) => (
                    <SponsorCard
                      key={sp.name}
                      sp={sp}
                      i={i}
                      keyPrefix="static"
                    />
                  ))}
                </div>
              )}
            </section>
          </SectionFadeIn>
        );
      })()}

      {/* ── ACTIVE EVENTS ── */}
      {!loading && activeEvents.length > 0 && (
        <SectionFadeIn>
          <section className="relative z-10 pt-10 pb-5 px-6 md:px-16 bg-black/75">
            <div className="max-w-4xl mx-auto">
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
                  const pct =
                    ev.totalTickets > 0
                      ? Math.round((sold / ev.totalTickets) * 100)
                      : 0;
                  const soldOut = remaining <= 0;
                  const isExpanded = expandedIds.has(ev.id ?? "");
                  const toggleExpand = () => {
                    const id = ev.id ?? "";
                    setExpandedIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                    });
                  };
                  return (
                    <motion.div
                      key={ev.id}
                      className="relative rounded-2xl border overflow-hidden flex flex-col md:flex-row group"
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
                      {/* Corner accents */}
                      <span
                        className="absolute top-0 left-0 w-8 h-8 z-10"
                        style={{
                          borderTop: "2px solid #FFFF00",
                          borderLeft: "2px solid #FFFF00",
                        }}
                      />
                      <span
                        className="absolute bottom-0 right-0 w-8 h-8 z-10"
                        style={{
                          borderBottom: "2px solid #FFFF00",
                          borderRight: "2px solid #FFFF00",
                        }}
                      />

                      {/* Image — natural height on mobile, fill column on desktop */}
                      <div className="relative w-full md:w-2/5 lg:w-[45%] shrink-0 overflow-hidden">
                        {ev.imageUrl ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={ev.imageUrl}
                              alt={ev.title}
                              className="w-full h-auto block md:absolute md:inset-0 md:h-full md:object-cover md:object-center transition-transform duration-500 group-hover:scale-105"
                            />
                            {/* Mobile: subtle bottom fade */}
                            <div
                              className="absolute bottom-0 left-0 right-0 h-16 md:hidden"
                              style={{
                                background:
                                  "linear-gradient(to bottom, transparent, #090909)",
                              }}
                            />
                            {/* Desktop: fade right edge into card */}
                            <div
                              className="absolute inset-0 hidden md:block"
                              style={{
                                background:
                                  "linear-gradient(to right, transparent 55%, #090909 100%)",
                              }}
                            />
                          </>
                        ) : (
                          <div
                            className="w-full min-h-[220px]"
                            style={{
                              background:
                                "radial-gradient(ellipse at center, rgba(255,255,0,0.08), #030303)",
                            }}
                          />
                        )}
                      </div>

                      {/* Content panel */}
                      <div className="flex-1 flex flex-col gap-4 p-6 md:p-8">
                        {/* Title + meta — always visible */}
                        <div>
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
                          <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />{" "}
                            {ev.venue}
                          </p>
                        </div>

                        {/* Countdown — always visible */}
                        {ev.date?.toDate?.() && (
                          <div>
                            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1.5">
                              Happening in
                            </p>
                            <CardCountdown targetDate={ev.date.toDate()} />
                          </div>
                        )}

                        {/* Mobile: "See Details" accordion toggle */}
                        <button
                          className="flex md:hidden items-center justify-between w-full py-2 border-t text-xs font-bold uppercase tracking-widest transition-colors"
                          style={{
                            borderColor: "rgba(255,255,0,0.12)",
                            color: isExpanded
                              ? "rgba(255,255,0,0.9)"
                              : "rgba(255,255,0,0.55)",
                          }}
                          onClick={toggleExpand}
                        >
                          <span>
                            {isExpanded ? "Hide Details" : "See Details"}
                          </span>
                          <ChevronDown
                            className="w-4 h-4 transition-transform duration-300"
                            style={{
                              transform: isExpanded
                                ? "rotate(180deg)"
                                : "rotate(0deg)",
                            }}
                          />
                        </button>

                        {/* Collapsible: description, highlights, tiers, progress bar */}
                        <div
                          className="grid transition-all duration-300 ease-in-out"
                          style={{
                            gridTemplateRows:
                              !isMobile || isExpanded ? "1fr" : "0fr",
                            opacity: !isMobile || isExpanded ? 1 : 0,
                          }}
                        >
                          <div className="overflow-hidden flex flex-col gap-4 min-h-0">
                            {/* Description */}
                            <p className="text-gray-400 text-sm leading-relaxed">
                              {ev.description}
                            </p>

                            {/* Highlights */}
                            {ev.highlights?.length > 0 && (
                              <div className="flex flex-wrap gap-2">
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

                            {/* Ticket tiers OR single price */}
                            <div className="pt-1 space-y-3">
                              {ev.ticketTypes && ev.ticketTypes.length > 0 ? (
                                <div>
                                  <p className="text-gray-600 text-xs uppercase tracking-widest mb-2">
                                    Ticket Types
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {ev.ticketTypes.map((tier, tierIdx) => (
                                      <div
                                        key={`${ev.id}-${tier.name}-${tierIdx}`}
                                        className="flex flex-col items-start px-3 py-2 rounded-xl border"
                                        style={{
                                          borderColor: "rgba(255,255,0,0.25)",
                                          background: "rgba(255,255,0,0.05)",
                                        }}
                                      >
                                        <span
                                          className="text-[10px] font-bold uppercase tracking-widest"
                                          style={{ color: "#FFFF00" }}
                                        >
                                          {tier.name}
                                        </span>
                                        <span className="text-base font-bold text-white">
                                          ₦{tier.price.toLocaleString()}
                                        </span>
                                        {tier.limit != null && (
                                          <span className="text-[9px] text-gray-600 uppercase tracking-widest">
                                            {tier.limit} slots
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
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
                              )}

                              {/* Progress bar */}
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span
                                    style={{
                                      color:
                                        pct >= 90
                                          ? "#FF3333"
                                          : "rgba(255,255,255,0.4)",
                                    }}
                                  >
                                    {pct}% sold
                                  </span>
                                  {pct >= 95 && (
                                    <span className="text-[#FF3333] font-semibold">
                                      {Math.round(((ev.totalTickets - sold) / ev.totalTickets) * 100)}% remaining
                                    </span>
                                  )}
                                </div>
                                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{
                                      width: `${pct}%`,
                                      background:
                                        pct >= 90 ? "#FF3333" : "#FFFF00",
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Get Tickets button — always visible */}
                        <motion.button
                          disabled={soldOut}
                          onClick={() => !soldOut && setTicketEvent(ev)}
                          className="mt-auto w-full sm:w-auto px-8 py-3 rounded-full font-bold uppercase tracking-widest text-sm shrink-0"
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
                          {soldOut ? "Sold Out" : "Buy Tickets →"}
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>
        </SectionFadeIn>
      )}

      {!loading && activeEvents.length > 0 && <NeonMarquee />}
      {/* ── WHAT TO EXPECT Carousel ── */}
      {/* ── PAST EDITIONS Carousel (from Firebase) ── */}
      {!loading && pastEvents.length > 0 && (
        <SectionFadeIn>
          <section className="relative z-10 py-20 px-6 md:px-16 bg-black/85 border-t border-white/5">
            <div className="max-w-4xl mx-auto">
              <Carousel
                title="Past Events"
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
                      <Link
                        href={`/gallery?event=${ev.id}`}
                        className="relative rounded-2xl border overflow-hidden mx-2 flex flex-col md:flex-row group cursor-pointer"
                        style={{
                          borderColor: "rgba(255,51,51,0.3)",
                          boxShadow: "0 0 30px rgba(255,51,51,0.08)",
                          background:
                            "linear-gradient(135deg, #090909, #040404)",
                        }}
                      >
                        {/* Corner accents */}
                        <span
                          className="absolute top-0 left-0 w-8 h-8 z-10"
                          style={{
                            borderTop: "2px solid #FF3333",
                            borderLeft: "2px solid #FF3333",
                          }}
                        />
                        <span
                          className="absolute bottom-0 right-0 w-8 h-8 z-10"
                          style={{
                            borderBottom: "2px solid #FF3333",
                            borderRight: "2px solid #FF3333",
                          }}
                        />

                        {/* Image — natural dimensions, card sizes to the image */}
                        <div className="relative w-full md:w-2/5 lg:w-[45%] shrink-0 overflow-hidden">
                          {ev.imageUrl ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={ev.imageUrl}
                                alt={ev.title}
                                className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                              />
                              {/* Desktop: fade right edge into card */}
                              <div
                                className="absolute inset-0 hidden md:block"
                                style={{
                                  background:
                                    "linear-gradient(to right, transparent 55%, #090909 100%)",
                                }}
                              />
                            </>
                          ) : (
                            <div
                              className="w-full min-h-[200px]"
                              style={{
                                background:
                                  "radial-gradient(ellipse at center, rgba(255,51,51,0.12), #030303)",
                              }}
                            />
                          )}
                        </div>

                        {/* Content panel */}
                        <div className="flex-1 flex flex-col gap-3 p-6 md:p-8">
                          <div>
                            <p
                              className="text-xs tracking-[0.4em] uppercase mb-1"
                              style={{ color: "#FF3333" }}
                            >
                              {evDate}
                            </p>
                            <h3
                              className="text-2xl md:text-3xl font-bold uppercase tracking-wide"
                              style={{
                                color: "#FF3333",
                                textShadow: "0 0 20px rgba(255,51,51,0.5)",
                              }}
                            >
                              {ev.edition}
                            </h3>
                            <p className="text-gray-400 text-sm mt-0.5 flex items-center gap-1 tracking-widest">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />{" "}
                              {ev.venue}
                            </p>
                          </div>
                          <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">
                            {ev.description}
                          </p>
                          <div
                            className="flex items-center gap-1.5 text-xs mt-auto"
                            style={{ color: "#FF3333" }}
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span className="uppercase tracking-widest font-semibold">
                              View Gallery →
                            </span>
                          </div>
                        </div>
                      </Link>
                    ),
                  };
                })}
              />
            </div>
          </section>
        </SectionFadeIn>
      )}
      <NeonMarquee />

      <SectionFadeIn>
        <section className="relative z-10 pt-10 pb-5 px-6 md:px-16 bg-black/75">
          <div className="max-w-3xl mx-auto">
            <Carousel
              title="What to Expect"
              accentColor="#00FF41"
              glowColor="rgba(0,255,65,0.4)"
              autoPlayInterval={4000}
              items={highlights.map((h, idx) => ({
                id: h.id,
                content: (
                  <div
                    className="rounded-xl border overflow-hidden relative mx-2 h-[30vh]"
                    style={{ borderColor: `${h.color}30` }}
                  >
                    {/* Background image — use real gallery photo when available */}
                    <div className="absolute inset-0">
                      <img
                        src={galleryPhotoUrls[idx] ?? h.imageUrl}
                        alt={h.title}
                        className="w-full h-full object-cover"
                      />
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.82) 60%, rgba(0,0,0,0.95) 100%)`,
                        }}
                      />
                      {/* Neon color tint overlay */}
                      <div
                        className="absolute inset-0"
                        style={{ background: `${h.color}0a` }}
                      />
                    </div>

                    {/* Content */}
                    <div className="relative z-10 p-8 text-center">
                      <div
                        className="mb-4"
                        style={{
                          color: h.color,
                          filter: `drop-shadow(0 0 12px ${h.color}cc)`,
                        }}
                      >
                        {h.icon}
                      </div>
                      <h3
                        className="text-2xl font-bold uppercase tracking-wide mb-3"
                        style={{
                          color: h.color,
                          textShadow: `0 0 20px ${h.color}80`,
                        }}
                      >
                        {h.title}
                      </h3>
                      <p className="text-gray-300 text-base leading-relaxed max-w-sm mx-auto">
                        {h.desc}
                      </p>
                    </div>
                  </div>
                ),
              }))}
            />
          </div>
        </section>
      </SectionFadeIn>
      <NeonMarquee />

      {/* ── TESTIMONIALS (live from Firestore) ── */}
      <SectionFadeIn>
        <section className="relative z-10 pt-10 pb-5 px-6 md:px-16 bg-black/75 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <TestimonialSection
              title="What They Say"
              accentColor="#00FF41"
              showForm={true}
            />
          </div>
        </section>
      </SectionFadeIn>
      <NeonMarquee />

      {/* ── FAQ ── */}
      <SectionFadeIn>
        <section className="relative z-10 pt-10 pb-5 px-6 md:px-16 bg-black/75">
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
        <section className="relative z-10 pt-10 pb-5 px-6 text-center bg-black/90 border-t border-white/5">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2
              className="text-3xl sm:text-5xl font-bold uppercase tracking-wider"
              style={{
                color: "#FFFF00",
                textShadow: "0 0 30px rgba(255,255,0,0.5)",
              }}
            >
              Don&apos;t Miss {activeEvents[0]?.title ?? "The Next Edition"}
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
      <NeonMarquee />

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
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
