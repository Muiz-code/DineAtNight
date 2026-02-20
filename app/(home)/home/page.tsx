"use client";

import Loader from "../../_components/loader";
import { useEffect, useState, useRef } from "react";
// import DoodleBg from "@/components/DoodleBg";
import Image from "next/image";
import { Images } from "@/assets/images";
import { animate, motion, useInView } from "framer-motion";
import Antigravity from "@/components/Antigravity";

// Neon glow pulse animation variants
const glowPulse = {
  animate: {
    filter: [
      "drop-shadow(0 0 20px rgba(255,255,0,0.4))",
      "drop-shadow(0 0 40px rgba(255,255,0,0.7))",
      "drop-shadow(0 0 20px rgba(255,255,0,0.4))",
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
};

// Neon button component with outline style
const NeonButton = ({
  children,
  color,
  glowColor,
  delay = 0,
}: {
  children: React.ReactNode;
  color: string;
  glowColor: string;
  delay?: number;
}) => (
  <motion.button
    className="relative px-8 py-3 text-lg font-semibold bg-transparent rounded-full uppercase tracking-wider group overflow-hidden"
    style={{
      border: `2px solid ${glowColor}`,
      color: color,
      textShadow: `0 0 10px ${glowColor}`,
      boxShadow: `0 0 15px ${glowColor}, inset 0 0 15px ${glowColor}30`,
    }}
    whileHover={{
      boxShadow: `0 0 30px ${glowColor}, 0 0 60px ${glowColor}, inset 0 0 30px ${glowColor}50`,
      // textShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
    }}
    animate={{
      boxShadow: [
        `0 0 15px ${glowColor}, inset 0 0 15px ${glowColor}30`,
        `0 0 25px ${glowColor}, inset 0 0 20px ${glowColor}40`,
        `0 0 15px ${glowColor}, inset 0 0 15px ${glowColor}30`,
      ],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut" as const,
      delay,
    }}
  >
    {/* Hover fill effect */}
    <span
      className="absolute inset-0 opacity-0 group-hover:opacity-20 group-hover:scale-110 cursor-pointer transition-opacity duration-300"
      style={{ backgroundColor: glowColor }}
    />
    <span className="relative z-10">{children}</span>
  </motion.button>
);

// Video Card Component
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
      className="relative group rounded-2xl overflow-hidden border border-white/20 bg-black/50 aspect-video cursor-pointer"
      whileHover={{
        scale: 1.05,
        borderColor: color,
        boxShadow: `0 0 20px ${glowColor}`,
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

      {/* Play Button Overlay */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
          isPlaying
            ? "opacity-0 group-hover:opacity-100 bg-black/20"
            : "bg-black/40"
        }`}
      >
        <div
          className="w-16 h-16 rounded-full border-2 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110"
          style={{
            borderColor: color,
            boxShadow: `0 0 15px ${glowColor}`,
          }}
        >
          {isPlaying ? (
            <div className="flex gap-1">
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

// Animated Counter Component
const Counter = ({
  value,
  suffix = "",
  color,
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

// ── Data ──
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

const sponsors = [
  { name: "FirstBank", color: "#FFFF00", glow: "rgba(255,255,0,0.5)" },
  { name: "MTN", color: "#FFFF00", glow: "rgba(255,255,0,0.5)" },
  { name: "Pepsi", color: "#00FF41", glow: "rgba(0,255,65,0.5)" },
  { name: "Beat FM", color: "#FF3333", glow: "rgba(255,51,51,0.5)" },
];

// ── Section fade-in wrapper ──
const SectionFadeIn = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

const formatFollowers = (count: number) => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M+`;
  if (count >= 1_000) return `${Math.round(count / 100) / 10}K+`;
  return `${count}`;
};

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [followers, setFollowers] = useState<string | null>(null);
  const { logo } = Images();

  useEffect(() => {
    // Simulate page load - adjust timing as needed
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadFollowers = async () => {
      try {
        const res = await fetch("/api/ig-followers");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.followers) {
          setFollowers(formatFollowers(Number(data.followers)));
        }
      } catch (err) {
        console.error("Failed to load followers", err);
      }
    };
    loadFollowers();
  }, []);

  if (isLoading) {
    return <Loader />;
  }
  return (
    <div className="relative w-full min-h-screen bg-black">
      {/* DoodleBg background */}
      <div className="fixed inset-0 z-0 w-full">
        <Antigravity color="#00FF41" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center bg-black/70 pointer-events-none">
        {/* Logo with glow pulse */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.div
            variants={glowPulse}
            animate="animate"
            whileHover={{
              filter:
                "drop-shadow(0 0 40px rgba(255,255,0,1)) drop-shadow(0 0 80px rgba(255,255,0,0.5))",
              scale: 1.1,
              opacity: [1, 0.5, 1, 0.7, 1],
              transition: { duration: 0.4 },
            }}
          >
            <Image
              src={logo}
              alt="Dine At Night Logo"
              width={300}
              height={300}
              className="w-40 h-40 md:w-72 md:h-72 object-contain"
              priority
            />
          </motion.div>
        </motion.div>

        {/* Tagline with neon text effect */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="mt-8 space-y-3"
        >
          {/* Main headline - neon outline style */}
          <motion.h1
            className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-wide capitalize"
            style={{
              color: "#FFFF00",
              // WebkitTextStroke: "2px #FFFF00",
              // textShadow:
              //   "0 0 10px rgba(255,255,0,0.5), 0 0 20px rgba(255,255,0,0.3), 0 0 40px rgba(255,255,0,0.2)",
            }}
            // animate={{
            //   textShadow: [
            //     "0 0 10px rgba(255,255,0,0.5), 0 0 20px rgba(255,255,0,0.3), 0 0 40px rgba(255,255,0,0.2)",
            //     "0 0 20px rgba(255,255,0,0.7), 0 0 40px rgba(255,255,0,0.5), 0 0 60px rgba(255,255,0,0.3)",
            //     "0 0 10px rgba(255,255,0,0.5), 0 0 20px rgba(255,255,0,0.3), 0 0 40px rgba(255,255,0,0.2)",
            //   ],
            // }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut" as const,
            }}
          >
            Lagos&apos; First Night Food Market
          </motion.h1>

          {/* Subtitle with subtle glow */}
          <motion.p
            className="text-lg md:text-2xl tracking-wide"
            style={{
              color: "#00FF41",
              textShadow:
                "0 0 10px rgba(0,255,65,0.5), 0 0 20px rgba(0,255,65,0.3)",
            }}
            animate={{
              textShadow: [
                "0 0 10px rgba(0,255,65,0.5), 0 0 20px rgba(0,255,65,0.3)",
                "0 0 15px rgba(0,255,65,0.7), 0 0 30px rgba(0,255,65,0.5)",
                "0 0 10px rgba(0,255,65,0.5), 0 0 20px rgba(0,255,65,0.3)",
              ],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut" as const,
              delay: 0.5,
            }}
          >
            For Those Who Dine After Dark
          </motion.p>
        </motion.div>

        {/* Countdown Timer */}
        {/* <Countdown /> */}

        {/* CTA Buttons - Neon outline style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          className="mt-12 flex flex-col sm:flex-row gap-6 pointer-events-auto"
        >
          <NeonButton color="#FFF" glowColor="rgba(255,255,0,0.5)" delay={0}>
            Get Tickets
          </NeonButton>
          <NeonButton color="#FFF" glowColor="rgba(255,51,51,0.5)" delay={0.3}>
            Become a Vendor
          </NeonButton>
          <NeonButton color="#FFF" glowColor="rgba(0,255,65,0.5)" delay={0.6}>
            Get Merch
          </NeonButton>
        </motion.div>
      </section>

      {/* Stats */}
      <SectionFadeIn>
        <section className="relative z-10 px-4 sm:px-8 lg:px-24 py-10 md:py-14 bg-black/85">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[
              { label: "Diners", value: "5000+", color: "#00FF41" },
              { label: "Vendors", value: "100+", color: "#00FF41" },
              { label: "Events", value: "50+", color: "#00FF41" },
              {
                label: "Followers",
                value: followers ?? "20K+",
                color: "#00FF41",
              },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-[#0b0b0b] via-[#050505] to-[#0f0f0f] border-[#00FF41] px-6 py-7 shadow-[0_0_20px_rgba(0,255,65,0.25)]"
                style={{
                  boxShadow:
                    "0 0 12px rgba(0,255,65,0.25), inset 0 0 12px rgba(0,255,65,0.15)",
                }}
              >
                <div
                  className="text-3xl md:text-4xl font-bold text-center"
                  style={{
                    color: item.color,
                    textShadow: `0 0 12px ${item.color}70`,
                  }}
                >
                  {item.value}
                </div>
                <div className="mt-2 text-center text-gray-400 text-sm md:text-base tracking-wide">
                  {item.label}
                </div>
                <span
                  className="pointer-events-none absolute -inset-px rounded-xl"
                  style={{ boxShadow: `0 0 18px ${item.color}25` }}
                />
              </motion.div>
            ))}
          </div>
        </section>
      </SectionFadeIn>

      {/* ── {/* What Is Dine At Night? ── */}
      <SectionFadeIn>
        <section className="relative z-10 py-10 px-6 md:px-32 bg-black/80">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <motion.h2
              className="text-4xl md:text-6xl uppercase tracking-wider"
              style={{
                color: "transparent",
                WebkitTextStroke: "2px #FFFF00",
                textShadow:
                  "0 0 15px rgba(255,255,0,0.5), 0 0 30px rgba(255,255,0,0.3)",
              }}
            >
              What Is Dine At Night?
            </motion.h2>

            <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
              Dine At Night is Lagos after dark — a vibrant nighttime food
              market where the city&apos;s best chefs, street food vendors,
              music, and community come together under neon lights.
            </p>

            <p
              className="text-xl md:text-2xl font-semibold italic"
              style={{
                color: "#00FF41",
                textShadow:
                  "0 0 10px rgba(0,255,65,0.5), 0 0 20px rgba(0,255,65,0.3)",
              }}
            >
              It&apos;s more than a food event. It&apos;s an experience.
            </p>

            {/* Video Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 w-full px-4">
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

            {/* Decorative neon divider */}
            <div className="flex items-center justify-center gap-4 pt-4">
              <span
                className="block w-16 h-0.5"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, #FF3333, transparent)",
                  boxShadow: "0 0 10px rgba(255,51,51,0.5)",
                }}
              />
              <span
                className="block w-2 h-2 rounded-full"
                style={{
                  backgroundColor: "#FFFF00",
                  boxShadow:
                    "0 0 8px rgba(255,255,0,0.6), 0 0 16px rgba(255,255,0,0.4)",
                }}
              />
              <span
                className="block w-16 h-0.5"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, #FF3333, transparent)",
                  boxShadow: "0 0 10px rgba(255,51,51,0.5)",
                }}
              />
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── Vendors Section (Preview) ── */}
      <SectionFadeIn>
        <section className="relative z-10 py-10 px-6 md:px-16 bg-black/70">
          <div className="max-w-7xl mx-auto">
            <motion.h2
              className="text-4xl md:text-6xl uppercase tracking-wider text-center mb-5"
              style={{
                color: "transparent",
                WebkitTextStroke: "2px #FF3333",
                textShadow:
                  "0 0 15px rgba(255,51,51,0.5), 0 0 30px rgba(255,51,51,0.3)",
              }}
            >
              Our Vendors
            </motion.h2>

            {/* Horizontal scroll vendor cards */}
            <div className="flex items-center gap-6 h-[50vh] overflow-x-auto pb-0 snap-x snap-mandatory scrollbar-hide pointer-events-auto">
              {vendors.map((vendor, i) => (
                <motion.div
                  key={vendor.name}
                  className="shrink-0 w-64 md:w-72 snap-center group cursor-pointer"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  whileHover={{
                    opacity: [1, 0.5, 1, 0.7, 1],
                    scale: 1.05,
                    transition: { duration: 0.4 },
                  }}
                >
                  <div
                    className="relative h-80 rounded-sm overflow-hidden transition-all duration-300"
                    style={{
                      border: `2px solid ${vendor.color}`,
                      boxShadow: `0 0 15px ${vendor.glow}, inset 0 0 15px ${vendor.glow}30`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = `0 0 30px ${vendor.glow}, 0 0 60px ${vendor.glow}, inset 0 0 30px ${vendor.glow}50`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = `0 0 15px ${vendor.glow}, inset 0 0 15px ${vendor.glow}30`;
                    }}
                  >
                    {/* Background Image */}
                    <Image
                      src={vendor.image}
                      alt={vendor.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      unoptimized
                    />

                    {/* Card content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/60">
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/60 backdrop-blur-[2px]">
                        {/* Vendor icon placeholder */}
                        <div
                          className="w-16 h-16 rounded-full mb-4 flex items-center justify-center text-2xl"
                          style={{
                            border: `2px solid ${vendor.color}`,
                            boxShadow: `0 0 10px ${vendor.glow}`,
                            color: vendor.color,
                          }}
                        >
                          {vendor.icon}
                        </div>
                        <h3
                          className="text-xl font-bold uppercase tracking-wide"
                          style={{
                            color: vendor.color,
                            textShadow: `0 0 10px ${vendor.glow}`,
                          }}
                        >
                          {vendor.name}
                        </h3>
                        <p className="text-sm text-gray-400 mt-2">
                          {vendor.type}
                        </p>
                      </div>

                      {/* Neon corner accents */}
                      <div
                        className="absolute top-0 left-0 w-6 h-6"
                        style={{
                          borderTop: `2px solid ${vendor.color}`,
                          borderLeft: `2px solid ${vendor.color}`,
                        }}
                      />
                      <div
                        className="absolute bottom-0 right-0 w-6 h-6"
                        style={{
                          borderBottom: `2px solid ${vendor.color}`,
                          borderRight: `2px solid ${vendor.color}`,
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex justify-center mt-12 pointer-events-auto">
              <NeonButton
                color="#FF3333"
                glowColor="rgba(255,51,51,0.5)"
                delay={0}
              >
                See All Vendors
              </NeonButton>
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── Sponsors & Partners ── */}
      <SectionFadeIn>
        <section className="relative z-10 py-24 px-6 md:px-16 bg-black/80 ">
          <div className="max-w-5xl mx-auto text-center">
            <motion.h2
              className="text-4xl md:text-6xl uppercase tracking-wider mb-4"
              style={{
                color: "transparent",
                WebkitTextStroke: "2px #00FF41",
                textShadow:
                  "0 0 15px rgba(0,255,65,0.5), 0 0 30px rgba(0,255,65,0.3)",
              }}
            >
              Sponsors & Partners
            </motion.h2>
            <p className="text-gray-400 mb-16 text-lg">Proudly supported by</p>

            {/* Sponsor logos grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center">
              {sponsors.map((sponsor, i) => (
                <motion.div
                  key={sponsor.name}
                  className="group cursor-pointer pointer-events-auto"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.5 }}
                >
                  <div
                    className="w-40 h-24 md:w-48 md:h-28 flex items-center justify-center rounded-sm transition-all duration-300"
                    style={{
                      border: `1.5px solid ${sponsor.color}40`,
                      boxShadow: `0 0 8px ${sponsor.glow}20`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.border = `1.5px solid ${sponsor.color}`;
                      e.currentTarget.style.boxShadow = `0 0 20px ${sponsor.glow}, inset 0 0 15px ${sponsor.glow}30`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.border = `1.5px solid ${sponsor.color}40`;
                      e.currentTarget.style.boxShadow = `0 0 8px ${sponsor.glow}20`;
                    }}
                  >
                    <span
                      className="text-lg md:text-xl font-bold uppercase tracking-wider transition-all duration-300"
                      style={{
                        color: `${sponsor.color}80`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = sponsor.color;
                        e.currentTarget.style.textShadow = `0 0 15px ${sponsor.glow}`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = `${sponsor.color}80`;
                        e.currentTarget.style.textShadow = "none";
                      }}
                    >
                      {sponsor.name}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── Newsletter ── */}
      <SectionFadeIn>
        <section className="relative z-10 py-24 px-6 md:px-16 bg-black/80 border-t border-white/10">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <motion.h2
              className="text-3xl md:text-5xl font-bold uppercase tracking-wider"
              style={{
                color: "white",
                textShadow: "0 0 15px rgba(0,255,65,0.3)",
              }}
            >
              Don&apos;t Miss The Next Bite
            </motion.h2>
            <p className="text-gray-400 text-lg">
              Join our community for exclusive updates, vendor reveals, and
              early bird tickets.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pointer-events-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="px-6 py-3 bg-white/5 border border-white/20 rounded-full text-white focus:outline-none focus:border-[#00FF41] focus:shadow-[0_0_15px_rgba(0,255,65,0.3)] transition-all w-full sm:w-80 placeholder:text-gray-600"
              />
              <NeonButton color="#00FF41" glowColor="rgba(0,255,65,0.5)">
                Subscribe
              </NeonButton>
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── Footer ── */}
      <SectionFadeIn>
        <section className="relative z-10 py-12 px-6 md:px-16 bg-black/90 border-t border-gray-800">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-gray-400 text-sm">
              © 2026 Dine At Night. All rights reserved.
            </p>
            <div className="mt-4 flex justify-center gap-6">
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Terms of Service
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Contact
              </a>
            </div>
          </div>
        </section>
      </SectionFadeIn>
    </div>
  );
}
