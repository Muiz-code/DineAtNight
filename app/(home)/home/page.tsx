"use client";

import Loader from "../../_components/loader";
import { useEffect, useState, useRef } from "react";
// import DoodleBg from "@/components/DoodleBg";
import Image from "next/image";
import { Images } from "@/Images/images";
import { motion, useInView } from "framer-motion";
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
      border: `2px solid ${color}`,
      color: color,
      textShadow: `0 0 10px ${glowColor}`,
      boxShadow: `0 0 15px ${glowColor}, inset 0 0 15px ${glowColor}30`,
    }}
    whileHover={{
      boxShadow: `0 0 30px ${glowColor}, 0 0 60px ${glowColor}, inset 0 0 30px ${glowColor}50`,
      textShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
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
      className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
      style={{ backgroundColor: color }}
    />
    <span className="relative z-10">{children}</span>
  </motion.button>
);

// ── Data ──
const vendors = [
  {
    name: "Suya Spot",
    type: "Grilled Meats",
    icon: "🔥",
    color: "#FFFF00",
    glow: "rgba(255,255,0,0.5)",
  },
  {
    name: "Jollof Wars",
    type: "Rice & Stews",
    icon: "🍚",
    color: "#FF3333",
    glow: "rgba(255,51,51,0.5)",
  },
  {
    name: "Boli & Fish",
    type: "Street Food",
    icon: "🍌",
    color: "#00FF41",
    glow: "rgba(0,255,65,0.5)",
  },
  {
    name: "Puff Puff Palace",
    type: "Snacks & Desserts",
    icon: "🍩",
    color: "#FFFF00",
    glow: "rgba(255,255,0,0.5)",
  },
  {
    name: "Asun Alley",
    type: "Peppered Goat",
    icon: "🌶️",
    color: "#FF3333",
    glow: "rgba(255,51,51,0.5)",
  },
  {
    name: "Nkwobi Nights",
    type: "Delicacies",
    icon: "🥘",
    color: "#00FF41",
    glow: "rgba(0,255,65,0.5)",
  },
  {
    name: "Small Chops Co",
    type: "Finger Foods",
    icon: "🥟",
    color: "#FFFF00",
    glow: "rgba(255,255,0,0.5)",
  },
  {
    name: "Chapman Bar",
    type: "Drinks & Cocktails",
    icon: "🍹",
    color: "#FF3333",
    glow: "rgba(255,51,51,0.5)",
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

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const { logo } = Images();

  useEffect(() => {
    // Simulate page load - adjust timing as needed
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
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
              className="w-48 h-48 md:w-72 md:h-72 object-contain"
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
            className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-wider uppercase"
            style={{
              color: "transparent",
              WebkitTextStroke: "2px #FFFF00",
              textShadow:
                "0 0 10px rgba(255,255,0,0.5), 0 0 20px rgba(255,255,0,0.3), 0 0 40px rgba(255,255,0,0.2)",
            }}
            animate={{
              textShadow: [
                "0 0 10px rgba(255,255,0,0.5), 0 0 20px rgba(255,255,0,0.3), 0 0 40px rgba(255,255,0,0.2)",
                "0 0 20px rgba(255,255,0,0.7), 0 0 40px rgba(255,255,0,0.5), 0 0 60px rgba(255,255,0,0.3)",
                "0 0 10px rgba(255,255,0,0.5), 0 0 20px rgba(255,255,0,0.3), 0 0 40px rgba(255,255,0,0.2)",
              ],
            }}
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

        {/* CTA Buttons - Neon outline style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          className="mt-12 flex flex-col sm:flex-row gap-6 pointer-events-auto"
        >
          <NeonButton color="#FFFF00" glowColor="rgba(255,255,0,0.5)" delay={0}>
            Get Tickets
          </NeonButton>
          <NeonButton
            color="#FF3333"
            glowColor="rgba(255,51,51,0.5)"
            delay={0.3}
          >
            Become a Vendor
          </NeonButton>
          <NeonButton
            color="#00FF41"
            glowColor="rgba(0,255,65,0.5)"
            delay={0.6}
          >
            Get Merch
          </NeonButton>
        </motion.div>
      </section>

      {/* ── What Is Dine At Night? ── */}
      <SectionFadeIn>
        <section className="relative z-10 py-24 px-6 md:px-16 lg:px-32 bg-black/80">
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
        <section className="relative z-10 py-24 px-6 md:px-16 bg-black/70">
          <div className="max-w-7xl mx-auto">
            <motion.h2
              className="text-4xl md:text-6xl uppercase tracking-wider text-center mb-16"
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
                    {/* Card content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/60">
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
        <section className="relative z-10 py-24 px-6 md:px-16 bg-black/80">
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
