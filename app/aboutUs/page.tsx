"use client";

import { useRef } from "react";
import { motion, useInView, animate } from "framer-motion";
import { useEffect } from "react";
import Footer from "../_components/Footer";
import Carousel from "../_components/Carousel";
import VendorModal from "../_components/VendorModal";
import { useState } from "react";
import Link from "next/link";

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

const Counter = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-20px" });

  useEffect(() => {
    if (isInView && ref.current) {
      const controls = animate(0, value, {
        duration: 2.5,
        ease: "easeOut",
        onUpdate(v) {
          if (ref.current) ref.current.textContent = Math.floor(v).toLocaleString() + suffix;
        },
      });
      return () => controls.stop();
    }
  }, [value, suffix, isInView]);

  return <span ref={ref} />;
};

const teamMembers = [
  { name: "The Organizers", role: "Founders & Creative Direction", desc: "The team behind Dine At Night is a group of passionate Lagos creatives who saw a gap in the city's nightlife — great food with no great setting. They built the night.", color: "#FFFF00", glow: "rgba(255,255,0,0.5)", emoji: "👑" },
  { name: "Vendor Relations", role: "Curation & Partnerships", desc: "Our vendor team hand-picks every stall. Every vendor at DAN meets strict quality standards — because your night deserves only the best.", color: "#FF3333", glow: "rgba(255,51,51,0.5)", emoji: "🤝" },
  { name: "Production Crew", role: "Logistics & Experience Design", desc: "From the neon lights to the stage setup, our production crew transforms any space into an immersive night market you won't forget.", color: "#00FF41", glow: "rgba(0,255,65,0.5)", emoji: "🎪" },
];

const values = [
  { title: "Community First", desc: "We exist to create space for Lagos food vendors, creatives, and night owls to come together. Everyone is welcome at our table.", icon: "🌍", color: "#FFFF00" },
  { title: "Quality Over Everything", desc: "Every vendor, every activation, every detail is curated. We'd rather do less and do it right.", icon: "⭐", color: "#FF3333" },
  { title: "Authentically Lagos", desc: "DAN is rooted in Lagos culture — the energy, the flavours, the people. We celebrate where we're from.", icon: "🌃", color: "#00FF41" },
  { title: "Vendor Success = Our Success", desc: "Our vendors' 100% return rate and 90% sell-out rate isn't luck — it's because we genuinely invest in their success.", icon: "📈", color: "#FFFF00" },
];

const timeline = [
  { year: "2023", title: "The Idea", desc: "Dine At Night is conceived over a late-night suya run. A question is asked: why isn't there a proper nighttime food market in Lagos?", color: "#FFFF00" },
  { year: "2024", title: "Edition 1", desc: "The first Dine At Night sells 850+ tickets, attracts 30+ vendors, and has a 90% sell-out rate. Edition 2 is immediately demanded.", color: "#FF3333" },
  { year: "2026", title: "Edition 2", desc: "DAN returns bigger, longer, louder. New vendors, new activations, same relentless energy.", color: "#00FF41" },
  { year: "Future", title: "The Vision", desc: "Multi-city expansion across Nigeria and Africa. Dine At Night becomes the definitive nighttime food experience on the continent.", color: "#FFFF00" },
];

