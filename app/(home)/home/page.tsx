"use client";

import Loader from "../../_components/loader";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Images } from "@/assets/images";
import { animate, motion, useInView, useScroll, useTransform } from "framer-motion";
import VendorModal from "../../_components/VendorModal";
import Antigravity from "@/components/Antigravity";
import { getActiveEvents, type DanSponsor } from "@/lib/firestore";

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
              <div className="w-1.5 h-5 rounded-full" style={{ backgroundColor: color }} />
              <div className="w-1.5 h-5 rounded-full" style={{ backgroundColor: color }} />
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

// Vendors — swap Unsplash URLs for real vendor logo images from client
const vendors = [
  {
    name: "Suya Spot",
    type: "Grilled Meats",
    icon: "🔥",
    color: "#FFFF00",
    glow: "rgba(255,255,0,0.5)",
    image:
      "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "Jollof Wars",
    type: "Rice & Stews",
    icon: "🍚",
    color: "#FF3333",
    glow: "rgba(255,51,51,0.5)",
    image:
      "https://images.unsplash.com/photo-1604329760661-e71dc83f8f1a?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "Boli & Fish",
    type: "Street Food",
    icon: "🍌",
    color: "#00FF41",
    glow: "rgba(0,255,65,0.5)",
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "Puff Puff Palace",
    type: "Snacks & Desserts",
    icon: "🍩",
    color: "#FFFF00",
    glow: "rgba(255,255,0,0.5)",
    image:
      "https://images.unsplash.com/photo-1626015449066-133cc6114871?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "Asun Alley",
    type: "Peppered Goat",
    icon: "🌶️",
    color: "#FF3333",
    glow: "rgba(255,51,51,0.5)",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "Nkwobi Nights",
    type: "Delicacies",
    icon: "🥘",
    color: "#00FF41",
    glow: "rgba(0,255,65,0.5)",
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "Small Chops Co",
    type: "Finger Foods",
    icon: "🥟",
    color: "#FFFF00",
    glow: "rgba(255,255,0,0.5)",
    image:
      "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "Chapman Bar",
    type: "Drinks & Cocktails",
    icon: "🍹",
    color: "#FF3333",
    glow: "rgba(255,51,51,0.5)",
    image:
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=800&auto=format&fit=crop",
  },
];

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

