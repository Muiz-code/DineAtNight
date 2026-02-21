"use client";

import Loader from "../../_components/loader";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Images } from "@/assets/images";
import {
  animate,
  motion,
  useInView,
  useScroll,
  useTransform,
} from "framer-motion";
import VendorModal from "../../_components/VendorModal";
import Antigravity from "@/components/Antigravity";
import TestimonialSection from "../../_components/TestimonialSection";
import {
  getActiveEvents,
  getApprovedVendors,
  type DanSponsor,
  type DanEvent,
  type DanVendor,
} from "@/lib/firestore";
import { Camera, CalendarDays, MapPin } from "lucide-react";

/* ═══════════════════════════════════════════════
   Motion Variants
═══════════════════════════════════════════════ */
const glowPulse = {
  animate: {
    filter: [
      "drop-shadow(0 0 20px rgba(255,255,0,0.5))",
      "drop-shadow(0 0 55px rgba(255,255,0,1))",
      "drop-shadow(0 0 20px rgba(255,255,0,0.5))",
    ],
    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" as const },
  },
};

/* ═══════════════════════════════════════════════
   Neon Button
═══════════════════════════════════════════════ */
const NeonButton = ({
  children,
  color = "#fff",
  glowColor,
  delay = 0,
  onClick,
}: {
  children: React.ReactNode;
  color?: string;
  glowColor: string;
  delay?: number;
  onClick?: () => void;
}) => (
  <motion.button
    onClick={onClick}
    className="relative w-full sm:w-auto px-8 py-4 sm:py-3 text-base font-semibold bg-transparent rounded-full uppercase tracking-widest group overflow-hidden cursor-pointer"
    style={{
      border: `2px solid ${glowColor}`,
      color,
      textShadow: `0 0 10px ${glowColor}`,
      boxShadow: `0 0 15px ${glowColor}, inset 0 0 15px ${glowColor}20`,
    }}
    whileHover={{
      boxShadow: `0 0 35px ${glowColor}, 0 0 70px ${glowColor}, inset 0 0 35px ${glowColor}40`,
      scale: 1.04,
    }}
    animate={{
      boxShadow: [
        `0 0 15px ${glowColor}, inset 0 0 15px ${glowColor}20`,
        `0 0 28px ${glowColor}, inset 0 0 20px ${glowColor}35`,
        `0 0 15px ${glowColor}, inset 0 0 15px ${glowColor}20`,
      ],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut" as const,
      delay,
    }}
  >
    <span
      className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
      style={{ backgroundColor: glowColor }}
    />
    <span className="relative z-10">{children}</span>
  </motion.button>
);

/* ═══════════════════════════════════════════════
   Video Card
═══════════════════════════════════════════════ */
const VideoCard = ({
  src,
  color,
  glowColor,
  isPlaying,
  onPlay,
}: {
  src: string;
  color: string;
  glowColor: string;
  isPlaying: boolean;
  onPlay: () => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  return (
    <motion.div
      className="relative group rounded-xl overflow-hidden border border-white/10 bg-black/50 aspect-video cursor-pointer"
      whileHover={{
        scale: 1.04,
        borderColor: color,
        boxShadow: `0 0 30px ${glowColor}`,
      }}
      onClick={onPlay}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        loop
        playsInline
      >
        <source src={src} type="video/mp4" />
      </video>

      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
          isPlaying
            ? "opacity-0 group-hover:opacity-100 bg-black/20"
            : "bg-black/45"
        }`}
      >
        <div
          className="w-16 h-16 rounded-full border-2 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110"
          style={{ borderColor: color, boxShadow: `0 0 18px ${glowColor}` }}
        >
          {isPlaying ? (
            <div className="flex gap-1.5">
              <div
                className="w-1.5 h-5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <div
                className="w-1.5 h-5 rounded-full"
                style={{ backgroundColor: color }}
              />
            </div>
          ) : (
            <div
              className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-b-[10px] border-b-transparent ml-1"
              style={{ borderLeftColor: color }}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════
   Animated Counter
═══════════════════════════════════════════════ */
const Counter = ({
  value,
  suffix = "",
}: {
  value: number;
  suffix?: string;
  color: string;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-20px" });

  useEffect(() => {
    if (isInView && ref.current) {
      const controls = animate(0, value, {
        duration: 2.5,
        ease: "easeOut",
        onUpdate(v) {
          if (ref.current) {
            ref.current.textContent = Math.floor(v).toLocaleString() + suffix;
          }
        },
      });
      return () => controls.stop();
    }
  }, [value, suffix, isInView]);

  return <span ref={ref} />;
};

/* ═══════════════════════════════════════════════
   Section Fade-In Wrapper
═══════════════════════════════════════════════ */
const SectionFadeIn = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════
   Vendor Image Slideshow
═══════════════════════════════════════════════ */
function VendorImageSlideshow({
  images,
  alt,
  palette,
}: {
  images: string[];
  alt: string;
  palette: { color: string; glow: string };
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % images.length), 3500);
    return () => clearInterval(t);
  }, [images.length]);

  return (
    <div className="relative h-52 overflow-hidden">
      {images.length > 0 ? (
        images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src + i}
            src={src}
            alt={`${alt} ${i + 1}`}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
            style={{ opacity: i === idx ? 1 : 0 }}
          />
        ))
      ) : (
        <div
          className="w-full h-full"
          style={{
            background: `radial-gradient(ellipse at center, ${palette.color}15, #030303)`,
          }}
        />
      )}
      <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition-colors duration-500" />
      <span
        className="absolute top-0 left-0 w-6 h-6"
        style={{
          borderTop: `2px solid ${palette.color}`,
          borderLeft: `2px solid ${palette.color}`,
        }}
      />
      <span
        className="absolute bottom-0 right-0 w-6 h-6"
        style={{
          borderBottom: `2px solid ${palette.color}`,
          borderRight: `2px solid ${palette.color}`,
        }}
      />
      {images.length > 1 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setIdx(i);
              }}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === idx ? "16px" : "6px",
                height: "6px",
                background:
                  i === idx ? palette.color : "rgba(255,255,255,0.35)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Data