export default function AboutPage() {
  const [vendorModalOpen, setVendorModalOpen] = useState(false);

  return (
    <div className="relative w-full min-h-screen bg-black overflow-x-hidden">
      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center pt-28 pb-20 px-6 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,0,0.06) 0%, transparent 70%)" }}
        />
        <motion.p
          className="text-xs tracking-[0.4em] uppercase mb-3"
          style={{ color: "#FFFF00", textShadow: "0 0 12px rgba(255,255,0,0.7)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Our Story
        </motion.p>
        <motion.h1
          className="text-5xl sm:text-7xl md:text-8xl uppercase tracking-tight leading-none"
          style={{
            color: "transparent",
            WebkitTextStroke: "2px #FFFF00",
            textShadow: "0 0 40px rgba(255,255,0,0.3)",
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          About DAN
        </motion.h1>
        <motion.p
          className="mt-6 text-gray-300 text-lg sm:text-xl max-w-2xl leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          Dine At Night was born from a simple obsession: Lagos deserves a world-class
          nighttime food experience. So we built it.
        </motion.p>
      </section>

      {/* ── STATS ── */}
      <SectionFadeIn>
        <section className="py-14 px-6 md:px-16 bg-black/85 border-y border-white/5">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { label: "Tickets Sold", value: 850, suffix: "+", color: "#FFFF00", glow: "rgba(255,255,0,0.25)" },
              { label: "Vendors", value: 30, suffix: "+", color: "#FF3333", glow: "rgba(255,51,51,0.25)" },
              { label: "Vendors Sold Out", value: 90, suffix: "%", color: "#00FF41", glow: "rgba(0,255,65,0.25)" },
              { label: "Return Rate", value: 100, suffix: "%", color: "#FFFF00", glow: "rgba(255,255,0,0.25)" },
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
                  style={{ color: stat.color, textShadow: `0 0 20px ${stat.color}` }}
                >
                  <Counter value={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-gray-500 text-xs uppercase tracking-widest mt-2">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </SectionFadeIn>

      {/* ── ORIGIN STORY ── */}
      <SectionFadeIn>
        <section className="py-20 px-6 md:px-24 bg-black/75">
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
            <div className="space-y-6 text-gray-300 text-base md:text-lg leading-loose">
              <p>
                Lagos is a city that never truly sleeps — but for years, its nightlife lacked one crucial element:
                a space where the city&apos;s best food vendors could come alive after dark.
              </p>
              <p>
                Street food culture is deeply woven into the fabric of Lagos life. But the experience of
                enjoying it — the atmosphere, the energy, the presentation — had never been elevated into
                something truly spectacular.
              </p>
              <p>
                <span style={{ color: "#FFFF00", textShadow: "0 0 10px rgba(255,255,0,0.5)" }}>
                  Dine At Night changes that.
                </span>{" "}
                We curate the city&apos;s finest food vendors, place them under neon lights, add great music
                and community, and create an experience that Lagos hasn&apos;t seen before.
              </p>
              <p>
                Edition 1 proved the concept. 850+ attendees showed up. 90% of vendors sold out.
                Every single vendor said they&apos;d come back. And they will.
              </p>
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── VALUES ── */}
      <SectionFadeIn>
        <section className="py-20 px-6 md:px-16 bg-black/82 border-t border-white/5">
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
                  whileHover={{ borderColor: val.color, boxShadow: `0 0 25px ${val.color}25` }}
                >
                  <div className="text-3xl mb-3">{val.icon}</div>
                  <h3
                    className="text-lg font-bold uppercase tracking-wide mb-2"
                    style={{ color: val.color }}
                  >
                    {val.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{val.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── TIMELINE ── */}
      <SectionFadeIn>
        <section className="py-20 px-6 md:px-24 bg-black/75">
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
                style={{ background: "linear-gradient(to bottom, #FFFF00, #FF3333, #00FF41, transparent)" }}
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
                      className="flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center text-[10px] font-bold relative z-10"
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
                      <p className="text-[10px] tracking-[0.4em] uppercase mb-1" style={{ color: item.color }}>
                        {item.year}
                      </p>
                      <h3 className="text-xl font-bold text-white uppercase tracking-wide mb-2">{item.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed max-w-lg">{item.desc}</p>
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
        <section className="py-20 px-6 md:px-16 bg-black/85 border-t border-white/5">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {teamMembers.map((member, i) => (
                <motion.div
                  key={member.name}
                  className="relative rounded-2xl border p-7 overflow-hidden"
                  style={{
                    borderColor: `${member.color}25`,
                    background: "linear-gradient(135deg, #080808, #030303)",
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  whileHover={{ borderColor: member.color, boxShadow: `0 0 30px ${member.glow}30` }}
                >
                  <span className="absolute top-0 left-0 w-6 h-6" style={{ borderTop: `2px solid ${member.color}`, borderLeft: `2px solid ${member.color}` }} />
                  <span className="absolute bottom-0 right-0 w-6 h-6" style={{ borderBottom: `2px solid ${member.color}`, borderRight: `2px solid ${member.color}` }} />

                  <div className="text-4xl mb-4">{member.emoji}</div>
                  <h3
                    className="text-lg font-bold uppercase tracking-wide mb-1"
                    style={{ color: member.color, textShadow: `0 0 10px ${member.glow}` }}
                  >
                    {member.name}
                  </h3>
                  <p className="text-gray-600 text-xs uppercase tracking-widest mb-4">{member.role}</p>
                  <p className="text-gray-400 text-sm leading-relaxed">{member.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── JOIN US CTA ── */}
      <SectionFadeIn>
        <section className="py-20 px-6 text-center border-t border-white/5">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2
              className="text-3xl sm:text-5xl uppercase tracking-wider"
              style={{ color: "#FFFF00", textShadow: "0 0 30px rgba(255,255,0,0.5)" }}
            >
              Be Part of the Night
            </h2>
            <p className="text-gray-400 text-base">
              Whether you&apos;re a food vendor, brand, or night owl — there&apos;s a place
              for you at Dine At Night.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                onClick={() => setVendorModalOpen(true)}
                className="px-8 py-3 rounded-full font-bold uppercase tracking-widest text-black text-sm"
                style={{ background: "#FFFF00", boxShadow: "0 0 25px rgba(255,255,0,0.5)" }}
                whileHover={{ scale: 1.04, boxShadow: "0 0 45px rgba(255,255,0,0.7)" }}
                whileTap={{ scale: 0.97 }}
              >
                Apply to Vend
              </motion.button>
              <Link href="/contact">
                <motion.button
                  className="px-8 py-3 rounded-full font-bold uppercase tracking-widest text-sm border-2 border-[#00FF41] text-[#00FF41]"
                  style={{ boxShadow: "0 0 15px rgba(0,255,65,0.3)" }}
                  whileHover={{ scale: 1.04, boxShadow: "0 0 30px rgba(0,255,65,0.6)" }}
                  whileTap={{ scale: 0.97 }}
                >
                  Contact Us
                </motion.button>
              </Link>
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── MILESTONES Carousel ── */}
      <section className="py-20 px-6 md:px-16 border-t border-white/5 bg-black/75">
        <div className="max-w-3xl mx-auto">
          <Carousel
            title="By The Numbers"
            accentColor="#FFFF00"
            glowColor="rgba(255,255,0,0.4)"
            autoPlayInterval={5000}
            items={[
              { id: 1, content: (
                <div className="text-center py-10 px-6 rounded-xl border mx-2" style={{ borderColor: "rgba(255,255,0,0.2)", background: "rgba(10,10,10,0.8)" }}>
                  <p className="text-7xl font-bold" style={{ color: "#FFFF00", textShadow: "0 0 30px rgba(255,255,0,0.6)" }}>850+</p>
                  <p className="text-gray-400 text-sm uppercase tracking-widest mt-3">Tickets Sold — Edition 1</p>
                </div>
              )},
              { id: 2, content: (
                <div className="text-center py-10 px-6 rounded-xl border mx-2" style={{ borderColor: "rgba(255,51,51,0.2)", background: "rgba(10,10,10,0.8)" }}>
                  <p className="text-7xl font-bold" style={{ color: "#FF3333", textShadow: "0 0 30px rgba(255,51,51,0.6)" }}>90%</p>
                  <p className="text-gray-400 text-sm uppercase tracking-widest mt-3">Vendors Sold Out</p>
                </div>
              )},
              { id: 3, content: (
                <div className="text-center py-10 px-6 rounded-xl border mx-2" style={{ borderColor: "rgba(0,255,65,0.2)", background: "rgba(10,10,10,0.8)" }}>
                  <p className="text-7xl font-bold" style={{ color: "#00FF41", textShadow: "0 0 30px rgba(0,255,65,0.6)" }}>100%</p>
                  <p className="text-gray-400 text-sm uppercase tracking-widest mt-3">Vendor Return Rate</p>
                </div>
              )},
              { id: 4, content: (
                <div className="text-center py-10 px-6 rounded-xl border mx-2" style={{ borderColor: "rgba(255,255,0,0.2)", background: "rgba(10,10,10,0.8)" }}>
                  <p className="text-7xl font-bold" style={{ color: "#FFFF00", textShadow: "0 0 30px rgba(255,255,0,0.6)" }}>20K+</p>
                  <p className="text-gray-400 text-sm uppercase tracking-widest mt-3">Instagram Followers</p>
                </div>
              )},
            ]}
          />
        </div>
      </section>

      <Footer />
      <VendorModal isOpen={vendorModalOpen} onClose={() => setVendorModalOpen(false)} />
    </div>
  );
}
