"use client";

import { useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import Footer from "../_components/Footer";
import Carousel from "../_components/Carousel";

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

type MediaType = "all" | "photos" | "videos";

/* ── Gallery Data ──
 * ASSET NEEDED: Replace Unsplash placeholder URLs with real event photos
 * and Cloudinary video URLs once the client provides media assets.
 */
const galleryItems = [
  { id: 1, type: "photo" as const, src: "https://images.unsplash.com/photo-1574936145840-28808d77a0b6?q=80&w=1200&auto=format&fit=crop", thumb: "https://images.unsplash.com/photo-1574936145840-28808d77a0b6?q=80&w=600&auto=format&fit=crop", caption: "The night market lit up under neon", edition: "Edition 1", color: "#FFFF00", span: "col-span-2 row-span-2" },
  { id: 2, type: "photo" as const, src: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?q=80&w=1200&auto=format&fit=crop", thumb: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?q=80&w=600&auto=format&fit=crop", caption: "Suya Spot draws the longest lines", edition: "Edition 1", color: "#FF3333", span: "" },
  { id: 3, type: "photo" as const, src: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f1a?q=80&w=1200&auto=format&fit=crop", thumb: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f1a?q=80&w=600&auto=format&fit=crop", caption: "Jollof Wars — the smoke was real", edition: "Edition 1", color: "#FF3333", span: "" },
  { id: 4, type: "video" as const, src: "https://res.cloudinary.com/dhhvxjczm/video/upload/v1771177374/dine_at_nightV_z3tk7p.mp4", thumb: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=600&auto=format&fit=crop", caption: "Chapman Bar doing numbers all night", edition: "Edition 1", color: "#00FF41", span: "" },
  { id: 5, type: "photo" as const, src: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?q=80&w=1200&auto=format&fit=crop", thumb: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?q=80&w=600&auto=format&fit=crop", caption: "Small chops, big energy", edition: "Edition 1", color: "#FFFF00", span: "" },
  { id: 6, type: "photo" as const, src: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop", thumb: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600&auto=format&fit=crop", caption: "Asun Alley — the heat was palpable", edition: "Edition 1", color: "#FF3333", span: "" },
  { id: 7, type: "video" as const, src: "https://res.cloudinary.com/dhhvxjczm/video/upload/v1771179581/dine_at_nightV2_kfirxq.mp4", thumb: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=600&auto=format&fit=crop", caption: "DAN vibes — Edition 1 recap", edition: "Edition 1", color: "#FF3333", span: "col-span-2" },
  { id: 8, type: "photo" as const, src: "https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=1200&auto=format&fit=crop", thumb: "https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=600&auto=format&fit=crop", caption: "Nkwobi Nights — tradition served fresh", edition: "Edition 1", color: "#00FF41", span: "" },
  { id: 9, type: "photo" as const, src: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1200&auto=format&fit=crop", thumb: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop", caption: "Topsis bringing fusion to the night", edition: "Edition 1", color: "#FFFF00", span: "" },
  { id: 10, type: "photo" as const, src: "https://images.unsplash.com/photo-1626015449066-133cc6114871?q=80&w=1200&auto=format&fit=crop", thumb: "https://images.unsplash.com/photo-1626015449066-133cc6114871?q=80&w=600&auto=format&fit=crop", caption: "Puff Puff Palace — always sold out first", edition: "Edition 1", color: "#FF3333", span: "" },
  { id: 11, type: "photo" as const, src: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1200&auto=format&fit=crop", thumb: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=600&auto=format&fit=crop", caption: "Fresh produce, fresh energy", edition: "Edition 1", color: "#00FF41", span: "" },
  { id: 12, type: "photo" as const, src: "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?q=80&w=1200&auto=format&fit=crop", thumb: "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?q=80&w=600&auto=format&fit=crop", caption: "Ensweet desserts — Lagos reimagined", edition: "Edition 1", color: "#FFFF00", span: "" },
];

export default function GalleryPage() {
  const [filter, setFilter] = useState<MediaType>("all");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});

  const filtered = filter === "all" ? galleryItems : galleryItems.filter((i) => i.type === filter.slice(0, -1));

  const openLightbox = (id: number) => {
    setLightbox(id);
    document.body.style.overflow = "hidden";
  };
  const closeLightbox = () => {
    setLightbox(null);
    document.body.style.overflow = "";
  };

  const currentIndex = lightbox ? filtered.findIndex((i) => i.id === lightbox) : -1;
  const navigate = (dir: 1 | -1) => {
    const next = filtered[(currentIndex + dir + filtered.length) % filtered.length];
    setLightbox(next.id);
  };

  const lightboxItem = lightbox ? galleryItems.find((i) => i.id === lightbox) : null;

  return (
    <div className="relative w-full min-h-screen bg-black overflow-x-hidden">
      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center pt-28 pb-16 px-6 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,255,65,0.05) 0%, transparent 70%)" }}
        />
        <motion.p
          className="text-xs tracking-[0.4em] uppercase mb-3"
          style={{ color: "#00FF41", textShadow: "0 0 12px rgba(0,255,65,0.7)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Edition 1
        </motion.p>
        <motion.h1
          className="text-5xl sm:text-7xl uppercase tracking-tight"
          style={{
            color: "transparent",
            WebkitTextStroke: "2px #00FF41",
            textShadow: "0 0 40px rgba(0,255,65,0.3)",
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          Gallery
        </motion.h1>
        <motion.p
          className="mt-4 text-gray-400 text-base sm:text-lg max-w-md"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
        >
          Relive the night. Edition 1 through photos and video — the energy, the food, the people.
        </motion.p>
      </section>

      {/* ── FILTER ── */}
      <SectionFadeIn>
        <section className="px-6 pb-6">
          <div className="max-w-6xl mx-auto flex gap-3 justify-center">
            {(["all", "photos", "videos"] as MediaType[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className="px-6 py-2 rounded-full text-xs sm:text-sm font-bold uppercase tracking-widest transition-all border"
                style={{
                  borderColor: filter === type ? "#00FF41" : "rgba(255,255,255,0.1)",
                  color: filter === type ? "#00FF41" : "rgba(255,255,255,0.4)",
                  boxShadow: filter === type ? "0 0 15px rgba(0,255,65,0.35)" : "none",
                  background: filter === type ? "rgba(0,255,65,0.08)" : "transparent",
                }}
              >
                {type === "all" ? "All" : type === "photos" ? "📸 Photos" : "🎬 Videos"}
              </button>
            ))}
          </div>
        </section>
      </SectionFadeIn>

      {/* ── MASONRY GRID ── */}
      <SectionFadeIn>
        <section className="px-4 md:px-8 pb-20">
          <div className="max-w-6xl mx-auto">
            <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-[200px]">
              <AnimatePresence mode="popLayout">
                {filtered.map((item, i) => (
                  <motion.div
                    key={item.id}
                    layout
                    className={`relative group cursor-pointer rounded-xl overflow-hidden border ${item.span}`}
                    style={{ borderColor: `${item.color}20` }}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.88 }}
                    transition={{ delay: i * 0.04, duration: 0.35 }}
                    whileHover={{ borderColor: item.color, boxShadow: `0 0 25px ${item.color}40` }}
                    onClick={() => openLightbox(item.id)}
                  >
                    {item.type === "video" ? (
                      <video
                        ref={(el) => { videoRefs.current[item.id] = el; }}
                        src={item.src}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        playsInline
                        onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play().catch(() => {})}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLVideoElement).pause(); (e.currentTarget as HTMLVideoElement).currentTime = 0; }}
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.thumb}
                        alt={item.caption}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    )}

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-all duration-300 flex flex-col items-center justify-center">
                      {item.type === "video" && (
                        <div
                          className="w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2"
                          style={{ borderColor: item.color, boxShadow: `0 0 14px ${item.color}50`, background: "rgba(0,0,0,0.7)" }}
                        >
                          <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-b-[8px] border-b-transparent ml-0.5" style={{ borderLeftColor: item.color }} />
                        </div>
                      )}
                      <p className="text-white text-xs text-center px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 leading-relaxed">
                        {item.caption}
                      </p>
                    </div>

                    {/* Edition badge */}
                    <div
                      className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: item.color, color: "#000" }}
                    >
                      {item.edition}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── LIGHTBOX ── */}
      <AnimatePresence>
        {lightbox && lightboxItem && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLightbox}
          >
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md" />

            {/* Close */}
            <button
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/40 transition-all"
              onClick={closeLightbox}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Prev / Next */}
            <button
              className="absolute left-4 z-10 w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-gray-400 hover:text-white transition-all"
              onClick={(e) => { e.stopPropagation(); navigate(-1); }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              className="absolute right-4 z-10 w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-gray-400 hover:text-white transition-all"
              onClick={(e) => { e.stopPropagation(); navigate(1); }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <motion.div
              className="relative z-10 max-w-4xl w-full mx-4"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {lightboxItem.type === "video" ? (
                <video
                  src={lightboxItem.src}
                  className="w-full max-h-[80vh] rounded-xl object-contain"
                  controls
                  autoPlay
                  style={{ border: `2px solid ${lightboxItem.color}40` }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={lightboxItem.src}
                  alt={lightboxItem.caption}
                  className="w-full max-h-[80vh] rounded-xl object-contain"
                  style={{ border: `2px solid ${lightboxItem.color}40` }}
                />
              )}
              <p
                className="mt-3 text-center text-sm text-gray-400 tracking-wide"
                style={{ textShadow: `0 0 10px ${lightboxItem.color}30` }}
              >
                {lightboxItem.caption}
              </p>
              <p className="text-center text-[10px] tracking-[0.3em] uppercase text-gray-600 mt-1">
                {currentIndex + 1} / {filtered.length}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HIGHLIGHTS Carousel ── */}
      <SectionFadeIn>
        <section className="py-20 px-6 md:px-16 border-t border-white/5 bg-black/80">
          <div className="max-w-3xl mx-auto">
            <Carousel
              title="Edition 1 Highlights"
              accentColor="#FFFF00"
              glowColor="rgba(255,255,0,0.4)"
              autoPlayInterval={5000}
              items={[
                { id: 1, content: (<div className="text-center py-10 px-6 rounded-xl border mx-2" style={{ borderColor: "rgba(255,255,0,0.2)", background: "rgba(10,10,10,0.8)" }}><div className="text-5xl mb-3">🔥</div><h3 className="text-xl font-bold uppercase tracking-wide" style={{ color: "#FFFF00" }}>The Night</h3><p className="text-gray-400 text-sm mt-2 leading-relaxed">Lagos had never seen a night food market like this. Neon lights, great food, unforgettable energy.</p></div>) },
                { id: 2, content: (<div className="text-center py-10 px-6 rounded-xl border mx-2" style={{ borderColor: "rgba(255,51,51,0.2)", background: "rgba(10,10,10,0.8)" }}><div className="text-5xl mb-3">🎵</div><h3 className="text-xl font-bold uppercase tracking-wide" style={{ color: "#FF3333" }}>The Music</h3><p className="text-gray-400 text-sm mt-2 leading-relaxed">DJs and live performances kept the crowd moving all night. The soundtrack was as good as the food.</p></div>) },
                { id: 3, content: (<div className="text-center py-10 px-6 rounded-xl border mx-2" style={{ borderColor: "rgba(0,255,65,0.2)", background: "rgba(10,10,10,0.8)" }}><div className="text-5xl mb-3">🍖</div><h3 className="text-xl font-bold uppercase tracking-wide" style={{ color: "#00FF41" }}>The Food</h3><p className="text-gray-400 text-sm mt-2 leading-relaxed">Over 30 vendors. 90% sold out. The best of Lagos street food elevated under neon lights.</p></div>) },
                { id: 4, content: (<div className="text-center py-10 px-6 rounded-xl border mx-2" style={{ borderColor: "rgba(255,255,0,0.2)", background: "rgba(10,10,10,0.8)" }}><div className="text-5xl mb-3">👥</div><h3 className="text-xl font-bold uppercase tracking-wide" style={{ color: "#FFFF00" }}>The Community</h3><p className="text-gray-400 text-sm mt-2 leading-relaxed">850+ attendees. New friendships. Old memories. The DAN community is unlike any other.</p></div>) },
              ]}
            />
          </div>
        </section>
      </SectionFadeIn>

      {/* ── IG CTA ── */}
      <SectionFadeIn>
        <section className="py-16 px-6 text-center border-t border-white/5">
          <p className="text-gray-600 text-sm tracking-widest uppercase mb-4">
            More on social media
          </p>
          <a
            href="https://instagram.com/dineatnight"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full border-2 border-[#FFFF00] text-[#FFFF00] text-sm font-bold uppercase tracking-widest transition-all"
            style={{ boxShadow: "0 0 15px rgba(255,255,0,0.3)", textShadow: "0 0 8px rgba(255,255,0,0.6)" }}
          >
            Follow @dineatnight
          </a>
        </section>
      </SectionFadeIn>

      <Footer />
    </div>
  );
}
