"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import VendorModal from "../_components/VendorModal";
import Footer from "../_components/Footer";
import Carousel from "../_components/Carousel";
import { getApprovedVendors, type DanVendor } from "@/lib/firestore";

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

// Map Firestore category to filter key
const categoryToFilter = (cat: string): string => {
  const c = cat.toLowerCase();
  if (c.includes("grill") || c.includes("bbq")) return "grilled";
  if (c.includes("rice") || c.includes("stew")) return "rice";
  if (c.includes("street")) return "street";
  if (c.includes("snack") || c.includes("finger")) return "snacks";
  if (c.includes("dessert") || c.includes("sweet")) return "desserts";
  if (c.includes("drink") || c.includes("cocktail")) return "drinks";
  if (c.includes("fusion") || c.includes("international")) return "fusion";
  return "other";
};

// Cycle of accent colors for cards
const COLORS = [
  { color: "#FFFF00", glow: "rgba(255,255,0,0.5)" },
  { color: "#FF3333", glow: "rgba(255,51,51,0.5)" },
  { color: "#00FF41", glow: "rgba(0,255,65,0.5)" },
];

type FilterKey = "all" | "grilled" | "rice" | "street" | "snacks" | "desserts" | "drinks" | "fusion" | "other";

const filterCategories: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All Vendors" },
  { key: "grilled", label: "Grilled & BBQ 🔥" },
  { key: "rice", label: "Rice & Stews 🍚" },
  { key: "street", label: "Street Food 🍌" },
  { key: "snacks", label: "Snacks 🥟" },
  { key: "desserts", label: "Desserts 🍮" },
  { key: "drinks", label: "Drinks 🍹" },
  { key: "fusion", label: "Fusion 🍔" },
];

const SkeletonCard = () => (
  <div className="rounded-2xl overflow-hidden border border-white/5 animate-pulse">
    <div className="h-52 bg-white/5" />
    <div className="p-5 bg-[#070707] space-y-3">
      <div className="h-5 w-2/3 bg-white/5 rounded" />
      <div className="h-3 w-1/3 bg-white/5 rounded" />
      <div className="h-4 w-full bg-white/5 rounded" />
    </div>
  </div>
);

