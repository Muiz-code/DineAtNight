"use client";

import Loader from "../../_components/loader";
import { useEffect, useState, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Images } from "@/assets/images";
import {
  animate,
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useScroll,
  useTransform,
} from "framer-motion";
import VendorModal from "../../_components/VendorModal";
import CardCountdown from "../../_components/CardCountdown";
import NeonMarquee from "../../_components/NeonMarquee";
import Antigravity from "@/components/Antigravity";
import TestimonialSection from "../../_components/TestimonialSection";
import {
  subscribeActiveEvents,
  subscribePastEvents,
  subscribeApprovedVendors,
  subscribeGalleryItems,
  getVendorCategories,
  type DanEvent,
  type DanVendor,
  type DanGalleryItem,
} from "@/lib/firestore";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getCache, setCache } from "@/lib/cache";
import { Camera, MapPin, ChevronDown } from "lucide-react";
import Footer from "@/app/_components/Footer";
import SectionFadeIn from "@/app/_components/SectionFadeIn";
import NewsletterModal from "@/app/_components/NewsletterModal";

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
   3D Tilt Card Wrapper
═══════════════════════════════════════════════ */
function TiltCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${-y * 7}deg) rotateY(${x * 7}deg) scale3d(1.03,1.03,1.03)`;
    el.style.transition = "transform 0.12s ease";
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "";
    el.style.transition = "transform 0.4s ease";
  };
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
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
    label: "Sold Out",
    value: 100,
    suffix: "%",
    color: "#00FF41",
    glow: "rgba(0,255,65,0.25)",
  },
  // {
  //   label: "Return Rate",
  //   value: 100,
  //   suffix: "%",
  //   color: "#00FF41",
  //   glow: "rgba(0,255,65,0.25)",
  // },
];

const formatFollowers = (count: number) => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M+`;
  if (count >= 1_000) return `${Math.round(count / 100) / 10}K+`;
  return `${count}`;
};