// Vendor testimonials from the brief
const testimonials = [
  {
    quote:
      "The event was well coordinated. Considering it was the first edition, there was a large turnout which was effectively managed. The event organizers were very supportive — overall it was well put together.",
    author: "Norma",
    color: "#FFFF00",
    glow: "rgba(255,255,0,0.4)",
  },
  {
    quote:
      "DAT was a very welcome novel experience to the Lagos food festival scene. The organisers got the M.O. to the T!! Looking forward to future editions to not only participate but engage in the experience as well.",
    author: "Topsis Burger Lab",
    color: "#FF3333",
    glow: "rgba(255,51,51,0.4)",
  },
  {
    quote:
      "It was a super fun event — we loved how interactive it was, and how vendors had spotlights that allowed us to be included in the interactivity. Would be excited to work with the Dine At Night team again.",
    author: "Ensweet",
    color: "#00FF41",
    glow: "rgba(0,255,65,0.4)",
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
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [eventSponsors, setEventSponsors] = useState<DanSponsor[]>([]);
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
    getActiveEvents().then((evs) => {
      const sponsors = evs[0]?.sponsors ?? [];
      if (sponsors.length > 0) setEventSponsors(sponsors);
    }).catch(() => {});
  }, []);

  // Rotate testimonials every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
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
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
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
            <NeonButton color="#FFFF00" glowColor="rgba(255,255,0,0.65)" delay={0}>
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
            <NeonButton color="#00FF41" glowColor="rgba(0,255,65,0.65)" delay={0.5}>
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
            style={{ background: "linear-gradient(to bottom, rgba(255,255,0,0.8), transparent)" }}
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
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-5">
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
          </div>

          {/* 4th stat: IG followers (live when API is connected) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.38, duration: 0.5 }}
            className="max-w-5xl mx-auto mt-5"
          >
            <div
              className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-[#0e0e0e] to-[#040404] px-6 py-8 text-center"
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
                {/*
                 * API NEEDED: This displays the live Instagram follower count.
                 * Falls back to "20K+" until IG_ACCESS_TOKEN is added to .env.local
                 */}
                {followers ?? "20K+"}
              </div>
              <div className="mt-3 text-gray-400 text-sm tracking-widest uppercase">
                Instagram Followers
              </div>
            </div>
          </motion.div>
        </section>
      </SectionFadeIn>

      {/* ──────────────────────────────────────────
          WHAT IS DINE AT NIGHT?
         ────────────────────────────────────────── */}
      <SectionFadeIn>
        <section className="relative z-10 py-24 px-6 md:px-24 bg-black/80">
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
                  onPlay={() =>
                    setPlayingIndex(playingIndex === i ? null : i)
                  }
                />
              ))}
            </div>

            {/* Neon divider */}
            <div className="flex items-center justify-center gap-3 pt-4">
              <span
                className="block h-px flex-1 max-w-25"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, #FF3333)",
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
                  background:
                    "linear-gradient(90deg, #FF3333, transparent)",
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
        <section className="relative z-10 py-20 px-6 md:px-16 bg-black/70 overflow-x-hidden">
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

            {/* Horizontal scroll strip — overflow-x-hidden on section keeps it contained */}
            <div className="flex items-start gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide pointer-events-auto">
              {vendors.map((vendor, i) => (
                <motion.div
                  key={vendor.name}
                  className="shrink-0 w-64 md:w-72 snap-center group cursor-pointer"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.5 }}
                >
                  <div
                    className="relative h-80 rounded-lg overflow-hidden transition-all duration-300"
                    style={{
                      border: `2px solid ${vendor.color}`,
                      boxShadow: `0 0 15px ${vendor.glow}, inset 0 0 10px ${vendor.glow}20`,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 45px ${vendor.glow}, 0 0 90px ${vendor.glow}50, inset 0 0 30px ${vendor.glow}35`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 15px ${vendor.glow}, inset 0 0 10px ${vendor.glow}20`;
                    }}
                  >
                    {/* Background image */}
                    <Image
                      src={vendor.image}
                      alt={vendor.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      unoptimized
                    />

                    {/* Single overlay — fixed the previous double-overlay bug */}
                    <div className="absolute inset-0 bg-black/65 backdrop-blur-[1px] flex flex-col items-center justify-center p-6 text-center">
                      {/* Corner accents */}
                      <span
                        className="absolute top-0 left-0 w-6 h-6"
                        style={{
                          borderTop: `2px solid ${vendor.color}`,
                          borderLeft: `2px solid ${vendor.color}`,
                        }}
                      />
                      <span
                        className="absolute bottom-0 right-0 w-6 h-6"
                        style={{
                          borderBottom: `2px solid ${vendor.color}`,
                          borderRight: `2px solid ${vendor.color}`,
                        }}
                      />

                      <div
                        className="w-16 h-16 rounded-full mb-4 flex items-center justify-center text-2xl"
                        style={{
                          border: `2px solid ${vendor.color}`,
                          boxShadow: `0 0 14px ${vendor.glow}`,
                        }}
                      >
                        {vendor.icon}
                      </div>
                      <h3
                        className="text-xl font-bold uppercase tracking-wide"
                        style={{
                          color: vendor.color,
                          textShadow: `0 0 12px ${vendor.glow}`,
                        }}
                      >
                        {vendor.name}
                      </h3>
                      <p className="text-sm text-gray-400 mt-2">
                        {vendor.type}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

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
          VENDOR TESTIMONIALS
         ────────────────────────────────────────── */}
      <SectionFadeIn>
        <section className="relative z-10 py-20 px-6 md:px-24 bg-black/82">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2
              className="text-3xl md:text-5xl uppercase tracking-wider mb-14"
              style={{
                color: "transparent",
                WebkitTextStroke: "1.5px #00FF41",
                textShadow: "0 0 20px rgba(0,255,65,0.4)",
              }}
            >
              What Vendors Say
            </motion.h2>

            {/* Testimonial carousel */}
            <div className="relative min-h-45">
              {testimonials.map((t, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 flex flex-col items-center justify-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={
                    activeTestimonial === i
                      ? { opacity: 1, y: 0 }
                      : { opacity: 0, y: -10 }
                  }
                  transition={{ duration: 0.6, ease: "easeOut" }}
                >
                  <div
                    className="relative rounded-xl border p-8 md:p-10 bg-black/60"
                    style={{
                      borderColor: `${t.color}40`,
                      boxShadow: `0 0 30px ${t.glow}20`,
                    }}
                  >
                    <span
                      className="absolute -top-4 left-8 text-4xl leading-none"
                      style={{ color: t.color, textShadow: `0 0 15px ${t.glow}` }}
                    >
                      &ldquo;
                    </span>
                    <p className="text-gray-300 text-base md:text-lg leading-relaxed italic">
                      {t.quote}
                    </p>
                    <p
                      className="mt-5 font-bold tracking-widest uppercase text-sm"
                      style={{ color: t.color, textShadow: `0 0 10px ${t.glow}` }}
                    >
                      — {t.author}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-3 mt-48 md:mt-44">
              {testimonials.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTestimonial(i)}
                  className="w-2.5 h-2.5 rounded-full transition-all duration-300 pointer-events-auto"
                  style={{
                    backgroundColor:
                      activeTestimonial === i ? t.color : `${t.color}30`,
                    boxShadow:
                      activeTestimonial === i
                        ? `0 0 10px ${t.glow}`
                        : "none",
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ──────────────────────────────────────────
          SPONSORS & PARTNERS
         ────────────────────────────────────────── */}
      <SectionFadeIn>
        <section className="relative z-10 py-20 px-6 md:px-16 bg-black/80">
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
              <p className="text-gray-700 text-sm text-center tracking-widest uppercase">Sponsor announcements coming soon</p>
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
                            style={{ color: accent.color, textShadow: `0 0 20px ${accent.glow}` }}
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
        <section className="relative z-10 py-20 px-6 md:px-16 bg-black/75">
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
              @dineatnight on Instagram
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
                  <span className="text-gray-800 text-2xl group-hover:text-gray-600 transition-colors duration-300">
                    📸
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="pointer-events-auto flex justify-center">
              <a
                href="https://instagram.com/dineatnight"
                target="_blank"
                rel="noopener noreferrer"
              >
                <NeonButton color="#FFFF00" glowColor="rgba(255,255,0,0.55)">
                  Follow @dineatnight
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
        <section className="relative z-10 py-20 px-6 md:px-16 bg-black/80 border-t border-white/5">
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
              Powered by{" "}
              <span className="text-gray-500">Those Who Dine</span>
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
                  href: "https://instagram.com/dineatnight",
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
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 0 18px ${social.glow}`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = `${social.color}30`;
                    (e.currentTarget as HTMLAnchorElement).style.color = `${social.color}60`;
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
