"use client";

import { useRef, useEffect } from "react";
import { useScrollLock } from "@/lib/useScrollLock";
import { motion, useInView, animate, AnimatePresence } from "framer-motion";
import SectionFadeIn from "../_components/SectionFadeIn";
import Footer from "../_components/Footer";
import Carousel from "../_components/Carousel";
import HeroCarousel from "../_components/HeroCarousel";
import NeonMarquee from "../_components/NeonMarquee";
import VendorModal from "../_components/VendorModal";
import { useState } from "react";
import Link from "next/link";
import {
  Crown,
  Users,
  Clapperboard,
  Globe,
  Star,
  Landmark,
  TrendingUp,
  X,
} from "lucide-react";

const Counter = ({
  value,
  suffix = "",
}: {
  value: number;
  suffix?: string;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-20px" });

  useEffect(() => {
    if (isInView && ref.current) {
      const controls = animate(0, value, {
        duration: 2.5,
        ease: "easeOut",
        onUpdate(v) {
          if (ref.current)
            ref.current.textContent = Math.floor(v).toLocaleString() + suffix;
        },
      });
      return () => controls.stop();
    }
  }, [value, suffix, isInView]);

  return <span ref={ref} />;
};

interface TeamPerson {
  name: string;
  title: string;
  bio: string;
  imageUrl: string;
}

interface TeamGroup {
  name: string;
  role: string;
  desc: string;
  color: string;
  glow: string;
  icon: React.ReactNode;
  // modalDesc: string;
  // members: TeamPerson[];
}

const teamMembers: TeamGroup[] = [
  {
    name: "Creative & Experience Director ",
    role: "Tami",
    desc: "Leads the creative vision, branding, and overall guest experience of Dine at Night, ensuring each event is visually compelling, culturally relevant, and memorable.",
    color: "#FFFF00",
    glow: "rgba(255,255,0,0.5)",
    icon: <Crown className="w-10 h-10" />,
  },
  {
    name: "Partnerships & Revenue Lead",
    role: "Temi",
    desc: "Drives revenue through sponsorships, partnerships, and ticketing strategy while managing financial planning and brand relationships.",
    color: "#FF3333",
    glow: "rgba(255,51,51,0.5)",
    icon: <Users className="w-10 h-10" />,
    // modalDesc:
    //   "Our vendor relations team is obsessed with quality. They scout, vet, and support every vendor on the DAN floor — ensuring that every bite at our events is genuinely worth talking about.",
    // members: [
    //   {
    //     name: "Scouting",
    //     title: "Vendor Discovery",
    //     bio: "Constantly out in Lagos finding hidden food gems, emerging vendors, and cult-favourite spots that belong on the DAN stage.",
    //     imageUrl: "",
    //   },
    //   {
    //     name: "Standards",
    //     title: "Quality & Compliance",
    //     bio: "Every vendor goes through a rigorous quality check. This team ensures DAN's reputation for excellence is earned at every single stall.",
    //     imageUrl: "",
    //   },
    //   {
    //     name: "Support",
    //     title: "Vendor Success",
    //     bio: "From onboarding to event day, this team is in the vendors' corner — briefing, prepping, and making sure every vendor walks away having sold out.",
    //     imageUrl: "",
    //   },
    // ],
  },
  {
    name: "Guest Experience & Community Lead",
    role: "Ajibola",
    desc: "Manages attendee experience from ticket purchase to post-event engagement, ensuring high satisfaction and strong community retention.",
    color: "#FF3333",
    glow: "rgba(255,51,51,0.5)",
    icon: <Users className="w-10 h-10" />,
  },
  {
    name: "Operations & Production Lead",
    role: "Zena",
    desc: "Oversees the planning, logistics, and execution of all events, ensuring seamless delivery across vendors, venue, staffing, and production.",
    color: "#00FF41",
    glow: "rgba(0,255,65,0.5)",
    icon: <Clapperboard className="w-10 h-10" />,
  },
];

const values = [
  {
    title: "Community First",
    desc: "We exist to create space for Lagos food vendors, creatives, and night owls to come together. Everyone is welcome at our table.",
    icon: <Globe className="w-8 h-8" />,
    color: "#FFFF00",
  },
  {
    title: "Quality Over Everything",
    desc: "Every vendor, every activation, every detail is curated. We'd rather do less and do it right.",
    icon: <Star className="w-8 h-8" />,
    color: "#FF3333",
  },
  {
    title: "Rooted in Culture",
    desc: "Dine at Night is shaped by the energy, flavours, and people that inspire it. What starts in Lagos is built to travel.",
    icon: <Landmark className="w-8 h-8" />,
    color: "#00FF41",
  },
  {
    title: "Vendor Success = Our Success",
    desc: "Our vendors' 100% return rate and 90% sell-out rate isn't luck — it's because we genuinely invest in their success.",
    icon: <TrendingUp className="w-8 h-8" />,
    color: "#FFFF00",
  },
];

const timeline = [
  {
    year: "2025",
    title: "The Idea",
    desc: "Dine at Night was born from a shared obsession with food and food experiences. From dinners to markets to travelling just to eat, we wanted more from how food was experienced in Lagos. So we asked a simple question. Why isn’t there a proper nighttime food market?",
    color: "#FFFF00",
  },
  {
    year: "DECEMBER 2025",
    title: "Edition 1",
    desc: "The first Dine at Night launches and sells 800+ tickets. Vendors sell out. The energy is undeniable. It is clear Lagos was ready for this.",
    color: "#FF3333",
  },
  {
    year: "EASTER 2026",
    title: "POP UP",
    desc: "A limited, chef-led edition of Dine at Night. A more intimate, curated experience featuring a select lineup of chefs and one-off menus.",
    color: "#00FF41",
  },
  {
    year: "DECEMBER 2026",
    title: "EDITION 2",
    desc: "Dine at Night returns bigger, sharper, and more ambitious. New vendors, new experiences, same energy.",
    color: "#FFFF00",
  },
  {
    year: "Future",
    title: "The Vision",
    desc: "Multi-city expansion across Nigeria and Africa. Dine At Night becomes the definitive nighttime food experience on the continent.",
    color: "#FFFF00",
  },
];

export default function AboutPage() {
  const [vendorModalOpen, setVendorModalOpen] = useState(false);

  return (
    <div className="relative w-full min-h-screen bg-black overflow-x-hidden">
      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center h-[50vh] pt-28 pb-20 px-6 text-center overflow-hidden">
        <HeroCarousel accent="#FFFF00" />

        <div
          className="absolute inset-0 pointer-events-none z-1"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,0,0.06) 0%, transparent 70%)",
          }}
        />
        <motion.h1
          className="relative z-10 text-5xl sm:text-7xl md:text-8xl uppercase tracking-tight leading-none"
          style={{
            color: "transparent",
            WebkitTextStroke: "2px #FFFF00",
            textShadow: "0 0 40px rgba(255,255,0,0.3)",
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          About Dine At Night
        </motion.h1>
        <motion.p
          className="relative z-10 mt-6 text-gray-300 text-lg sm:text-xl max-w-2xl leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          Dine at Night was born from a simple obsession: a love for food,
          shared experiences and how Lagos comes alive after dark.
        </motion.p>
      </section>

      <NeonMarquee />

      {/* ── STATS ── */}
      <SectionFadeIn>
        <section className="py-14 px-6 md:px-16 bg-black/85 border-y border-white/5">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-5 md:flex md:justify-between md:items-center">
            {[
              {
                label: "Tickets Sold",
                value: 800,
                suffix: "+",
                color: "#FFFF00",
                glow: "rgba(255,255,0,0.25)",
              },
              {
                label: "of vendors said they’d come back",
                value: 100,
                suffix: "%",
                color: "#00FF41",
                glow: "rgba(0,255,65,0.25)",
              },
              {
                label: "of vendors sold out’",
                value: 90,
                suffix: "%",
                color: "#FFFF00",
                glow: "rgba(255,255,0,0.25)",
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="rounded-xl border p-6 text-center"
                style={{
                  borderColor: `${stat.color}25`,
                  boxShadow: `0 0 20px ${stat.glow}`,
                  background: "linear-gradient(135deg, #0a0a0a, #040404)",
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div
                  className="text-4xl md:text-5xl font-bold"
                  style={{
                    color: stat.color,
                    textShadow: `0 0 20px ${stat.color}`,
                  }}
                >
                  <Counter value={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-gray-500 text-xs uppercase tracking-widest mt-2">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      </SectionFadeIn>

      {/* ── ORIGIN STORY ── */}
      <SectionFadeIn>
        <section className="pt-10 pb-5 px-6 md:px-24 bg-black/75">
          <div className="max-w-4xl mx-auto">
            <h2
              className="text-4xl md:text-5xl uppercase tracking-wider mb-10 text-center"
              style={{
                color: "transparent",
                WebkitTextStroke: "2px #FF3333",
                textShadow: "0 0 20px rgba(255,51,51,0.4)",
              }}
            >
              Why We Exist
            </h2>
            <div className="space-y-6 text-gray-300 text-base text-justify md:text-lg leading-loose">
              <p>
                Lagos is a city that never truly sleeps, but for years its
                nightlife lacked one crucial element. A space where the city’s
                food culture could come alive after dark.
              </p>
              <p>
                Food is deeply woven into the fabric of Lagos life. Yet the
                experience of enjoying it, the atmosphere, the energy, the
                presentation, had never been elevated into something
                intentional, curated, and memorable.
              </p>
              <p>
                <span
                  style={{
                    color: "#FFFF00",
                    textShadow: "0 0 10px rgba(255,255,0,0.5)",
                  }}
                >
                  Dine At Night changes that.
                </span>{" "}
                We bring together the city’s most exciting food brands and
                vendors and place them in a setting designed for how Lagos eats,
                gathers, and connects. The result is an experience that feels
                distinctly Lagos.
              </p>
              <p>Our first edition proved what was possible.</p>
              <p>800+ people showed up.</p>
              <p>90% of vendors sold out.</p>
              <p>And every vendor said they would return..</p>
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── VALUES ── */}
      <SectionFadeIn>
        <section className="py-10 px-6 md:px-16 bg-black/82 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <h2
              className="text-4xl md:text-5xl uppercase tracking-wider mb-14 text-center"
              style={{
                color: "transparent",
                WebkitTextStroke: "2px #00FF41",
                textShadow: "0 0 20px rgba(0,255,65,0.4)",
              }}
            >
              What We Stand For
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {values.map((val, i) => (
                <motion.div
                  key={val.title}
                  className="rounded-xl border p-6"
                  style={{
                    borderColor: `${val.color}20`,
                    background: "linear-gradient(135deg, #090909, #040404)",
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{
                    borderColor: val.color,
                    boxShadow: `0 0 25px ${val.color}25`,
                  }}
                >
                  <div
                    className="mb-3"
                    style={{
                      color: val.color,
                      filter: `drop-shadow(0 0 6px ${val.color}80)`,
                    }}
                  >
                    {val.icon}
                  </div>
                  <h3
                    className="text-lg font-bold uppercase tracking-wide mb-2"
                    style={{ color: val.color }}
                  >
                    {val.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {val.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── TIMELINE ── */}
      <SectionFadeIn>
        <section className="py-10 px-6 md:px-24 bg-black/75">
          <div className="max-w-3xl mx-auto">
            <h2
              className="text-4xl md:text-5xl uppercase tracking-wider mb-16 text-center"
              style={{
                color: "transparent",
                WebkitTextStroke: "2px #FFFF00",
                textShadow: "0 0 20px rgba(255,255,0,0.4)",
              }}
            >
              Our Journey
            </h2>
            <div className="relative">
              {/* Vertical line */}
              <div
                className="absolute left-5 top-0 bottom-0 w-px"
                style={{
                  background:
                    "linear-gradient(to bottom, #FFFF00, #FF3333, #00FF41, transparent)",
                }}
              />
              <div className="space-y-12">
                {timeline.map((item, i) => (
                  <motion.div
                    key={item.year}
                    className="flex gap-6 items-start"
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.12 }}
                  >
                    <div
                      className="shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center text-[10px] font-bold relative z-10"
                      style={{
                        borderColor: item.color,
                        color: item.color,
                        background: "#000",
                        boxShadow: `0 0 14px ${item.color}50`,
                      }}
                    >
                      {item.year.length <= 4 ? item.year.slice(-2) : "✦"}
                    </div>
                    <div>
                      <p
                        className="text-[10px] tracking-[0.4em] uppercase mb-1"
                        style={{ color: item.color }}
                      >
                        {item.year}
                      </p>
                      <h3 className="text-xl font-bold text-white uppercase tracking-wide mb-2">
                        {item.title}
                      </h3>
                      <p className="text-gray-500 text-sm leading-relaxed max-w-lg">
                        {item.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── TEAM ── */}
      <SectionFadeIn>
        <section className="py-10 px-6 md:px-16 bg-black/85 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <h2
              className="text-4xl md:text-5xl uppercase tracking-wider mb-14 text-center"
              style={{
                color: "transparent",
                WebkitTextStroke: "2px #FF3333",
                textShadow: "0 0 20px rgba(255,51,51,0.4)",
              }}
            >
              The Team
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {teamMembers.map((member, i) => (
                <motion.div
                  key={member.name}
                  className="relative rounded-2xl border p-7 overflow-hidden cursor-pointer flex flex-col justify-between"
                  style={{
                    borderColor: `${member.color}25`,
                    background: "linear-gradient(135deg, #080808, #030303)",
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  whileHover={{
                    borderColor: member.color,
                    boxShadow: `0 0 30px ${member.glow}30`,
                  }}
                >
                  <span
                    className="absolute top-0 left-0 w-6 h-6"
                    style={{
                      borderTop: `2px solid ${member.color}`,
                      borderLeft: `2px solid ${member.color}`,
                    }}
                  />
                  <span
                    className="absolute bottom-0 right-0 w-6 h-6"
                    style={{
                      borderBottom: `2px solid ${member.color}`,
                      borderRight: `2px solid ${member.color}`,
                    }}
                  />

                  <div
                    className="mb-4"
                    style={{
                      color: member.color,
                      filter: `drop-shadow(0 0 8px ${member.glow})`,
                    }}
                  >
                    {member.icon}
                  </div>
                  <h3
                    className="text-lg font-bold uppercase tracking-wide mb-1"
                    style={{
                      color: member.color,
                      textShadow: `0 0 10px ${member.glow}`,
                    }}
                  >
                    {member.name}
                  </h3>
                  <p className="text-gray-600 text-lg uppercase tracking-widest mb-4">
                    {member.role}
                  </p>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {member.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── JOIN US CTA ── */}
      <SectionFadeIn>
        <section className="py-10 px-6 text-center border-t border-white/5">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2
              className="text-3xl sm:text-5xl uppercase tracking-wider"
              style={{
                color: "#FFFF00",
                textShadow: "0 0 30px rgba(255,255,0,0.5)",
              }}
            >
              Be Part of the Night
            </h2>
            <p className="text-gray-400 text-base">
              Whether you&apos;re a food vendor, brand, or night owl —
              there&apos;s a place for you at Dine At Night.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                onClick={() => setVendorModalOpen(true)}
                className="px-8 py-3 rounded-full font-bold uppercase tracking-widest text-black text-sm"
                style={{
                  background: "#FFFF00",
                  boxShadow: "0 0 25px rgba(255,255,0,0.5)",
                }}
                whileHover={{
                  scale: 1.04,
                  boxShadow: "0 0 45px rgba(255,255,0,0.7)",
                }}
                whileTap={{ scale: 0.97 }}
              >
                Become a Vendor
              </motion.button>
              <Link href="/event">
                <motion.button
                  className="px-8 py-3 rounded-full font-bold uppercase tracking-widest text-sm border-2 border-[#00FF41] text-[#00FF41]"
                  style={{ boxShadow: "0 0 15px rgba(0,255,65,0.3)" }}
                  whileHover={{
                    scale: 1.04,
                    boxShadow: "0 0 30px rgba(0,255,65,0.6)",
                  }}
                  whileTap={{ scale: 0.97 }}
                >
                  Buy Tickets
                </motion.button>
              </Link>
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── MILESTONES Carousel ── */}
      <section className="py-10 px-6 md:px-16 border-t border-white/5 bg-black/75">
        <div className="max-w-3xl mx-auto">
          <Carousel
            title="By The Numbers"
            accentColor="#FFFF00"
            glowColor="rgba(255,255,0,0.4)"
            autoPlayInterval={5000}
            items={[
              {
                id: 1,
                content: (
                  <div
                    className="text-center py-10 px-6 rounded-xl border mx-2"
                    style={{
                      borderColor: "rgba(255,255,0,0.2)",
                      background: "rgba(10,10,10,0.8)",
                    }}
                  >
                    <p
                      className="text-7xl font-bold"
                      style={{
                        color: "#FFFF00",
                        textShadow: "0 0 30px rgba(255,255,0,0.6)",
                      }}
                    >
                      800+
                    </p>
                    <p className="text-gray-400 text-sm uppercase tracking-widest mt-3">
                      Tickets Sold
                    </p>
                  </div>
                ),
              },
              {
                id: 2,
                content: (
                  <div
                    className="text-center py-10 px-6 rounded-xl border mx-2"
                    style={{
                      borderColor: "rgba(255,51,51,0.2)",
                      background: "rgba(10,10,10,0.8)",
                    }}
                  >
                    <p
                      className="text-7xl font-bold"
                      style={{
                        color: "#FF3333",
                        textShadow: "0 0 30px rgba(255,51,51,0.6)",
                      }}
                    >
                      100%
                    </p>
                    <p className="text-gray-400 text-sm uppercase tracking-widest mt-3">
                      of vendors said they’d come back
                    </p>
                  </div>
                ),
              },
              {
                id: 3,
                content: (
                  <div
                    className="text-center py-10 px-6 rounded-xl border mx-2"
                    style={{
                      borderColor: "rgba(0,255,65,0.2)",
                      background: "rgba(10,10,10,0.8)",
                    }}
                  >
                    <p
                      className="text-7xl font-bold"
                      style={{
                        color: "#00FF41",
                        textShadow: "0 0 30px rgba(0,255,65,0.6)",
                      }}
                    >
                      90%
                    </p>
                    <p className="text-gray-400 text-sm uppercase tracking-widest mt-3">
                      of vendors sold out’
                    </p>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </section>

      <Footer />
      <VendorModal
        isOpen={vendorModalOpen}
        onClose={() => setVendorModalOpen(false)}
      />
    </div>
  );
}