═══════════════════════════════════════════════ */
const videos = [
  {
    src: "https://res.cloudinary.com/dhhvxjczm/video/upload/v1771177374/dine_at_nightV_z3tk7p.mp4",
    color: "#FFFF00",
    glow: "rgba(255,255,0,0.5)",
  },
  {
    src: "https://res.cloudinary.com/dhhvxjczm/video/upload/v1771179581/dine_at_nightV2_kfirxq.mp4",
    color: "#FF3333",
    glow: "rgba(255,51,51,0.5)",
  },
  {
    src: "https://res.cloudinary.com/dhhvxjczm/video/upload/v1771177374/dine_at_nightV_z3tk7p.mp4",
    color: "#00FF41",
    glow: "rgba(0,255,65,0.5)",
  },
];

// Accent palette for vendor cards
const VENDOR_PALETTE = [
  { color: "#FFFF00", glow: "rgba(255,255,0,0.5)" },
  { color: "#FF3333", glow: "rgba(255,51,51,0.5)" },
  { color: "#00FF41", glow: "rgba(0,255,65,0.5)" },
];

// Get all category strings for a vendor
const vendorCategoryList = (v: DanVendor): string[] =>
  v.categories?.length ? v.categories : v.category ? [v.category] : [];

// Sponsor accent colors — cycled by index
const SPONSOR_COLORS = [
  { color: "#FFFF00", glow: "rgba(255,255,0,0.5)" },
  { color: "#00FF41", glow: "rgba(0,255,65,0.5)" },
  { color: "#FF3333", glow: "rgba(255,51,51,0.5)" },
  { color: "#FFFF00", glow: "rgba(255,255,0,0.5)" },
];

// Real stats from the first edition — all verified in the brief
const stats = [
  {
    label: "Tickets Sold",
    value: 850,
    suffix: "+",
    color: "#FFFF00",
    glow: "rgba(255,255,0,0.25)",
  },
  {
    label: "Vendors Sold Out",
    value: 90,
    suffix: "%",
    color: "#FF3333",
    glow: "rgba(255,51,51,0.25)",
  },
  {
    label: "Vendor Return Rate",
    value: 100,
    suffix: "%",
    color: "#00FF41",
    glow: "rgba(0,255,65,0.25)",
  },
];