/* ═══════════════════════════════════════════════
   Stacked Gallery (mobile swipe)
═══════════════════════════════════════════════ */
function StackedGalleryMobile({ items }: { items: DanGalleryItem[] }) {
  // Unbounded integer — lets us swipe forward and back infinitely
  const [activeIdx, setActiveIdx] = useState(0);
  const [exitDir, setExitDir] = useState<1 | -1>(-1);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-26, 26]);

  const n = items.length;
  // Safe modulo that handles negative values
  const mod = (i: number) => ((i % n) + n) % n;

  const handleDragEnd = (
    _: unknown,
    info: { offset: { x: number }; velocity: { x: number } },
  ) => {
    if (Math.abs(info.offset.x) > 55 || Math.abs(info.velocity.x) > 380) {
      const swipedRight = info.offset.x > 0; // right = go back, left = go forward
      setExitDir(swipedRight ? 1 : -1);
      setActiveIdx((i) => i + (swipedRight ? -1 : 1));
      x.set(0);
    } else {
      animate(x, 0, { type: "spring", stiffness: 420, damping: 34 });
    }
  };

  if (n === 0) return null;

  const accents = ["#FFFF00", "#FF3333", "#00FF41"];
  const currentItem = items[mod(activeIdx)];

  return (
    <div className="relative flex flex-col items-center select-none h-[52vh]">
      {/* Back cards — next 2 items peeking behind */}
      {[2, 1].map((offset) => {
        const item = items[mod(activeIdx + offset)];
        const accent = accents[offset % accents.length];
        return (
          <motion.div
            key={`back-${offset}`}
            className="absolute w-[88%] rounded-2xl overflow-hidden border"
            style={{
              borderColor: `${accent}28`,
              aspectRatio: "3/4",
              zIndex: 3 - offset,
            }}
            animate={{
              y: offset * 22,
              scale: 1 - offset * 0.048,
              rotate: offset === 1 ? 4 : -4,
            }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.src}
              alt={item.caption}
              className="w-full h-full object-cover"
            />
          </motion.div>
        );
      })}

      {/* Top card — draggable, swipe left = next, swipe right = previous */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={activeIdx}
          className="absolute w-[88%] rounded-2xl overflow-hidden border cursor-grab active:cursor-grabbing"
          style={{
            borderColor: "#FFFF0045",
            boxShadow:
              "0 8px 48px rgba(255,255,0,0.1), 0 0 0 1px rgba(255,255,0,0.06)",
            aspectRatio: "3/4",
            x,
            rotate,
            zIndex: 10,
          }}
          initial={{ scale: 0.88, opacity: 0, y: 28 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{
            x: exitDir * 520,
            rotate: exitDir * 30,
            opacity: 0,
            transition: { duration: 0.26, ease: "easeIn" },
          }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.75}
          onDragEnd={handleDragEnd}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentItem.src}
            alt={currentItem.caption}
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.12) 52%, transparent 100%)",
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <p
              className="text-[9px] tracking-[0.4em] uppercase mb-1 font-bold"
              style={{
                color: "#FFFF00",
                textShadow: "0 0 8px rgba(255,255,0,0.6)",
              }}
            >
              {currentItem.eventTitle}
            </p>
            {currentItem.caption && (
              <p className="text-white/75 text-sm leading-snug line-clamp-2">
                {currentItem.caption}
              </p>
            )}
          </div>
          {/* Swipe hint arrows */}
          <div className="absolute top-1/2 -translate-y-1/2 left-5 right-5 flex justify-between pointer-events-none">
            <span className="text-white/10 text-4xl leading-none">‹</span>
            <span className="text-white/10 text-4xl leading-none">›</span>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dot indicators */}
      {/* <div className="absolute bottom-0 flex gap-2 items-center">
        {items.map((_, i) => (
          <motion.div
            key={i}
            className="rounded-full"
            animate={{
              width: i === mod(activeIdx) ? 22 : 6,
              background: i === mod(activeIdx) ? "#FFFF00" : "rgba(255,255,255,0.18)",
              boxShadow: i === mod(activeIdx) ? "0 0 10px rgba(255,255,0,0.8)" : "none",
            }}
            transition={{ duration: 0.22 }}
            style={{ height: 6 }}
          />
        ))}
      </div> */}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Page Component
