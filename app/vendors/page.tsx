"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import VendorModal from "../_components/VendorModal";
import Footer from "../_components/Footer";
import TestimonialSection from "../_components/TestimonialSection";
import {
  getApprovedVendors,
  getActiveEvents,
  type DanVendor,
} from "@/lib/firestore";
import {
  UtensilsCrossed,
  X,
  Instagram,
  ShoppingBag,
  Calendar,
  Phone,
  Mail,
} from "lucide-react";

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

// Map a single Firestore category string to filter key
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

// Get all category strings for a vendor (handles both legacy `category` and new `categories` array)
const vendorCategoryList = (v: DanVendor): string[] =>
  v.categories?.length ? v.categories : v.category ? [v.category] : [];

// ── Vendor Detail Modal ───────────────────────────────────────────────────────
function VendorDetailModal({
  vendor,
  palette,
  onClose,
}: {
  vendor: DanVendor;
  palette: { color: string; glow: string };
  onClose: () => void;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const images = vendor.imageUrls?.length
    ? vendor.imageUrls
    : vendor.imageUrl
      ? [vendor.imageUrl]
      : [];

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(
      () => setImgIdx((i) => (i + 1) % images.length),
      3500,
    );
    return () => clearInterval(t);
  }, [images.length]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const products = vendor.products
    ? vendor.products
        .split(/[,\n]/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  return (
    <motion.div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

      <motion.div
        className="relative w-full sm:max-w-lg max-h-[93svh] sm:max-h-[88vh] overflow-y-auto bg-[#060606] border sm:rounded-2xl rounded-t-3xl"
        style={{
          borderColor: `${palette.color}30`,
          boxShadow: `0 0 60px ${palette.glow}15`,
        }}
        initial={{ y: "100%", scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full border border-white/10 bg-black/50 backdrop-blur-sm flex items-center justify-center text-gray-400 hover:text-white hover:border-white/30 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Image slideshow */}
        {images.length > 0 && (
          <div className="relative h-60 sm:h-72 overflow-hidden sm:rounded-t-2xl rounded-t-3xl flex-shrink-0">
            {images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src + i}
                src={src}
                alt={`${vendor.brandName} ${i + 1}`}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
                style={{ opacity: i === imgIdx ? 1 : 0 }}
              />
            ))}
            {/* Gradient overlay */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, transparent 40%, rgba(6,6,6,0.95) 100%)",
              }}
            />
            {/* Corner accents */}
            <span
              className="absolute top-0 left-0 w-8 h-8"
              style={{
                borderTop: `2px solid ${palette.color}`,
                borderLeft: `2px solid ${palette.color}`,
              }}
            />
            <span
              className="absolute bottom-0 right-0 w-8 h-8"
              style={{
                borderBottom: `2px solid ${palette.color}`,
                borderRight: `2px solid ${palette.color}`,
              }}
            />
            {/* Dot indicators */}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: i === imgIdx ? "14px" : "5px",
                      height: "5px",
                      background:
                        i === imgIdx ? palette.color : "rgba(255,255,255,0.35)",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Header — logo + name + categories */}
        <div className="px-6 pt-5 flex items-center gap-4">
          {vendor.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vendor.logoUrl}
              alt={`${vendor.brandName} logo`}
              className="w-14 h-14 rounded-full object-contain border bg-white/5 p-1 flex-shrink-0"
              style={{ borderColor: `${palette.color}35` }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <div className="min-w-0">
            <h2
              className="text-2xl font-bold uppercase tracking-wide leading-tight"
              style={{
                color: palette.color,
                textShadow: `0 0 15px ${palette.glow}`,
              }}
            >
              {vendor.brandName}
            </h2>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
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
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Description */}
          {vendor.description && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-1.5">
                About
              </p>
              <p className="text-gray-300 text-sm leading-relaxed">
                {vendor.description}
              </p>
            </div>
          )}

          {/* Menu / Products */}
          {products.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-gray-600 text-[10px] uppercase tracking-widest mb-2">
                <ShoppingBag className="w-3 h-3" /> Menu / Products
              </div>
              <div className="flex flex-wrap gap-2">
                {products.map((p) => (
                  <span
                    key={p}
                    className="text-xs px-3 py-1 rounded-full border border-white/10 text-gray-300"
                    style={{ background: `${palette.color}08` }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Events */}
          {(vendor.events?.length ?? 0) > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-gray-600 text-[10px] uppercase tracking-widest mb-2">
                <Calendar className="w-3 h-3" /> Events
              </div>
              <div className="flex flex-wrap gap-2">
                {vendor.events!.map((ev) => (
                  <span
                    key={ev}
                    className="text-[10px] px-2.5 py-1 rounded-full border border-white/10 text-gray-400 uppercase tracking-wide"
                  >
                    {ev}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contact info */}
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-0.5">
              Contact
            </p>

            {vendor.email && (
              <a
                href={`mailto:${vendor.email}`}
                className="flex items-center gap-3 group w-fit"
              >
                <Mail className="w-3.5 h-3.5 text-gray-600 group-hover:text-white transition-colors flex-shrink-0" />
                <span className="text-gray-300 text-sm group-hover:text-white transition-colors break-all">
                  {vendor.email}
                </span>
              </a>
            )}

            {vendor.phone && (
              <a
                href={`tel:${vendor.phone}`}
                className="flex items-center gap-3 group w-fit"
              >
                <Phone className="w-3.5 h-3.5 text-gray-600 group-hover:text-white transition-colors flex-shrink-0" />
                <span className="text-gray-300 text-sm group-hover:text-white transition-colors">
                  {vendor.phone}
                </span>
              </a>
            )}

            {vendor.instagram && (
              <a
                href={`https://instagram.com/${vendor.instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 group w-fit"
              >
                <Instagram
                  className="w-3.5 h-3.5 flex-shrink-0 transition-colors"
                  style={{ color: palette.color }}
                />
                <span
                  className="text-sm font-bold uppercase tracking-widest transition-colors"
                  style={{ color: palette.color }}
                >
                  {vendor.instagram.startsWith("@")
                    ? vendor.instagram
                    : `@${vendor.instagram}`}
                </span>
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
// ──────────────────────────────────────────────────────────────────────────────

// ── Vendor Logo Strip ─────────────────────────────────────────────────────────
// Single logo + name chip
function VendorLogoChip({ v }: { v: DanVendor }) {
  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={v.logoUrl!}
        alt={v.brandName}
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-contain border border-white/10 bg-white/5 p-1.5 transition-all duration-300 hover:border-[#FFFF00]/40 hover:shadow-[0_0_15px_rgba(255,255,0,0.2)]"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      <span className="text-[9px] text-gray-600 uppercase tracking-wide text-center max-w-[72px] leading-tight">
        {v.brandName}
      </span>
    </div>
  );
}

// Centered when logos fit one row; switches to infinite marquee when they overflow
function VendorLogoStrip({ logoVendors }: { logoVendors: DanVendor[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [isMarquee, setIsMarquee] = useState(false);

  useEffect(() => {
    const measure = () => {
      if (measureRef.current && containerRef.current) {
        setIsMarquee(
          measureRef.current.scrollWidth > containerRef.current.clientWidth,
        );
      }
    };
    const t = setTimeout(measure, 60); // small delay for images
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [logoVendors.length]);

  const duration = Math.max(logoVendors.length * 3, 16);
  // Triple the list so the loop is visually seamless (translateX -33.333%)
  const triple = [...logoVendors, ...logoVendors, ...logoVendors];

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Hidden measurement row — no-wrap so we get the true single-line width */}
      <div
        ref={measureRef}
        className="absolute flex flex-nowrap gap-10 invisible pointer-events-none"
        aria-hidden="true"
      >
        {logoVendors.map((v, i) => (
          <VendorLogoChip key={`m-${v.id ?? v.brandName}-${i}`} v={v} />
        ))}
      </div>

      {isMarquee ? (
        <>
          <style>{`
            @keyframes vendor-scroll {
              0%   { transform: translateX(0); }
              100% { transform: translateX(-33.333%); }
            }
            .vendor-scroll-track {
              animation: vendor-scroll ${duration}s linear infinite;
            }
            .vendor-scroll-track:hover { animation-play-state: paused; }
          `}</style>
          <div className="vendor-scroll-track flex flex-nowrap gap-10 w-max">
            {triple.map((v, i) => (
              <VendorLogoChip key={`s-${v.id ?? v.brandName}-${i}`} v={v} />
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-wrap justify-center gap-10">
          {logoVendors.map((v, i) => (
            <VendorLogoChip key={`c-${v.id ?? v.brandName}-${i}`} v={v} />
          ))}
        </div>
      )}
    </div>
  );
}
// ──────────────────────────────────────────────────────────────────────────────

// Slideshow component — auto-advances through multiple images
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
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src + i}
          src={src}
          alt={`${alt} ${i + 1}`}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: i === idx ? 1 : 0 }}
        />
      ))}
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition-colors duration-500" />
      {/* Corner accents */}
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
      {/* Dot indicators */}
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

// Cycle of accent colors for cards
const COLORS = [
  { color: "#FFFF00", glow: "rgba(255,255,0,0.5)" },
  { color: "#FF3333", glow: "rgba(255,51,51,0.5)" },
  { color: "#00FF41", glow: "rgba(0,255,65,0.5)" },
];

type FilterKey =
  | "all"
  | "grilled"
  | "rice"
  | "street"
  | "snacks"
  | "desserts"
  | "drinks"
  | "fusion"
  | "other";

const filterCategories: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All Vendors" },
  { key: "grilled", label: "Grilled & BBQ" },
  { key: "rice", label: "Rice & Stews" },
  { key: "street", label: "Street Food" },
  { key: "snacks", label: "Snacks" },
  { key: "desserts", label: "Desserts" },
  { key: "drinks", label: "Drinks" },
  { key: "fusion", label: "Fusion" },
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
  const [vendorLoadError, setVendorLoadError] = useState(false);
  const [activeEventTitle, setActiveEventTitle] = useState("");
  const [selected, setSelected] = useState<{
    v: DanVendor;
    palette: { color: string; glow: string };
  } | null>(null);

  useEffect(() => {
    getApprovedVendors()
      .then((data) => {
        setVendors(data);
        setVendorLoadError(false);
      })
      .catch(() => {
        setVendors([]);
        setVendorLoadError(true);
      })
      .finally(() => setLoadingVendors(false));
  }, []);

  useEffect(() => {
    getActiveEvents()
      .then((evs) => {
        if (evs[0]?.title) setActiveEventTitle(evs[0].title);
      })
      .catch(() => {});
  }, []);

  const filtered = vendors.filter((v) => {
    if (activeFilter === "all") return true;
    return vendorCategoryList(v).some(
      (cat) => categoryToFilter(cat) === activeFilter,
    );
  });

  return (
    <div className="relative w-full min-h-screen bg-black overflow-x-hidden">
      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center pt-28 pb-16 px-6 text-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://i.pinimg.com/1200x/b8/5b/60/b85b605e6fcf1210ddcb6cf456957f5e.jpg"
            alt=""
            className="w-full h-full object-cover object-center"
          />
          {/* Dark overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0.92) 100%)",
            }}
          />
        </div>
        {/* Red neon tint */}
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,51,51,0.08) 0%, transparent 70%)",
          }}
        />
        <motion.p
          className="relative z-10 text-xs tracking-[0.7em] uppercase mb-3"
          style={{
            color: "#FF3333",
            textShadow: "0 0 12px rgba(255,51,51,0.7)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Curated Vendors
        </motion.p>
        <motion.h1
          className="relative z-10 text-5xl sm:text-7xl uppercase tracking-tight"
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
          className="relative z-10 mt-4 text-gray-300 text-base sm:text-lg max-w-xl"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
        >
          Every vendor at Dine At Night is handpicked. Quality food, real
          flavour — no shortcuts.
        </motion.p>

        <motion.div
          className="relative z-10 mt-8 flex flex-col sm:flex-row gap-4"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <motion.button
            onClick={() => setVendorModalOpen(true)}
            className="px-8 py-3 rounded-full text-sm font-bold uppercase tracking-widest border-2 border-[#FFFF00] text-[#FFFF00]"
            style={{
              boxShadow: "0 0 20px rgba(255,255,0,0.3)",
              textShadow: "0 0 10px rgba(255,255,0,0.7)",
            }}
            whileHover={{
              scale: 1.03,
              boxShadow: "0 0 35px rgba(255,255,0,0.6)",
            }}
            whileTap={{ scale: 0.97 }}
          >
            Apply to Vend →
          </motion.button>
        </motion.div>
      </section>

      {/* ── VENDOR LOGO STRIP ── */}
      {vendors.some((v) => v.logoUrl) && (
        <section className="py-10 border-y border-white/5">
          <p className="text-center text-[10px] tracking-[0.5em] text-gray-700 uppercase mb-6">
            Our Vendors
          </p>
          <VendorLogoStrip logoVendors={vendors.filter((v) => v.logoUrl)} />
        </section>
      )}

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
                    borderColor:
                      activeFilter === cat.key
                        ? "#FF3333"
                        : "rgba(255,255,255,0.1)",
                    color:
                      activeFilter === cat.key
                        ? "#FF3333"
                        : "rgba(255,255,255,0.4)",
                    boxShadow:
                      activeFilter === cat.key
                        ? "0 0 15px rgba(255,51,51,0.35)"
                        : "none",
                    background:
                      activeFilter === cat.key
                        ? "rgba(255,51,51,0.08)"
                        : "transparent",
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
                {[...Array(6)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : vendorLoadError ? (
              <div className="text-center py-24">
                <UtensilsCrossed className="w-14 h-14 mx-auto mb-4 text-gray-700" />
                <p className="text-gray-500 text-lg">
                  Couldn&apos;t load vendors.
                </p>
                <p className="text-gray-700 text-sm mt-2">
                  Check your Firestore security rules — the{" "}
                  <code className="text-gray-600">vendors</code> collection
                  needs{" "}
                  <code className="text-gray-600">allow read: if true</code>.
                </p>
                <button
                  onClick={() => {
                    setVendorLoadError(false);
                    setLoadingVendors(true);
                    getApprovedVendors()
                      .then((data) => {
                        setVendors(data);
                        setVendorLoadError(false);
                      })
                      .catch(() => {
                        setVendors([]);
                        setVendorLoadError(true);
                      })
                      .finally(() => setLoadingVendors(false));
                  }}
                  className="mt-4 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-white/15 text-gray-500 hover:text-white hover:border-white/30 transition-all"
                >
                  Retry
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-24">
                <UtensilsCrossed className="w-14 h-14 mx-auto mb-4 text-gray-700" />
                <p className="text-gray-500 text-lg">
                  {vendors.length === 0
                    ? "No vendors confirmed yet — check back soon!"
                    : "No vendors in this category."}
                </p>
              </div>
            ) : (
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filtered.map((vendor, i) => {
                  const palette = COLORS[i % COLORS.length];
                  return (
                    <motion.div
                      key={vendor.id ?? vendor.brandName}
                      layout
                      className="relative group rounded-2xl overflow-hidden border cursor-pointer"
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
                      onClick={() => setSelected({ v: vendor, palette })}
                    >
                      {/* Image slideshow */}
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
                        {/* Category chips */}
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
                        <p className="text-gray-400 text-sm leading-relaxed">
                          {vendor.description}
                        </p>
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
              {activeEventTitle
                ? `${activeEventTitle} vendor applications are now open.`
                : "Applications are now open."}{" "}
              Join Lagos&apos; most exciting food market and get your brand in
              front of thousands of hungry night owls.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
              {[
                "High foot traffic",
                "Brand visibility",
                "100% vendor return rate",
                "Supportive organizers",
              ].map((b) => (
                <span key={b} className="flex items-center gap-1.5">
                  <span style={{ color: "#00FF41" }}>✓</span> {b}
                </span>
              ))}
            </div>
            <motion.button
              onClick={() => setVendorModalOpen(true)}
              className="px-10 py-4 rounded-full font-bold uppercase tracking-widest text-black text-sm mt-2"
              style={{
                background: "#FFFF00",
                boxShadow: "0 0 30px rgba(255,255,0,0.5)",
              }}
              whileHover={{
                scale: 1.04,
                boxShadow: "0 0 50px rgba(255,255,0,0.7)",
              }}
              whileTap={{ scale: 0.97 }}
            >
              Apply to Vend →
            </motion.button>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── TESTIMONIALS (live from Firestore) ── */}
      <SectionFadeIn>
        <section className="py-20 px-6 md:px-16 border-t border-white/5 bg-black/80">
          <div className="max-w-5xl mx-auto">
            <TestimonialSection
              title="What They Say"
              accentColor="#FF3333"
              showForm={true}
            />
          </div>
        </section>
      </SectionFadeIn>

      <Footer />
      <VendorModal
        isOpen={vendorModalOpen}
        onClose={() => setVendorModalOpen(false)}
      />

      {/* ── Vendor Detail Modal ── */}
      <AnimatePresence>
        {selected && (
          <VendorDetailModal
            vendor={selected.v}
            palette={selected.palette}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