const formatFollowers = (count: number) => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M+`;
  if (count >= 1_000) return `${Math.round(count / 100) / 10}K+`;
  return `${count}`;
};

/* ═══════════════════════════════════════════════
   Page Component
═══════════════════════════════════════════════ */
export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [followers, setFollowers] = useState<string | null>(null);
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [eventSponsors, setEventSponsors] = useState<DanSponsor[]>([]);
  const [activeEvents, setActiveEvents] = useState<DanEvent[]>([]);
  const [approvedVendors, setApprovedVendors] = useState<DanVendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [vendorsError, setVendorsError] = useState(false);
  const { logo } = Images();

  // Parallax transforms — logo moves up slower than the page
  const { scrollY } = useScroll();
  const logoY = useTransform(scrollY, [0, 500], [0, -70]);
  const tagY = useTransform(scrollY, [0, 500], [0, -35]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    getActiveEvents()
      .then((evs) => {
        setActiveEvents(evs);
        const sponsors = evs[0]?.sponsors ?? [];
        if (sponsors.length > 0) setEventSponsors(sponsors);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    getApprovedVendors()
      .then((data) => {
        // Pick 3 at random — different on every page load
        const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, 3);
        setApprovedVendors(shuffled);
        setVendorsError(false);
      })
      .catch(() => {
        setApprovedVendors([]);
        setVendorsError(true);
      })
      .finally(() => setVendorsLoading(false));
  }, []);

  useEffect(() => {
    /*
     * ────────────────────────────────────────────────────────────
     * API NEEDED: Instagram Followers Count
     * ────────────────────────────────────────────────────────────
     * 1. Add to .env.local:
     *      IG_ACCESS_TOKEN=<long-lived token from Meta developer console>
     *      IG_USER_ID=<your Instagram user ID>
     * 2. Activate the fetch in /app/api/ig-followers/route.ts
     * 3. This useEffect will automatically pick up the live count
     * ────────────────────────────────────────────────────────────
     */
    // const loadFollowers = async () => {
    //   try {
    //     const res = await fetch("/api/ig-followers");
    //     if (!res.ok) return;
    //     const data = await res.json();
    //     if (data?.followers) {
    //       setFollowers(formatFollowers(Number(data.followers)));
    //     }
    //   } catch {
    //     // silently fail — fallback shown below
    //   }
    // };
    // loadFollowers();
  }, []);

  if (isLoading) return <Loader />;

  return (
    <div className="relative w-full bg-black overflow-x-hidden overflow-y-hidden">
      {/* Fixed Particle Background */}
      <div className="fixed inset-0 z-0 w-full">
        <Antigravity color="#00FF41" />
      </div>

      {/* ──────────────────────────────────────────
          HERO  — pointer-events-none lets Antigravity
          particles respond to touch/mouse through the overlay.
          Interactive children override with pointer-events-auto.
         ────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[100svh] px-4 sm:px-6 text-center bg-black/55 pointer-events-none">
        {/* Logo — no hover effect, pure parallax display */}
        <motion.div
          style={{ y: logoY }}
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        >
          <motion.div variants={glowPulse} animate="animate">
            <Image
              src={logo}
              alt="Dine At Night Logo"
              width={280}
              height={280}
              className="w-32 h-32 sm:w-44 sm:h-44 md:w-60 md:h-60 lg:w-72 lg:h-72 object-contain select-none"
              priority
              draggable={false}
            />
          </motion.div>
        </motion.div>

        {/* Taglines — parallax at half the logo speed */}
        <motion.div
          style={{ y: tagY }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
          className="mt-6 sm:mt-8 space-y-3 sm:space-y-4 px-2"
        >
          <h1
            className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold tracking-wide uppercase leading-tight"
            style={{ color: "#00FF41" }}
          >
            Lagos&apos; First Night Food Market
          </h1>

          {/* Secondary — neon red for 3-colour contrast vs yellow + green particles */}
          <motion.p
            className="text-sm sm:text-xl md:text-2xl tracking-widest italic"
            style={{ color: "#FF3333" }}
            animate={{
              textShadow: [
                "0 0 12px rgba(255,51,51,0.6), 0 0 24px rgba(255,51,51,0.3)",
                "0 0 22px rgba(255,51,51,1),   0 0 45px rgba(255,51,51,0.5)",
                "0 0 12px rgba(255,51,51,0.6), 0 0 24px rgba(255,51,51,0.3)",
              ],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
          >
            For Those Who Dine After Dark
          </motion.p>
        </motion.div>

        {/* CTA Buttons — pointer-events-auto so they're tappable */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.65, ease: "easeOut" }}
          className="mt-10 sm:mt-14 flex flex-col sm:flex-row gap-3 sm:gap-5 w-full sm:w-auto px-6 sm:px-0 pointer-events-auto"
        >
          <Link href="/event" className="w-full sm:w-auto">
            <NeonButton
              color="#FFFF00"
              glowColor="rgba(255,255,0,0.65)"
              delay={0}
            >
              Get Tickets
            </NeonButton>
          </Link>

          {/* Opens vendor application modal */}
          <NeonButton
            color="#fff"
            glowColor="rgba(255,51,51,0.65)"
            delay={0.25}
            onClick={() => setVendorModalOpen(true)}
          >
            Become a Vendor
          </NeonButton>

          <Link href="/shop" className="w-full sm:w-auto">
            <NeonButton
              color="#00FF41"
              glowColor="rgba(0,255,65,0.65)"
              delay={0.5}
            >
              Get Merch
            </NeonButton>
          </Link>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
        >
          <motion.div
            className="w-px h-8 sm:h-10 rounded-full"
            style={{
              background:
                "linear-gradient(to bottom, rgba(255,255,0,0.8), transparent)",
            }}
            animate={{ scaleY: [1, 0.4, 1], opacity: [0.8, 0.3, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-[9px] sm:text-[10px] tracking-[0.3em] text-gray-600 uppercase">
            Scroll
          </span>
        </motion.div>
      </section>

      {/* ──────────────────────────────────────────
          STATS  (real numbers from Edition 1)
         ────────────────────────────────────────── */}
      <SectionFadeIn>
        <section className="relative z-10 px-4 sm:px-8 lg:px-24 py-14 bg-black/88">
          <div className="max-w-5xl mx-auto grid grid-cols-2 gap-5">
            {stats.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-[#0e0e0e] to-[#040404] px-6 py-10 text-center"
                style={{
                  borderColor: item.color,
                  boxShadow: `0 0 25px ${item.glow}, inset 0 0 25px ${item.glow}`,
                }}
              >
                <div
                  className="text-5xl md:text-6xl font-bold"
                  style={{
                    color: item.color,
                    textShadow: `0 0 20px ${item.color}`,
                  }}
                >
                  <Counter
                    value={item.value}
                    suffix={item.suffix}
                    color={item.color}
                  />
                </div>
                <div className="mt-3 text-gray-400 text-sm tracking-widest uppercase">
                  {item.label}
                </div>
              </motion.div>
            ))}

            {/* 4th stat: IG followers (live when API is connected) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.38, duration: 0.5 }}
              className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-[#0e0e0e] to-[#040404] px-6 py-10 text-center"
              style={{
                borderColor: "#FFFF00",
                boxShadow:
                  "0 0 25px rgba(255,255,0,0.25), inset 0 0 25px rgba(255,255,0,0.1)",
              }}
            >
              <div
                className="text-5xl md:text-6xl font-bold"
                style={{ color: "#FFFF00", textShadow: "0 0 20px #FFFF00" }}
              >
                {followers ?? "20K+"}
              </div>
              <div className="mt-3 text-gray-400 text-sm tracking-widest uppercase">
                Instagram Followers
              </div>
            </motion.div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ──────────────────────────────────────────
          UPCOMING EVENT HIGHLIGHT
         ────────────────────────────────────────── */}
      {activeEvents.length > 0 && (
        <SectionFadeIn>
          <section className="relative z-10 pt-10 pb-5 px-6 md:px-16 bg-black/85">
            <div className="max-w-5xl mx-auto">
              <motion.h2
                className="text-4xl md:text-6xl uppercase tracking-wider text-center mb-4"
                style={{
                  color: "transparent",
                  WebkitTextStroke: "2px #FFFF00",
                  textShadow:
                    "0 0 20px rgba(255,255,0,0.5), 0 0 45px rgba(255,255,0,0.3)",
                }}
              >
                Upcoming Events
              </motion.h2>
              <p className="text-gray-500 text-center text-base tracking-widest uppercase mb-12">
                Secure your spot before it sells out
              </p>

              <div className="space-y-6 md:flex md:flex-row flex-col gap-10 justify">
                {activeEvents.map((ev, i) => {
                  const accentColors = ["#FFFF00", "#FF3333", "#00FF41"];
                  const accentGlows = [
                    "rgba(255,255,0,0.5)",
                    "rgba(255,51,51,0.5)",
                    "rgba(0,255,65,0.5)",
                  ];
                  const c = accentColors[i % accentColors.length];
                  const g = accentGlows[i % accentGlows.length];
                  const evDate = ev.date?.toDate();
                  const dateStr = evDate
                    ? evDate.toLocaleDateString("en-NG", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Date TBA";
                  const timeStr = evDate
                    ? evDate.toLocaleTimeString("en-NG", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                    : "";
                  const remaining = Math.max(
                    0,
                    ev.totalTickets - ev.soldTickets,
                  );
                  const soldPct =
                    ev.totalTickets > 0
                      ? Math.min(
                          100,
                          Math.round((ev.soldTickets / ev.totalTickets) * 100),
                        )
                      : 0;

                  return (
                    <motion.div
                      key={ev.id}
                      className="relative rounded-2xl border overflow-hidden md:h-[50vh] "
                      style={{
                        borderColor: `${c}40`,
                        boxShadow: `0 0 40px ${g}15`,
                        background: "linear-gradient(135deg, #080808, #030303)",
                      }}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1, duration: 0.6 }}
                    >
                      {/* Event image banner */}
                      {ev.imageUrl && (
                        <div className="relative h-48 sm:h-56 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ev.imageUrl}
                            alt={ev.title}
                            className="w-full h-full object-cover"
                          />
                          <div
                            className="absolute inset-0"
                            style={{
                              background:
                                "linear-gradient(to bottom, transparent 40%, #080808 100%)",
                            }}
                          />
                        </div>
                      )}

                      {/* Corner accents */}
                      <span
                        className="absolute top-0 left-0 w-10 h-10 pointer-events-none"
                        style={{
                          borderTop: `2px solid ${c}`,
                          borderLeft: `2px solid ${c}`,
                        }}
                      />
                      <span
                        className="absolute bottom-0 right-0 w-10 h-10 pointer-events-none"
                        style={{
                          borderBottom: `2px solid ${c}`,
                          borderRight: `2px solid ${c}`,
                        }}
                      />

                      <div className="p-6 md:p-8 grid md:grid-cols-[1fr_auto] gap-6 items-center">
                        {/* Left: event info */}
                        <div className="space-y-4">
                          <h3
                            className="text-2xl md:text-4xl font-bold uppercase tracking-wide"
                            style={{ color: c, textShadow: `0 0 20px ${g}` }}
                          >
                            {ev.title}
                          </h3>

                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                              <CalendarDays
                                className="w-4 h-4 flex-shrink-0"
                                style={{ color: c }}
                              />
                              <span>
                                {dateStr}
                                {timeStr && ` · ${timeStr}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                              <MapPin
                                className="w-4 h-4 flex-shrink-0"
                                style={{ color: c }}
                              />
                              <span>{ev.venue}</span>
                            </div>
                          </div>

                          {/* Sold-out progress bar */}
                          <div className="space-y-1.5 max-w-sm">
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>
                                {remaining > 0
                                  ? `${remaining.toLocaleString()} ticket${remaining === 1 ? "" : "s"} left`
                                  : "Sold out"}
                              </span>
                              <span>{soldPct}% sold</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${soldPct}%`,
                                  background: c,
                                  boxShadow: `0 0 8px ${g}`,
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Right: price + CTA */}
                        <div className="flex flex-col items-start md:items-end gap-4">
                          <div className="md:text-right">
                            <p className="text-gray-600 text-xs uppercase tracking-widest">
                              From
                            </p>
                            <p
                              className="text-3xl font-bold"
                              style={{ color: c, textShadow: `0 0 15px ${g}` }}
                            >
                              ₦{ev.ticketPrice.toLocaleString("en-NG")}
                            </p>
                          </div>
                          <Link href="/event" className="pointer-events-auto">
                            <motion.button
                              className="px-6 py-3 rounded-full font-bold uppercase tracking-widest text-sm"
                              style={{
                                background: c,
                                color: "#000",
                                boxShadow: `0 0 20px ${g}`,
                              }}
                              whileHover={{
                                scale: 1.04,
                                boxShadow: `0 0 35px ${g}`,
                              }}
                              whileTap={{ scale: 0.97 }}
                            >
                              Get Tickets →
                            </motion.button>
                          </Link>
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

      {/* ──────────────────────────────────────────
          WHAT IS DINE AT NIGHT?
         ────────────────────────────────────────── */}
      <SectionFadeIn>
        <section className="relative z-10 pt-10 pb-5 px-6 md:px-24 bg-black/80">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <motion.h2
              className="text-4xl md:text-6xl uppercase tracking-wider"
              style={{
                color: "transparent",
                WebkitTextStroke: "2px #FFFF00",
                textShadow:
                  "0 0 20px rgba(255,255,0,0.5), 0 0 45px rgba(255,255,0,0.3)",
              }}
            >
              What Is Dine At Night?
            </motion.h2>

            <p className="text-lg md:text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto">
              Dine At Night is Lagos after dark — a vibrant nighttime food
              market where the city&apos;s best chefs, street food vendors,
              music, and community come together under neon lights.
            </p>

            <motion.p
              className="text-xl md:text-2xl font-semibold italic"
              style={{
                color: "#FF3333",
                textShadow: "0 0 15px rgba(255,51,51,0.6)",
              }}
            >
              It&apos;s more than a food event. It&apos;s an experience.
            </motion.p>

            {/* Video Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12 w-full pointer-events-auto">
              {videos.map((video, i) => (
                <VideoCard
                  key={i}
                  src={video.src}
                  color={video.color}
                  glowColor={video.glow}
                  isPlaying={playingIndex === i}
                  onPlay={() => setPlayingIndex(playingIndex === i ? null : i)}
                />
              ))}
            </div>

            {/* Neon divider */}
            <div className="flex items-center justify-center gap-3 pt-4">
              <span
                className="block h-px flex-1 max-w-25"
                style={{
                  background: "linear-gradient(90deg, transparent, #FF3333)",
                  boxShadow: "0 0 10px rgba(255,51,51,0.6)",
                }}
              />
              <span
                className="block w-2 h-2 rounded-full"
                style={{
                  backgroundColor: "#FFFF00",
                  boxShadow:
                    "0 0 12px rgba(255,255,0,0.9), 0 0 24px rgba(255,255,0,0.5)",
                }}
              />
              <span
                className="block h-px flex-1 max-w-25"
                style={{
                  background: "linear-gradient(90deg, #FF3333, transparent)",
                  boxShadow: "0 0 10px rgba(255,51,51,0.6)",
                }}
              />
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ──────────────────────────────────────────
          VENDORS PREVIEW
         ────────────────────────────────────────── */}
      <SectionFadeIn>
        <section className="relative z-10 pt-10 pb-5 px-6 md:px-16 bg-black/70 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            <motion.h2
              className="text-4xl md:text-6xl uppercase tracking-wider text-center mb-12"
              style={{
                color: "transparent",
                WebkitTextStroke: "2px #FF3333",
                textShadow:
                  "0 0 20px rgba(255,51,51,0.5), 0 0 45px rgba(255,51,51,0.3)",
              }}
            >
              Our Vendors
            </motion.h2>

            {vendorsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl overflow-hidden border border-white/5 animate-pulse"
                  >
                    <div className="h-52 bg-white/5" />
                    <div className="p-5 bg-[#070707] space-y-3">
                      <div className="h-5 w-2/3 bg-white/5 rounded" />
                      <div className="h-3 w-1/3 bg-white/5 rounded" />
                      <div className="h-4 w-full bg-white/5 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : vendorsError ? (
              <p className="text-gray-700 text-center text-sm tracking-widest uppercase py-16">
                Couldn&apos;t load vendors — check Firestore rules for the
                vendors collection
              </p>
            ) : approvedVendors.length === 0 ? (
              <p className="text-gray-700 text-center text-sm tracking-widest uppercase py-16">
                Vendor lineup dropping soon — stay tuned
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {approvedVendors.map((vendor, i) => {
                  const palette = VENDOR_PALETTE[i % VENDOR_PALETTE.length];
                  return (
                    <motion.div
                      key={vendor.id ?? vendor.brandName}
                      className="relative group rounded-2xl overflow-hidden border"
                      style={{
                        borderColor: `${palette.color}25`,
                        boxShadow: `0 0 15px ${palette.glow}10`,
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                      whileHover={{
                        borderColor: palette.color,
                        boxShadow: `0 0 35px ${palette.glow}`,
                      }}
                    >
                      <VendorImageSlideshow
                        images={
                          vendor.imageUrls?.length
                            ? vendor.imageUrls
                            : vendor.imageUrl
                              ? [vendor.imageUrl]
                              : []
                        }
                        alt={vendor.brandName}
                        palette={palette}
                      />
                      <div className="p-5 bg-[#070707]">
                        <h3
                          className="text-xl font-bold uppercase tracking-wide"
                          style={{
                            color: palette.color,
                            textShadow: `0 0 12px ${palette.glow}`,
                          }}
                        >
                          {vendor.brandName}
                        </h3>
                        <div className="flex flex-wrap gap-1.5 mt-1.5 mb-3">
                          {vendorCategoryList(vendor).map((cat) => (
                            <span
                              key={cat}
                              className="text-[9px] px-2 py-0.5 rounded-full border uppercase tracking-wide font-bold"
                              style={{
                                borderColor: `${palette.color}35`,
                                color: `${palette.color}90`,
                              }}
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">
                          {vendor.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-center mt-12 pointer-events-auto">
              <Link href="/vendors">
                <NeonButton color="#FF3333" glowColor="rgba(255,51,51,0.55)">
                  See All Vendors →
                </NeonButton>
              </Link>
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ──────────────────────────────────────────
          TESTIMONIALS (live from Firestore)
         ────────────────────────────────────────── */}
      <SectionFadeIn>
        <section className="relative z-10 pt-10 pb-5 px-6 md:px-16 bg-black/82">
          <div className="max-w-5xl mx-auto pointer-events-auto">
            <TestimonialSection
              title="What People Say"
              accentColor="#00FF41"
              showForm={true}
            />
          </div>
        </section>
      </SectionFadeIn>

      {/* ──────────────────────────────────────────
          SPONSORS & PARTNERS
         ────────────────────────────────────────── */}
      <SectionFadeIn>
        <section className="relative z-10 pt-10 pb-5 px-6 md:px-16 bg-black/80">
          <div className="max-w-5xl mx-auto text-center">
            <motion.h2
              className="text-4xl md:text-6xl uppercase tracking-wider mb-4"
              style={{
                color: "transparent",
                WebkitTextStroke: "2px #00FF41",
                textShadow:
                  "0 0 20px rgba(0,255,65,0.5), 0 0 45px rgba(0,255,65,0.3)",
              }}
            >
              Sponsors & Partners
            </motion.h2>
            <p className="text-gray-500 mb-14 text-base tracking-widest uppercase">
              Proudly supported by
            </p>

            {eventSponsors.length === 0 ? (
              <p className="text-gray-700 text-sm text-center tracking-widest uppercase">
                Sponsor announcements coming soon
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center">
                {eventSponsors.map((sponsor, i) => {
                  const accent = SPONSOR_COLORS[i % SPONSOR_COLORS.length];
                  return (
                    <motion.div
                      key={sponsor.name}
                      className="pointer-events-auto"
                      initial={{ opacity: 0, scale: 0.85 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.12, duration: 0.5 }}
                      whileHover={{ scale: 1.06 }}
                    >
                      <div
                        className="w-40 h-24 md:w-48 md:h-28 flex items-center justify-center rounded-lg overflow-hidden p-3"
                        style={{
                          border: `1.5px solid ${accent.color}`,
                          boxShadow: `0 0 20px ${accent.glow}, inset 0 0 15px ${accent.glow}20`,
                        }}
                      >
                        {sponsor.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={sponsor.logoUrl}
                            alt={sponsor.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span
                            className="text-lg md:text-xl font-bold uppercase tracking-wider"
                            style={{
                              color: accent.color,
                              textShadow: `0 0 20px ${accent.glow}`,
                            }}
                          >
                            {sponsor.name}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </SectionFadeIn>

      {/* ──────────────────────────────────────────
          INSTAGRAM FEED
          ─────────────────────────────────────────
          API INTEGRATION NEEDED:
          1. Instagram Graph API for live feed posts:
               GET /me/media?fields=id,media_type,media_url,permalink
               &access_token={IG_ACCESS_TOKEN}
          2. Add to .env.local:
               IG_ACCESS_TOKEN=<your long-lived token>
               IG_USER_ID=<your user ID>
          3. Activate /app/api/ig-followers/route.ts
          4. Create /app/api/ig-feed/route.ts to return post data
          5. Replace the placeholder grid below with real <Image> posts
          ────────────────────────────────────────── */}
      <SectionFadeIn>
        <section className="relative z-10pt-10 pb-5 px-6 md:px-16 bg-black/75">
          <div className="max-w-6xl mx-auto text-center">
            <motion.h2
              className="text-4xl md:text-6xl uppercase tracking-wider mb-3"
              style={{
                color: "transparent",
                WebkitTextStroke: "2px #FFFF00",
                textShadow: "0 0 25px rgba(255,255,0,0.5)",
              }}
            >
              Follow The Night
            </motion.h2>
            <p className="text-gray-500 text-base tracking-widest uppercase mb-12">
              @dineatnight.ng on Instagram
            </p>

            {/* Placeholder grid — replace with live posts once IG API is connected */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-12">
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="aspect-square bg-[#0a0a0a] border border-white/8 rounded-sm overflow-hidden flex items-center justify-center group cursor-pointer pointer-events-auto"
                  whileHover={{
                    borderColor: "#FFFF00",
                    boxShadow: "0 0 20px rgba(255,255,0,0.3)",
                  }}
                  initial={{ opacity: 0, scale: 0.88 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.4 }}
                >
                  <Camera className="w-6 h-6 text-gray-800 group-hover:text-gray-600 transition-colors duration-300" />
                </motion.div>
              ))}
            </div>

            <div className="pointer-events-auto flex justify-center">
              <a
                href="https://www.instagram.com/dineatnight.ng/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <NeonButton color="#FFFF00" glowColor="rgba(255,255,0,0.55)">
                  Follow @dineatnight.ng
                </NeonButton>
              </a>
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ──────────────────────────────────────────
          NEWSLETTER
          ─────────────────────────────────────────
          API INTEGRATION NEEDED:
          1. Mailchimp (or Loops / Resend / Brevo) for email collection
          2. Add to .env.local:
               MAILCHIMP_API_KEY=<key>
               MAILCHIMP_LIST_ID=<audience ID>
               MAILCHIMP_SERVER_PREFIX=us1 (or your data centre prefix)
          3. Create POST endpoint at /app/api/subscribe/route.ts
          4. Wire the form below to submit to that endpoint
          ────────────────────────────────────────── */}
      <SectionFadeIn>
        <section className="relative z-10 pt-10 pb-15 px-6 md:px-16 bg-black/80 border-t border-white/5">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <motion.h2
              className="text-3xl md:text-5xl font-bold uppercase tracking-wider"
              style={{
                color: "white",
                textShadow: "0 0 20px rgba(0,255,65,0.3)",
              }}
            >
              Don&apos;t Miss The Next Bite
            </motion.h2>
            <p className="text-gray-500 text-base">
              Join our community for exclusive updates, vendor reveals, and
              early bird tickets.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pointer-events-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="px-6 py-3 bg-white/5 border border-white/15 rounded-full text-white focus:outline-none focus:border-[#00FF41] focus:shadow-[0_0_20px_rgba(0,255,65,0.3)] transition-all w-full sm:w-80 placeholder:text-gray-700"
              />
              <NeonButton color="#00FF41" glowColor="rgba(0,255,65,0.55)">
                Subscribe
              </NeonButton>
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ──────────────────────────────────────────
          FOOTER
         ────────────────────────────────────────── */}
      <footer className="relative z-10 bg-black/95 border-t border-gray-800/60">
        <div className="max-w-6xl mx-auto px-6 md:px-16 py-16 grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div className="flex flex-col gap-5">
            <Image
              src={logo}
              alt="Dine At Night"
              width={80}
              height={80}
              className="object-contain"
            />
            <p className="text-gray-600 text-sm leading-relaxed max-w-xs">
              Lagos&apos; first nighttime food market. Where food meets culture
              under neon lights.
            </p>
            <p className="text-gray-700 text-xs">
              Powered by <span className="text-gray-500">Those Who Dine</span>
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4
              className="text-white font-bold uppercase tracking-[0.2em] mb-6 text-xs"
              style={{ textShadow: "0 0 10px rgba(255,255,0,0.3)" }}
            >
              Quick Links
            </h4>
            <ul className="space-y-3">
              {[
                { label: "Home", href: "/home" },
                { label: "Events", href: "/event" },
                { label: "Vendors", href: "/vendors" },
                { label: "About", href: "/aboutUs" },
                { label: "Shop", href: "/shop" },
                { label: "Gallery", href: "/gallery" },
                { label: "Contact", href: "/contact" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-500 hover:text-[#00FF41] transition-colors duration-300 text-sm tracking-wide"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4
              className="text-white font-bold uppercase tracking-[0.2em] mb-6 text-xs"
              style={{ textShadow: "0 0 10px rgba(0,255,65,0.3)" }}
            >
              Connect
            </h4>

            {/*
             * ASSET NEEDED: Replace "IG" / "TK" / "TW" text with proper
             * SVG icons or import from lucide-react once you decide on the
             * social platforms. Update the href values with real profile URLs.
             */}
            <div className="flex gap-3 mb-6">
              {[
                {
                  label: "Instagram",
                  icon: "IG",
                  href: "https://www.instagram.com/dineatnight.ng/",
                  color: "#FF3333",
                  glow: "rgba(255,51,51,0.5)",
                },
                {
                  label: "TikTok",
                  icon: "TK",
                  href: "https://tiktok.com/@dineatnight",
                  color: "#FFFF00",
                  glow: "rgba(255,255,0,0.5)",
                },
                {
                  label: "Twitter / X",
                  icon: "X",
                  href: "https://twitter.com/dineatnight",
                  color: "#00FF41",
                  glow: "rgba(0,255,65,0.5)",
                },
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-10 h-10 rounded-full border flex items-center justify-center text-xs font-bold tracking-wide transition-all duration-300"
                  style={{
                    borderColor: `${social.color}30`,
                    color: `${social.color}60`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor =
                      social.color;
                    (e.currentTarget as HTMLAnchorElement).style.color =
                      social.color;
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                      `0 0 18px ${social.glow}`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor =
                      `${social.color}30`;
                    (e.currentTarget as HTMLAnchorElement).style.color =
                      `${social.color}60`;
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                      "none";
                  }}
                >
                  {social.icon}
                </a>
              ))}
            </div>

            <div className="space-y-2">
              {/*
               * CONTENT NEEDED: Replace with actual contact email address.
               */}
              <p className="text-gray-600 text-sm">
                <span className="text-gray-700">General: </span>
                <a
                  href="mailto:hello@dineatnight.com"
                  className="hover:text-[#00FF41] transition-colors duration-300"
                >
                  hello@dineatnight.com
                </a>
              </p>
              <p className="text-gray-600 text-sm">
                <span className="text-gray-700">Sponsorship: </span>
                <a
                  href="mailto:sponsors@dineatnight.com"
                  className="hover:text-[#FFFF00] transition-colors duration-300"
                >
                  sponsors@dineatnight.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800/40 px-6 md:px-16 py-5">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-gray-700 text-xs">
              © 2026 Dine At Night. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a
                href="#"
                className="text-gray-700 hover:text-gray-500 text-xs transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="#"
                className="text-gray-700 hover:text-gray-500 text-xs transition-colors"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Vendor Application Modal */}
      <VendorModal
        isOpen={vendorModalOpen}
        onClose={() => setVendorModalOpen(false)}
      />
    </div>
  );
}
