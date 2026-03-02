"use client";

import { useState, useRef, useEffect, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SectionFadeIn from "../_components/SectionFadeIn";
import { useRouter, useSearchParams } from "next/navigation";
import { X, ChevronLeft, ChevronRight, Camera, Film } from "lucide-react";
import Footer from "../_components/Footer";
import Carousel from "../_components/Carousel";
import { subscribeGalleryItems, type DanGalleryItem } from "@/lib/firestore";
import { useScrollLock } from "@/lib/useScrollLock";
import { getCache, setCache } from "@/lib/cache";
import NeonMarquee from "../_components/NeonMarquee";

type MediaType = "all" | "photos" | "videos";

const spanFor = (i: number) => {
  if (i % 7 === 0) return "col-span-2 row-span-2";
  if (i % 7 === 6) return "col-span-2";
  return "";
};

const ACCENTS = ["#FFFF00", "#FF3333", "#00FF41"];
const accentFor = (eventId: string, eventIds: string[]) => {
  const idx = eventIds.indexOf(eventId);
  return ACCENTS[idx % ACCENTS.length] ?? "#FFFF00";
};

function GalleryContent() {
  const router = useRouter();
  const params = useSearchParams();

  const [items, setItems] = useState<DanGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [mediaFilter, setMediaFilter] = useState<MediaType>("all");
  const [lightbox, setLightbox] = useState<{ id: string; item: DanGalleryItem } | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [heroIdx, setHeroIdx] = useState(0);

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const resolvedRef = useRef(false);

  useEffect(() => {
    resolvedRef.current = false;
    const cached = getCache<DanGalleryItem[]>("dan_gallery");
    if (cached) {
      setItems(cached);
      setLoading(false);
      resolvedRef.current = true;
    }
    return subscribeGalleryItems((data) => {
      setItems(data);
      setCache("dan_gallery", data);
      if (!resolvedRef.current) {
        setLoading(false);
        resolvedRef.current = true;
      }
    });
  }, []);

  // Reset lightbox whenever the media filter changes so a stale ID can't
  // reference an item that no longer exists in the filtered list.
  useEffect(() => {
    setLightbox(null);
  }, [mediaFilter]);

  // Auto-open event overlay if URL param is present after items load
  useEffect(() => {
    const ev = params.get("event");
    if (ev && items.length > 0) setSelectedEventId(ev);
  }, [params, items]);

  // Unique event IDs in insertion order
  const eventIds = [...new Set(items.map((i) => i.eventId))];

  // eventId → eventTitle map
  const eventTitleMap: Record<string, string> = {};
  items.forEach((i) => {
    eventTitleMap[i.eventId] = i.eventTitle;
  });

  // Event summary cards
  const eventCards = eventIds.map((eid) => {
    const evItems = items.filter((i) => i.eventId === eid);
    const thumbnail =
      evItems.find((i) => i.type === "photo")?.src ?? evItems[0]?.src ?? "";
    const photoCount = evItems.filter((i) => i.type === "photo").length;
    const videoCount = evItems.filter((i) => i.type === "video").length;
    return {
      eventId: eid,
      title: eventTitleMap[eid] ?? eid,
      thumbnail,
      photoCount,
      videoCount,
    };
  });

  // Up to 4 random photos for the witty highlights cards
  const highlightPhotos = useMemo(() => {
    const photos = items.filter((i) => i.type === "photo");
    return [...photos].sort(() => Math.random() - 0.5).slice(0, 4);
  }, [items]);

  // Random cross-event carousel picks (round-robin for variety, max 8)
  const carouselPicks = useMemo(() => {
    if (items.length === 0) return [];
    const byEvent: Record<string, DanGalleryItem[]> = {};
    items.forEach((item) => {
      if (!byEvent[item.eventId]) byEvent[item.eventId] = [];
      byEvent[item.eventId].push(item);
    });
    // Shuffle each event's items
    const groups = Object.values(byEvent).map((arr) =>
      [...arr].sort(() => Math.random() - 0.5),
    );
    const result: DanGalleryItem[] = [];
    let i = 0;
    while (result.length < 8 && groups.some((g) => g.length > 0)) {
      const group = groups[i % groups.length];
      if (group.length > 0) result.push(group.shift()!);
      i++;
    }
    return result;
  }, [items]);

  // Hero slideshow auto-advance
  useEffect(() => {
    if (carouselPicks.length <= 1) return;
    const id = setInterval(
      () => setHeroIdx((i) => (i + 1) % carouselPicks.length),
      5000,
    );
    return () => clearInterval(id);
  }, [carouselPicks.length]);

  useScrollLock(!!selectedEventId);

  const openEvent = (eid: string) => {
    setSelectedEventId(eid);
    setMediaFilter("all");
    setLightbox(null);
    router.replace(`/gallery?event=${eid}`, { scroll: false });
  };

  const closeEvent = () => {
    setSelectedEventId(null);
    setLightbox(null);
    router.replace("/gallery", { scroll: false });
  };

  // Items for the open event overlay (with media type filter applied)
  const overlayItems = selectedEventId
    ? items.filter((i) => {
        const typeMatch =
          mediaFilter === "all" ||
          (mediaFilter === "photos" && i.type === "photo") ||
          (mediaFilter === "videos" && i.type === "video");
        return i.eventId === selectedEventId && typeMatch;
      })
    : [];

  // Lightbox helpers
  const openLightbox = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) setLightbox({ id, item });
  };
  const closeLightbox = () => setLightbox(null);
  const currentIndex = lightbox
    ? overlayItems.findIndex((i) => i.id === lightbox.id)
    : -1;
  const navigate = (dir: 1 | -1) => {
    const next =
      overlayItems[
        (currentIndex + dir + overlayItems.length) % overlayItems.length
      ];
    if (next) {
      setDirection(dir);
      setLightbox({ id: next.id!, item: next });
    }
  };

  const overlayAccent = selectedEventId
    ? accentFor(selectedEventId, eventIds)
    : "#00FF41";

  return (
    <div className="relative w-full min-h-screen bg-black overflow-x-hidden">
      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center min-h-[70svh] px-6 text-center pt-24 pb-16 overflow-hidden mb-5">
        {/* Slideshow background */}
        <AnimatePresence mode="sync">
          {carouselPicks.length > 0 && (
            <motion.div
              key={heroIdx}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
            >
              {carouselPicks[heroIdx]?.type === "video" ? (
                <video
                  src={carouselPicks[heroIdx].src}
                  className="w-full h-full object-cover object-center"
                  muted
                  loop
                  playsInline
                  autoPlay
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={carouselPicks[heroIdx]?.src}
                  alt=""
                  className="w-full h-full object-cover object-center"
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overlays */}
        <div className="absolute inset-0 bg-black/50" />
        {/* Bottom-to-black gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, #000000 0%, rgba(0,0,0,0.7) 25%, rgba(0,0,0,0.2) 55%, transparent 100%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,255,65,0.08) 0%, transparent 70%)",
          }}
        />

        {/* Text */}
        <motion.p
          className="relative z-10 text-xs tracking-[0.7em] uppercase mb-3"
          style={{
            color: "#00FF41",
            textShadow: "0 0 12px rgba(0,255,65,0.7)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Live in the Moment
        </motion.p>
        <motion.h1
          className="relative z-10 text-5xl sm:text-7xl uppercase tracking-tight"
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
          className="relative z-10 mt-4 text-gray-300 text-base sm:text-lg max-w-md"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
        >
          Relive the night. Every edition through photos and video.
        </motion.p>

        {/* Dot indicators */}
        {carouselPicks.length > 1 && (
          <div className="relative z-10 flex gap-2 mt-8">
            {carouselPicks.map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroIdx(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === heroIdx ? "20px" : "8px",
                  height: "8px",
                  background:
                    i === heroIdx ? "#00FF41" : "rgba(255,255,255,0.3)",
                  boxShadow:
                    i === heroIdx ? "0 0 8px rgba(0,255,65,0.8)" : "none",
                }}
              />
            ))}
          </div>
        )}
      </section>

      <NeonMarquee />

      {/* ── EVENT CARDS ── */}
      <SectionFadeIn>
        <section className="px-4 md:px-8 pb-20 pt-5">
          <div className="max-w-6xl mx-auto">
            <div className="mb-10 text-center">
              <p
                className="text-[10px] tracking-[0.6em] uppercase mb-2"
                style={{ color: "#00FF41" }}
              >
                Every Edition
              </p>
              <h2
                className="text-4xl sm:text-5xl uppercase tracking-tight"
                style={{
                  color: "transparent",
                  WebkitTextStroke: "1.5px #00FF41",
                  textShadow: "0 0 30px rgba(0,255,65,0.25)",
                }}
              >
                The Experience
              </h2>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[4/3] rounded-2xl animate-pulse"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  />
                ))}
              </div>
            ) : eventCards.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-24 rounded-2xl border"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <Camera
                  className="w-10 h-10 mb-3"
                  style={{ color: "rgba(255,255,255,0.1)" }}
                />
                <p className="text-gray-600 text-sm">No gallery items yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {eventCards.map((card, i) => {
                  const accent = accentFor(card.eventId, eventIds);
                  return (
                    <motion.button
                      key={card.eventId}
                      onClick={() => openEvent(card.eventId)}
                      className="group relative rounded-2xl overflow-hidden border text-left w-full"
                      style={{ borderColor: `${accent}25` }}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.5 }}
                      whileHover={{
                        borderColor: accent,
                        boxShadow: `0 0 35px ${accent}30`,
                      }}
                    >
                      {/* Thumbnail — full card */}
                      <div className="aspect-[4/3] relative overflow-hidden">
                        {card.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={card.thumbnail}
                            alt={card.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ background: "rgba(255,255,255,0.03)" }}
                          >
                            <Camera
                              className="w-10 h-10"
                              style={{ color: "rgba(255,255,255,0.1)" }}
                            />
                          </div>
                        )}
                        {/* Bottom gradient */}
                        <div
                          className="absolute inset-0"
                          style={{
                            background:
                              "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 40%, transparent 100%)",
                          }}
                        />
                        {/* Info — always visible on the card */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3
                            className="text-sm font-bold uppercase tracking-widest"
                            style={{
                              color: accent,
                              textShadow: `0 0 12px ${accent}60`,
                            }}
                          >
                            {card.title}
                          </h3>
                          <div className="flex gap-4 mt-1.5">
                            {card.photoCount > 0 && (
                              <span className="flex items-center gap-1 text-[10px] text-gray-400 uppercase tracking-widest">
                                <Camera className="w-3 h-3" />
                                {card.photoCount} photo
                                {card.photoCount !== 1 ? "s" : ""}
                              </span>
                            )}
                            {card.videoCount > 0 && (
                              <span className="flex items-center gap-1 text-[10px] text-gray-400 uppercase tracking-widest">
                                <Film className="w-3 h-3" />
                                {card.videoCount} video
                                {card.videoCount !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Hover CTA */}
                        <div
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          style={{ background: `${accent}18` }}
                        >
                          <span
                            className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest border"
                            style={{
                              borderColor: accent,
                              color: accent,
                              background: "rgba(0,0,0,0.75)",
                            }}
                          >
                            View Gallery
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </SectionFadeIn>

      {/* ── EVENT GALLERY OVERLAY ── */}
      <AnimatePresence>
        {selectedEventId && (
          <motion.div
            className="fixed inset-0 z-[200] flex flex-col"
            style={{ background: "#030303" }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.35 }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 sm:px-8 py-4 border-b flex-shrink-0"
              style={{
                borderColor: "rgba(255,255,255,0.07)",
                background: "#060606",
              }}
            >
              <div>
                <p className="text-[10px] tracking-widest uppercase text-gray-600">
                  Gallery
                </p>
                <h2
                  className="text-lg font-bold uppercase tracking-widest leading-tight"
                  style={{
                    color: overlayAccent,
                    textShadow: `0 0 15px ${overlayAccent}50`,
                  }}
                >
                  {eventTitleMap[selectedEventId] ?? selectedEventId}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {/* Desktop media filter */}
                <div className="hidden sm:flex gap-1.5">
                  {(["all", "photos", "videos"] as MediaType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setMediaFilter(type)}
                      className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all flex items-center gap-1"
                      style={{
                        borderColor:
                          mediaFilter === type
                            ? "#00FF41"
                            : "rgba(255,255,255,0.1)",
                        color:
                          mediaFilter === type
                            ? "#00FF41"
                            : "rgba(255,255,255,0.4)",
                        background:
                          mediaFilter === type
                            ? "rgba(0,255,65,0.08)"
                            : "transparent",
                      }}
                    >
                      {type === "photos" && <Camera className="w-3 h-3" />}
                      {type === "videos" && <Film className="w-3 h-3" />}
                      {type}
                    </button>
                  ))}
                </div>
                <button
                  onClick={closeEvent}
                  className="w-9 h-9 rounded-full border flex items-center justify-center transition-all hover:border-white/40 hover:text-white"
                  style={{
                    borderColor: "rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mobile media filter */}
            <div
              className="flex sm:hidden gap-2 px-4 py-3 border-b flex-shrink-0"
              style={{ borderColor: "rgba(255,255,255,0.05)" }}
            >
              {(["all", "photos", "videos"] as MediaType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setMediaFilter(type)}
                  className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all flex items-center gap-1"
                  style={{
                    borderColor:
                      mediaFilter === type
                        ? "#00FF41"
                        : "rgba(255,255,255,0.1)",
                    color:
                      mediaFilter === type
                        ? "#00FF41"
                        : "rgba(255,255,255,0.4)",
                    background:
                      mediaFilter === type
                        ? "rgba(0,255,65,0.08)"
                        : "transparent",
                  }}
                >
                  {type === "photos" && <Camera className="w-3 h-3" />}
                  {type === "videos" && <Film className="w-3 h-3" />}
                  {type}
                </button>
              ))}
            </div>

            {/* Masonry grid */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
              {overlayItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48">
                  <Camera
                    className="w-8 h-8 mb-3"
                    style={{ color: "rgba(255,255,255,0.1)" }}
                  />
                  <p className="text-gray-600 text-sm">
                    No media for this filter.
                  </p>
                </div>
              ) : (
                <motion.div
                  layout
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-[200px]"
                >
                  <AnimatePresence mode="popLayout">
                    {overlayItems.map((item, i) => {
                      const accent = accentFor(item.eventId, eventIds);
                      const span = spanFor(i);
                      return (
                        <motion.div
                          key={item.id}
                          layout
                          className={`relative group cursor-pointer rounded-xl overflow-hidden border ${span}`}
                          style={{ borderColor: `${accent}20` }}
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.88 }}
                          transition={{ delay: i * 0.04, duration: 0.35 }}
                          whileHover={{
                            borderColor: accent,
                            boxShadow: `0 0 25px ${accent}40`,
                          }}
                          onClick={() => openLightbox(item.id!)}
                        >
                          {item.type === "video" ? (
                            <video
                              ref={(el) => {
                                videoRefs.current[item.id!] = el;
                              }}
                              src={item.src}
                              className="w-full h-full object-cover"
                              muted
                              loop
                              playsInline
                              onMouseEnter={(e) =>
                                (e.currentTarget as HTMLVideoElement)
                                  .play()
                                  .catch(() => {})
                              }
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLVideoElement).pause();
                                (
                                  e.currentTarget as HTMLVideoElement
                                ).currentTime = 0;
                              }}
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.src}
                              alt={item.caption}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          )}
                          {/* Overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-all duration-300 flex flex-col items-center justify-center">
                            {item.type === "video" && (
                              <div
                                className="w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2"
                                style={{
                                  borderColor: accent,
                                  boxShadow: `0 0 14px ${accent}50`,
                                  background: "rgba(0,0,0,0.7)",
                                }}
                              >
                                <div
                                  className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-b-[8px] border-b-transparent ml-0.5"
                                  style={{ borderLeftColor: accent }}
                                />
                              </div>
                            )}
                            <p className="text-white text-xs text-center px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 leading-relaxed">
                              {item.caption}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LIGHTBOX ── */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLightbox}
          >
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md" />

            <motion.div
              className="relative z-10 w-full max-w-4xl mx-2 sm:mx-4"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Media wrapper — gesture detection separated from animation */}
              <motion.div
                className="relative overflow-hidden rounded-xl"
                style={{ border: "2px solid rgba(0,255,65,0.3)", touchAction: "pan-y" }}
                onPanEnd={(_, info) => {
                  if (Math.abs(info.offset.x) > 60 || Math.abs(info.velocity.x) > 400) {
                    navigate(info.offset.x < 0 ? 1 : -1);
                  }
                }}
              >
                {/* Close — top-right */}
                <button
                  className="absolute top-2 right-2 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all"
                  style={{ background: "rgba(0,0,0,0.65)", color: "rgba(255,255,255,0.85)" }}
                  onClick={closeLightbox}
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Prev */}
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all"
                  style={{ background: "rgba(0,0,0,0.65)", color: "rgba(255,255,255,0.85)" }}
                  onClick={(e) => { e.stopPropagation(); navigate(-1); }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Next */}
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all"
                  style={{ background: "rgba(0,0,0,0.65)", color: "rgba(255,255,255,0.85)" }}
                  onClick={(e) => { e.stopPropagation(); navigate(1); }}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Content — one animation at a time, no physics conflicts */}
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    key={lightbox.id}
                    initial={{ opacity: 0, x: direction * 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction * -40 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    {lightbox.item.type === "video" ? (
                      <video
                        src={lightbox.item.src}
                        className="w-full max-h-[80svh] sm:max-h-[82vh] object-contain"
                        controls
                        autoPlay
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={lightbox.item.src}
                        alt={lightbox.item.caption}
                        className="w-full max-h-[80svh] sm:max-h-[82vh] object-contain"
                        draggable={false}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </motion.div>

              <p className="mt-2 text-center text-sm text-gray-400 tracking-wide px-10 line-clamp-1">
                {lightbox.item.caption}
              </p>
              <p className="text-center text-[10px] tracking-[0.3em] uppercase text-gray-600 mt-0.5">
                {currentIndex + 1} / {overlayItems.length} · {lightbox.item.eventTitle}
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
              title="Edition Highlights"
              accentColor="#FFFF00"
              glowColor="rgba(255,255,0,0.4)"
              autoPlayInterval={5000}
              items={[
                {
                  id: 1,
                  content: (
                    <div
                      className="relative mx-2 rounded-2xl overflow-hidden"
                      style={{ height: "340px" }}
                    >
                      {highlightPhotos[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={highlightPhotos[0].src}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover scale-105"
                        />
                      )}
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(0,255,65,0.15) 100%)",
                        }}
                      />
                      <div className="relative z-10 h-full flex flex-col items-center justify-center px-8 text-center">
                        <p
                          className="text-[10px] tracking-[0.5em] uppercase mb-3"
                          style={{ color: "#00FF41" }}
                        >
                          The Vibe
                        </p>
                        <h3 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight text-white leading-tight">
                          That Cool
                          <br />
                          Rush
                        </h3>
                        <p className="mt-3 text-gray-300 text-sm leading-relaxed max-w-xs">
                          When the night hits different and the energy is just
                          right.
                        </p>
                      </div>
                    </div>
                  ),
                },
                {
                  id: 2,
                  content: (
                    <div
                      className="relative mx-2 rounded-2xl overflow-hidden"
                      style={{ height: "340px" }}
                    >
                      {highlightPhotos[1] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={highlightPhotos[1].src}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover scale-105"
                        />
                      )}
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(255,51,51,0.2) 100%)",
                        }}
                      />
                      <div className="relative z-10 h-full flex flex-col items-center justify-center px-8 text-center">
                        <p
                          className="text-[10px] tracking-[0.5em] uppercase mb-3"
                          style={{ color: "#FF3333" }}
                        >
                          The Heat
                        </p>
                        <h3 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight text-white leading-tight">
                          So Damn
                          <br />
                          Hot
                        </h3>
                        <p className="mt-3 text-gray-300 text-sm leading-relaxed max-w-xs">
                          Neon heat, street fire, and all the sauce Lagos could
                          handle.
                        </p>
                      </div>
                    </div>
                  ),
                },
                {
                  id: 3,
                  content: (
                    <div
                      className="relative mx-2 rounded-2xl overflow-hidden"
                      style={{ height: "340px" }}
                    >
                      {highlightPhotos[2] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={highlightPhotos[2].src}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover scale-105"
                        />
                      )}
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(255,255,0,0.15) 100%)",
                        }}
                      />
                      <div className="relative z-10 h-full flex flex-col items-center justify-center px-8 text-center">
                        <p
                          className="text-[10px] tracking-[0.5em] uppercase mb-3"
                          style={{ color: "#FFFF00" }}
                        >
                          The Food
                        </p>
                        <h3 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight text-white leading-tight">
                          Eat.
                          <br />
                          Repeat.
                        </h3>
                        <p className="mt-3 text-gray-300 text-sm leading-relaxed max-w-xs">
                          Lagos street food elevated under neon lights. 90% sold
                          out every time.
                        </p>
                      </div>
                    </div>
                  ),
                },
                {
                  id: 4,
                  content: (
                    <div
                      className="relative mx-2 rounded-2xl overflow-hidden"
                      style={{ height: "340px" }}
                    >
                      {highlightPhotos[3] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={highlightPhotos[3].src}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover scale-105"
                        />
                      )}
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(0,255,65,0.15) 100%)",
                        }}
                      />
                      <div className="relative z-10 h-full flex flex-col items-center justify-center px-8 text-center">
                        <p
                          className="text-[10px] tracking-[0.5em] uppercase mb-3"
                          style={{ color: "#00FF41" }}
                        >
                          The Night
                        </p>
                        <h3 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight text-white leading-tight">
                          Never
                          <br />
                          Ends
                        </h3>
                        <p className="mt-3 text-gray-300 text-sm leading-relaxed max-w-xs">
                          When the vibe is this right, you lose track of time.
                          You had to be there.
                        </p>
                      </div>
                    </div>
                  ),
                },
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
            href="https://www.instagram.com/dineatnight.ng/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full border-2 border-[#FFFF00] text-[#FFFF00] text-sm font-bold uppercase tracking-widest transition-all"
            style={{
              boxShadow: "0 0 15px rgba(255,255,0,0.3)",
              textShadow: "0 0 8px rgba(255,255,0,0.6)",
            }}
          >
            Follow @dineatnight.ng
          </a>
        </section>
      </SectionFadeIn>

      <Footer />
    </div>
  );
}

export default function GalleryPage() {
  return (
    <Suspense>
      <GalleryContent />
    </Suspense>
  );
}