═══════════════════════════════════════════════ */
export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [followers, setFollowers] = useState<string | null>(null);
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [activeEvents, setActiveEvents] = useState<DanEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<DanEvent[]>([]);
  const [soldByEvent, setSoldByEvent] = useState<Record<string, number>>({});
  const [isMobile, setIsMobile] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [approvedVendors, setApprovedVendors] = useState<DanVendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [vendorsError, setVendorsError] = useState(false);
  const [galleryItems, setGalleryItems] = useState<DanGalleryItem[]>([]);
  const { logo } = Images();
  const cursorRef = useRef<HTMLDivElement>(null);
  const vendorsResolvedRef = useRef(false);

  // Parallax transforms — logo moves up slower than the page
  const { scrollY } = useScroll();
  const logoY = useTransform(scrollY, [0, 500], [0, -70]);
  const tagY = useTransform(scrollY, [0, 500], [0, -35]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  // Events — serve cache instantly, subscribe for live updates
  useEffect(() => {
    const cached = getCache<DanEvent[]>("dan_active_events");
    if (cached) setActiveEvents(cached);
    const unsubActive = subscribeActiveEvents((evs) => {
      setActiveEvents(evs);
      setCache("dan_active_events", evs);
    });
    const unsubPast = subscribePastEvents((evs) => setPastEvents(evs));

    // Cross-check sold counts from actual ticket documents (same as events page)
    getDocs(collection(db, "tickets"))
      .then((snap) => {
        const counts: Record<string, number> = {};
        for (const d of snap.docs) {
          const t = d.data();
          if (t.status !== "pending") {
            counts[t.eventId] = (counts[t.eventId] ?? 0) + (t.quantity ?? 1);
          }
        }
        setSoldByEvent(counts);
      })
      .catch(() => {});

    return () => {
      unsubActive();
      unsubPast();
    };
  }, []);

  // Vendors — serve cache instantly, subscribe for live updates
  useEffect(() => {
    vendorsResolvedRef.current = false;
    const cached = getCache<DanVendor[]>("dan_approved_vendors");
    if (cached) {
      setApprovedVendors(
        [...cached].sort(() => Math.random() - 0.5).slice(0, 3),
      );
      setVendorsLoading(false);
      vendorsResolvedRef.current = true;
    }
    return subscribeApprovedVendors((vendors) => {
      setCache("dan_approved_vendors", vendors);
      setApprovedVendors(
        [...vendors].sort(() => Math.random() - 0.5).slice(0, 3),
      );
      setVendorsError(false);
      if (!vendorsResolvedRef.current) {
        setVendorsLoading(false);
        vendorsResolvedRef.current = true;
      }
    });
  }, []);

  // Gallery — serve cache instantly, subscribe for live updates
  useEffect(() => {
    const cached = getCache<DanGalleryItem[]>("dan_gallery");
    if (cached) setGalleryItems(cached);
    return subscribeGalleryItems((items) => {
      setGalleryItems(items);
      setCache("dan_gallery", items);
    });
  }, []);

  // Cursor spotlight — direct DOM write for zero re-renders
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX - 250}px`;
        cursorRef.current.style.top = `${e.clientY - 250}px`;
      }
    };
    window.addEventListener("mousemove", move, { passive: true });
    return () => window.removeEventListener("mousemove", move);
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

  // Pick 3 diverse gallery items (round-robin across events)
  const galleryPreview = useMemo(() => {
    if (galleryItems.length === 0) return [];
    const byEvent: Record<string, DanGalleryItem[]> = {};
    galleryItems.forEach((item) => {
      if (!byEvent[item.eventId]) byEvent[item.eventId] = [];
      byEvent[item.eventId].push(item);
    });
    const groups = Object.values(byEvent).map((arr) =>
      [...arr].sort(() => Math.random() - 0.5),
    );
    const result: DanGalleryItem[] = [];
    let i = 0;
    while (result.length < 3 && groups.some((g) => g.length > 0)) {
      const group = groups[i % groups.length];
      if (group.length > 0) result.push(group.shift()!);
      i++;
    }
    return result;
  }, [galleryItems]);

  // Photos only for the mobile swipeable stack (up to 10)
  const mobileGalleryPhotos = useMemo(
    () =>
      [...galleryItems.filter((item) => item.type === "photo")]
        .sort(() => Math.random() - 0.5)
        .slice(0, 10),
    [galleryItems],
  );

  // Up to 6 random photos for the IG placeholder grid
  const galleryIgPhotos = useMemo(
    () =>
      [...galleryItems]
        .filter((i) => i.type === "photo")
        .sort(() => Math.random() - 0.5)
        .slice(0, 6),
    [galleryItems],
  );

  if (isLoading) return <Loader />;

  return (
    <div className="relative w-full bg-black overflow-x-hidden overflow-y-hidden">
      {/* Fixed Particle Background */}
      <div className="fixed inset-0 z-0 w-full">
        <Antigravity color="#00FF41" />
      </div>

      {/* Cursor spotlight glow — follows mouse, no re-renders */}
      <div
        ref={cursorRef}
        className="fixed pointer-events-none"
        style={{
          zIndex: 2,
          width: 500,
          height: 500,
          background:
            "radial-gradient(circle, rgba(0,255,65,0.06) 0%, transparent 70%)",
        }}
      />

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

      {/* Neon ticker after hero */}
      <div className="relative z-10">
        <NeonMarquee />
      </div>

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
              Dine At Night is Lagos after dark, a vibrant nighttime food market
              where the city&apos;s best chefs, street food vendors, music, and
              community come together under neon lights.
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
          STATS  (real numbers from Edition 1)
         ────────────────────────────────────────── */}
      <SectionFadeIn>
        <section className="relative z-10 px-4 sm:px-8 lg:px-24 py-7 bg-black/88">
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 grid-cols-3 gap-5">
            {stats.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="relative overflow-hidden rounded-2xl bg-transparent from-[#0e0e0e] to-[#040404] px-2 py-3 text-center"
                // style={{
                //   borderColor: item.color,
                //   boxShadow: `0 0 25px ${item.glow}, inset 0 0 25px ${item.glow}`,
                // }}
              >
                <div
                  className="text-4xl md:text-6xl font-bold"
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
                <div className="mt-3 text-gray-400 text-[10px] md:text-sm tracking-widest uppercase">
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
              className="relative overflow-hidden rounded-2xl bg-transparent from-[#0e0e0e] to-[#040404] px-2 py-3 text-center"
              // style={{
              //   borderColor: "#FFFF00",
              //   boxShadow:
              //     "0 0 25px rgba(255,255,0,0.25), inset 0 0 25px rgba(255,255,0,0.1)",
              // }}
            >
              <div
                className="text-4xl md:text-6xl font-bold"
                style={{
                  color: "#FF3333",
                  textShadow: "0 0 20px rgba(255,51,51,0.25)",
                }}
              >
                {followers ?? "20K+"}
              </div>
              <div className="mt-3 text-gray-400 text-[10px] md:text-sm tracking-widest uppercase">
                Followers
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
                            <div
                              className="absolute bottom-0 left-0 right-0 h-16 md:hidden"
                              style={{ background: "linear-gradient(to bottom, transparent, #090909)" }}
                            />
                            <div
                              className="absolute inset-0 hidden md:block"
                              style={{ background: "linear-gradient(to right, transparent 55%, #090909 100%)" }}
                            />
                          </>
                        ) : (
                          <div
                            className="w-full min-h-[220px]"
                            style={{ background: "radial-gradient(ellipse at center, rgba(255,255,0,0.08), #030303)" }}
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
                            {evDate}{evTime ? ` · ${evTime}` : ""}
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
                            color: isExpanded ? "rgba(255,255,0,0.9)" : "rgba(255,255,0,0.55)",
                          }}
                          onClick={toggleExpand}
                        >
                          <span>{isExpanded ? "Hide Details" : "See Details"}</span>
                          <ChevronDown
                            className="w-4 h-4 transition-transform duration-300"
                            style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                          />
                        </button>

                        {/* Collapsible: description, highlights, tiers, progress bar */}
                        <div
                          className="grid transition-all duration-300 ease-in-out"
                          style={{
                            gridTemplateRows: (!isMobile || isExpanded) ? "1fr" : "0fr",
                            opacity: (!isMobile || isExpanded) ? 1 : 0,
                          }}
                        >
                          <div className="overflow-hidden flex flex-col gap-4 min-h-0">
                            {ev.description && (
                              <p className="text-gray-400 text-sm leading-relaxed">
                                {ev.description}
                              </p>
                            )}

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
                                  <p className="text-2xl font-bold" style={{ color: "#FFFF00" }}>
                                    ₦{ev.ticketPrice.toLocaleString()}
                                  </p>
                                </div>
                              )}

                              {/* Progress bar */}
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span style={{ color: pct >= 90 ? "#FF3333" : "rgba(255,255,255,0.4)" }}>
                                    {pct}% sold
                                  </span>
                                  <span className="text-gray-600">{remaining} remaining</span>
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
                            </div>
                          </div>
                        </div>

                        {/* Get Tickets button — always visible */}
                        <Link href="/event" className="mt-auto">
                          <motion.button
                            disabled={soldOut}
                            className="w-full sm:w-auto px-8 py-3 rounded-full font-bold uppercase tracking-widest text-sm shrink-0"
                            style={{
                              background: soldOut ? "transparent" : "#FFFF00",
                              color: soldOut ? "#666" : "#000",
                              border: soldOut ? "2px solid #333" : "2px solid #FFFF00",
                              boxShadow: soldOut ? "none" : "0 0 20px rgba(255,255,0,0.4)",
                              cursor: soldOut ? "not-allowed" : "pointer",
                            }}
                            whileHover={!soldOut ? { scale: 1.03 } : {}}
                            whileTap={!soldOut ? { scale: 0.97 } : {}}
                          >
                            {soldOut ? "Sold Out" : "Get Tickets →"}
                          </motion.button>
                        </Link>
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
                    <TiltCard key={vendor.id ?? vendor.brandName}>
                      <motion.div
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
                            {getVendorCategories(vendor).map((cat) => (
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
                    </TiltCard>
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

      {/* Neon ticker before gallery */}
      <div className="relative z-10">
        <NeonMarquee />
      </div>

      {/* ──────────────────────────────────────────
          GALLERY PREVIEW (3 random cards)
         ────────────────────────────────────────── */}
      {galleryPreview.length > 0 && (
        <SectionFadeIn>
          <section className="relative z-10 pt-10 pb-2 px-6 md:px-16 bg-black/72 border-t border-white/5">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <p
                  className="text-[10px] tracking-[0.6em] uppercase mb-2"
                  style={{ color: "#FFFF00" }}
                >
                  The Moments
                </p>
                <motion.h2
                  className="text-4xl md:text-6xl uppercase tracking-wider"
                  style={{
                    color: "transparent",
                    WebkitTextStroke: "2px #FFFF00",
                    textShadow:
                      "0 0 20px rgba(255,255,0,0.5), 0 0 45px rgba(255,255,0,0.3)",
                  }}
                >
                  In The Gallery
                </motion.h2>
              </div>

              {/* Mobile: swipeable stacked cards (photos only, up to 10) */}
              {mobileGalleryPhotos.length > 0 && (
                <div className="block sm:hidden pointer-events-auto mb-8">
                  <StackedGalleryMobile items={mobileGalleryPhotos} />
                </div>
              )}

              {/* Desktop: 3-col grid */}
              <div className="hidden sm:grid grid-cols-3 gap-4 pointer-events-auto">
                {galleryPreview.map((item, i) => {
                  const accent = ["#FFFF00", "#FF3333", "#00FF41"][i % 3];
                  const accentGlow = [
                    "rgba(255,255,0,0.35)",
                    "rgba(255,51,51,0.35)",
                    "rgba(0,255,65,0.35)",
                  ][i % 3];
                  return (
                    <Link key={item.id} href={`/gallery?event=${item.eventId}`}>
                      <motion.div
                        className="group relative rounded-2xl overflow-hidden border aspect-[3/4] cursor-pointer"
                        style={{ borderColor: `${accent}25` }}
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.12, duration: 0.55 }}
                        whileHover={{
                          borderColor: accent,
                          boxShadow: `0 0 40px ${accentGlow}`,
                          y: -4,
                        }}
                      >
                        {item.type === "video" ? (
                          // eslint-disable-next-line jsx-a11y/media-has-caption
                          <video
                            src={item.src}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            muted
                            loop
                            playsInline
                            autoPlay
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.src}
                            alt={item.caption}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        )}
                        {/* gradient */}
                        <div
                          className="absolute inset-0"
                          style={{
                            background:
                              "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.35) 45%, transparent 100%)",
                          }}
                        />
                        {/* info on card */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <p
                            className="text-[9px] tracking-[0.4em] uppercase mb-1 font-bold"
                            style={{
                              color: accent,
                              textShadow: `0 0 8px ${accentGlow}`,
                            }}
                          >
                            {item.eventTitle}
                          </p>
                          {item.caption && (
                            <p className="text-white/80 text-sm leading-snug line-clamp-2">
                              {item.caption}
                            </p>
                          )}
                        </div>
                        {/* hover cta */}
                        <div
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          style={{ background: `${accent}12` }}
                        >
                          <span
                            className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest border"
                            style={{
                              borderColor: accent,
                              color: accent,
                              background: "rgba(0,0,0,0.75)",
                              boxShadow: `0 0 15px ${accentGlow}`,
                            }}
                          >
                            View Event →
                          </span>
                        </div>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>

              <div className="flex justify-center mt-10 pointer-events-auto">
                <Link href="/gallery">
                  <NeonButton color="#FFFF00" glowColor="rgba(255,255,0,0.55)">
                    See The Full Gallery →
                  </NeonButton>
                </Link>
              </div>
            </div>
          </section>
        </SectionFadeIn>
      )}

      {/* ──────────────────────────────────────────
          SPONSORS & PARTNERS
         ────────────────────────────────────────── */}
      {(() => {
        const allSponsors = [...activeEvents, ...pastEvents]
          .flatMap((ev) => ev.sponsors ?? [])
          .filter(
            (sp, idx, arr) => arr.findIndex((s) => s.name === sp.name) === idx,
          );
        if (allSponsors.length === 0) return null;
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
        }: {
          sp: { name: string; logoUrl?: string };
          i: number;
        }) => {
          const c = colors[i % colors.length];
          const g = glows[i % glows.length];
          return (
            <motion.div
              className="w-36 h-20 md:w-44 md:h-24 flex items-center justify-center rounded-lg overflow-hidden p-3 flex-shrink-0"
              style={{
                border: `1.5px solid ${c}`,
                boxShadow: `0 0 18px ${g}, inset 0 0 12px ${g}20`,
              }}
              whileHover={{ scale: 1.05 }}
            >
              {sp.logoUrl ? (
                <div className="flex flex-col items-center justify-center gap-1.5 w-full h-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sp.logoUrl}
                    alt={sp.name}
                    className={`max-w-full object-contain ${sp.name ? "max-h-[65%]" : "max-h-full"}`}
                  />
                  {sp.name && (
                    <span
                      className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-center leading-tight"
                      style={{ color: c, textShadow: `0 0 12px ${g}` }}
                    >
                      {sp.name}
                    </span>
                  )}
                </div>
              ) : (
                <span
                  className="text-lg md:text-xl font-bold uppercase tracking-wider"
                  style={{ color: c, textShadow: `0 0 20px ${g}` }}
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
              <div className="max-w-5xl mx-auto text-center mb-10">
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
                <p className="text-gray-500 text-sm tracking-widest uppercase">
                  Proudly supported by
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
                      />
                    ))}
                  </motion.div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-6">
                  {allSponsors.map((sp, i) => (
                    <SponsorCard key={sp.name} sp={sp} i={i} />
                  ))}
                </div>
              )}
            </section>
          </SectionFadeIn>
        );
      })()}

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

            {/* Gallery photos when available, placeholder otherwise */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-12">
              {Array.from({ length: 6 }).map((_, i) => {
                const photo = galleryIgPhotos[i];
                return (
                  <motion.div
                    key={i}
                    className="aspect-square bg-[#0a0a0a] border border-white/8 rounded-sm overflow-hidden flex items-center justify-center group cursor-pointer pointer-events-auto relative"
                    whileHover={{
                      borderColor: "#FFFF00",
                      boxShadow: "0 0 20px rgba(255,255,0,0.3)",
                    }}
                    initial={{ opacity: 0, scale: 0.88 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07, duration: 0.4 }}
                  >
                    {photo ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.src}
                          alt=""
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/25 group-hover:bg-black/0 transition-colors duration-300" />
                      </>
                    ) : (
                      <Camera className="w-6 h-6 text-gray-800 group-hover:text-gray-600 transition-colors duration-300" />
                    )}
                  </motion.div>
                );
              })}
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
          FOOTER
         ────────────────────────────────────────── */}

      <Footer />
      {/* Vendor Application Modal */}
      <VendorModal
        isOpen={vendorModalOpen}
        onClose={() => setVendorModalOpen(false)}
      />
      {/* Newsletter first-visit modal */}
      <NewsletterModal />
    </div>
  );
}