export default function VendorsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [vendors, setVendors] = useState<DanVendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);

  useEffect(() => {
    getApprovedVendors()
      .then((data) => setVendors(data))
      .catch(() => setVendors([]))
      .finally(() => setLoadingVendors(false));
  }, []);

  const filtered = vendors.filter((v) => {
    if (activeFilter === "all") return true;
    return categoryToFilter(v.category) === activeFilter;
  });

  return (
    <div className="relative w-full min-h-screen bg-black overflow-x-hidden">
      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center pt-28 pb-16 px-6 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,51,51,0.06) 0%, transparent 70%)" }}
        />
        <motion.p
          className="text-xs tracking-[0.4em] uppercase mb-3"
          style={{ color: "#FF3333", textShadow: "0 0 12px rgba(255,51,51,0.7)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Edition 1 Line-up
        </motion.p>
        <motion.h1
          className="text-5xl sm:text-7xl uppercase tracking-tight"
          style={{
            color: "transparent",
            WebkitTextStroke: "2px #FF3333",
            textShadow: "0 0 40px rgba(255,51,51,0.3)",
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          Our Vendors
        </motion.h1>
        <motion.p
          className="mt-4 text-gray-400 text-base sm:text-lg max-w-xl"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
        >
          Every vendor at Dine At Night is handpicked. Quality food, real flavour — no shortcuts.
        </motion.p>

        <motion.div
          className="mt-8 flex flex-col sm:flex-row gap-4"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <motion.button
            onClick={() => setVendorModalOpen(true)}
            className="px-8 py-3 rounded-full text-sm font-bold uppercase tracking-widest border-2 border-[#FFFF00] text-[#FFFF00]"
            style={{ boxShadow: "0 0 20px rgba(255,255,0,0.3)", textShadow: "0 0 10px rgba(255,255,0,0.7)" }}
            whileHover={{ scale: 1.03, boxShadow: "0 0 35px rgba(255,255,0,0.6)" }}
            whileTap={{ scale: 0.97 }}
          >
            Apply to Vend →
          </motion.button>
        </motion.div>
      </section>

      {/* ── FILTER PILLS ── */}
      <SectionFadeIn>
        <section className="px-6 pb-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {filterCategories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveFilter(cat.key)}
                  className="flex-shrink-0 px-5 py-2 rounded-full text-xs sm:text-sm font-bold uppercase tracking-widest transition-all duration-300 border"
                  style={{
                    borderColor: activeFilter === cat.key ? "#FF3333" : "rgba(255,255,255,0.1)",
                    color: activeFilter === cat.key ? "#FF3333" : "rgba(255,255,255,0.4)",
                    boxShadow: activeFilter === cat.key ? "0 0 15px rgba(255,51,51,0.35)" : "none",
                    background: activeFilter === cat.key ? "rgba(255,51,51,0.08)" : "transparent",
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── VENDORS GRID ── */}
      <SectionFadeIn>
        <section className="py-10 px-6 md:px-16">
          <div className="max-w-6xl mx-auto">
            {loadingVendors ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-5xl mb-4">🍽️</p>
                <p className="text-gray-500 text-lg">
                  {vendors.length === 0
                    ? "No vendors confirmed yet — check back soon!"
                    : "No vendors in this category."}
                </p>
              </div>
            ) : (
              <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((vendor, i) => {
                  const palette = COLORS[i % COLORS.length];
                  return (
                    <motion.div
                      key={vendor.id ?? vendor.brandName}
                      layout
                      className="relative group rounded-2xl overflow-hidden border"
                      style={{
                        borderColor: `${palette.color}25`,
                        boxShadow: `0 0 15px ${palette.glow}10`,
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                      whileHover={{
                        borderColor: palette.color,
                        boxShadow: `0 0 35px ${palette.glow}`,
                      }}
                    >
                      {/* Image background */}
                      <div className="relative h-52 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={vendor.imageUrl}
                          alt={vendor.brandName}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/60" />

                        {/* Corner accents */}
                        <span className="absolute top-0 left-0 w-6 h-6" style={{ borderTop: `2px solid ${palette.color}`, borderLeft: `2px solid ${palette.color}` }} />
                        <span className="absolute bottom-0 right-0 w-6 h-6" style={{ borderBottom: `2px solid ${palette.color}`, borderRight: `2px solid ${palette.color}` }} />
                      </div>

                      <div className="p-5 bg-[#070707]">
                        <h3
                          className="text-xl font-bold uppercase tracking-wide"
                          style={{ color: palette.color, textShadow: `0 0 12px ${palette.glow}` }}
                        >
                          {vendor.brandName}
                        </h3>
                        <p className="text-xs text-gray-600 uppercase tracking-widest mt-0.5 mb-3">{vendor.category}</p>
                        <p className="text-gray-400 text-sm leading-relaxed">{vendor.description}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </section>
      </SectionFadeIn>

      {/* ── BECOME A VENDOR CTA ── */}
      <SectionFadeIn>
        <section className="py-20 px-6 text-center border-t border-white/5">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2
              className="text-3xl sm:text-5xl uppercase tracking-wider"
              style={{
                color: "transparent",
                WebkitTextStroke: "2px #FFFF00",
                textShadow: "0 0 30px rgba(255,255,0,0.3)",
              }}
            >
              Want to Vend?
            </h2>
            <p className="text-gray-400 text-base leading-relaxed">
              Edition 2 applications are now open. Join Lagos&apos; most exciting food market
              and get your brand in front of thousands of hungry night owls.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
              {["High foot traffic", "Brand visibility", "100% vendor return rate", "Supportive organizers"].map((b) => (
                <span key={b} className="flex items-center gap-1.5">
                  <span style={{ color: "#00FF41" }}>✓</span> {b}
                </span>
              ))}
            </div>
            <motion.button
              onClick={() => setVendorModalOpen(true)}
              className="px-10 py-4 rounded-full font-bold uppercase tracking-widest text-black text-sm mt-2"
              style={{ background: "#FFFF00", boxShadow: "0 0 30px rgba(255,255,0,0.5)" }}
              whileHover={{ scale: 1.04, boxShadow: "0 0 50px rgba(255,255,0,0.7)" }}
              whileTap={{ scale: 0.97 }}
            >
              Apply to Vend →
            </motion.button>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── VENDOR TESTIMONIALS Carousel ── */}
      <section className="py-20 px-6 md:px-16 border-t border-white/5 bg-black/80">
        <div className="max-w-3xl mx-auto">
          <Carousel
            title="What Our Vendors Say"
            accentColor="#FF3333"
            glowColor="rgba(255,51,51,0.4)"
            autoPlayInterval={6000}
            items={[
              { id: 1, content: (
                <div className="relative rounded-xl border p-8 bg-black/60 mx-2" style={{ borderColor: "rgba(255,51,51,0.2)" }}>
                  <span className="absolute -top-4 left-8 text-4xl" style={{ color: "#FF3333" }}>&ldquo;</span>
                  <p className="text-gray-300 text-base leading-relaxed italic">&ldquo;The event was well coordinated. Considering it was the first edition, there was a large turnout which was effectively managed. The organizers were very supportive.&rdquo;</p>
                  <p className="mt-4 font-bold text-sm uppercase tracking-widest" style={{ color: "#FF3333" }}>— Norma</p>
                </div>
              )},
              { id: 2, content: (
                <div className="relative rounded-xl border p-8 bg-black/60 mx-2" style={{ borderColor: "rgba(255,255,0,0.2)" }}>
                  <span className="absolute -top-4 left-8 text-4xl" style={{ color: "#FFFF00" }}>&ldquo;</span>
                  <p className="text-gray-300 text-base leading-relaxed italic">&ldquo;DAT was a very welcome novel experience to the Lagos food festival scene. The organisers got the M.O. to the T!! Looking forward to future editions.&rdquo;</p>
                  <p className="mt-4 font-bold text-sm uppercase tracking-widest" style={{ color: "#FFFF00" }}>— Topsis Burger Lab</p>
                </div>
              )},
              { id: 3, content: (
                <div className="relative rounded-xl border p-8 bg-black/60 mx-2" style={{ borderColor: "rgba(0,255,65,0.2)" }}>
                  <span className="absolute -top-4 left-8 text-4xl" style={{ color: "#00FF41" }}>&ldquo;</span>
                  <p className="text-gray-300 text-base leading-relaxed italic">&ldquo;It was a super fun event — we loved how interactive it was, and how vendors had spotlights that allowed us to be included in the interactivity.&rdquo;</p>
                  <p className="mt-4 font-bold text-sm uppercase tracking-widest" style={{ color: "#00FF41" }}>— Ensweet</p>
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
