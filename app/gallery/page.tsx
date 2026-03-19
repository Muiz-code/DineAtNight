/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Image from "next/image";
import { useState, useRef, useEffect, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Camera, Film } from "lucide-react";
import Footer from "../_components/Footer";
import HeroCarousel from "../_components/HeroCarousel";
import { subscribeGalleryItems, type DanGalleryItem } from "@/lib/firestore";
import { useScrollLock } from "@/lib/useScrollLock";
import { getCache, setCache } from "@/lib/cache";
import NeonMarquee from "../_components/NeonMarquee";

type Tab = "all" | string; // "all" or eventId

const ACCENTS = ["#FFFF00", "#FF3333", "#00FF41"];
const accentFor = (eventId: string, eventIds: string[]) =>
  ACCENTS[eventIds.indexOf(eventId) % ACCENTS.length] ?? "#FFFF00";

function GalleryContent() {
  // Lazy-initialize from cache so no synchronous setState in effect
  const [items, setItems] = useState<DanGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [visible, setVisible] = useState(30);
  const [lightbox, setLightbox] = useState<{
    id: string;
    item: DanGalleryItem;
  } | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [numCols, setNumCols] = useState(4);

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cached = getCache<DanGalleryItem[]>("dan_gallery");
    if (cached) {
      setItems(cached);
      setLoading(false);
    }

    return subscribeGalleryItems((data) => {
      setItems(data);
      setCache("dan_gallery", data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const update = () =>
      setNumCols(
        window.innerWidth < 640 ? 2 : window.innerWidth < 1024 ? 3 : 4,
      );
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Round-robin carousel picks — one per event, up to 8
  const carouselPicks = useMemo(() => {
    if (items.length === 0) return [];
    const byEvent: Record<string, DanGalleryItem[]> = {};
    items.forEach((item) => {
      if (!byEvent[item.eventId]) byEvent[item.eventId] = [];
      byEvent[item.eventId].push(item);
    });
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

  // Switch tab — reset scroll position and lightbox in the same event
  const changeTab = (tab: Tab) => {
    setActiveTab(tab);
    setVisible(30);
    setLightbox(null);
  };

  const eventIds = useMemo(
    () => [...new Set(items.map((i) => i.eventId))],
    [items],
  );

  const eventTitleMap = useMemo(() => {
    const map: Record<string, string> = {};
    items.forEach((i) => {
      map[i.eventId] = i.eventTitle;
    });
    return map;
  }, [items]);

  // Most recently uploaded event (items are createdAt desc)
  const latestEventId = eventIds[0] ?? null;

  // Items for the active tab
  const filteredItems = useMemo(() => {
    if (activeTab === "all") return items;
    return items.filter((i) => i.eventId === activeTab);
  }, [items, activeTab]);

  // Masonry columns
  const cols = useMemo(() => {
    const slice = filteredItems.slice(0, visible);
    const columns: DanGalleryItem[][] = Array.from(
      { length: numCols },
      () => [],
    );
    slice.forEach((item, i) => columns[i % numCols].push(item));
    return columns;
  }, [filteredItems, visible, numCols]);

  // Lightbox
  useScrollLock(!!lightbox);

  const openLightbox = (id: string) => {
    const item = filteredItems.find((i) => i.id === id);
    if (item) setLightbox({ id, item });
  };
  const closeLightbox = () => setLightbox(null);
  const currentIndex = lightbox
    ? filteredItems.findIndex((i) => i.id === lightbox.id)
    : -1;
  const navigate = (dir: 1 | -1) => {
    const next =
      filteredItems[
        (currentIndex + dir + filteredItems.length) % filteredItems.length
      ];
    if (next) {
      setDirection(dir);
      setLightbox({ id: next.id!, item: next });
    }
  };

  const isAllTab = activeTab === "all";

  return (
    <div className="relative w-full min-h-screen bg-black overflow-x-hidden">
      {/* ── HERO CAROUSEL ── */}
      <section className="relative flex flex-col items-center justify-center h-[50vh] px-6 text-center pt-24 pb-16 overflow-hidden">
        <HeroCarousel
          images={carouselPicks
            .filter((p) => p.type !== "video")
            .map((p) => p.src as string)}
          accent="#00FF41"
        />

        {/* Text */}
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
          The Gallery
        </motion.h1>
        <motion.p
          className="relative z-10 mt-4 text-gray-300 text-base sm:text-lg max-w-md"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
        >
          Relive the night through photos and videos
        </motion.p>
      </section>

      <NeonMarquee />

      {/* ── TABS ── */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-md border-b border-white/6">
        <div
          ref={tabsRef}
          className="overflow-x-auto px-4 sm:px-6 py-3 scrollbar-none"
          style={{ scrollbarWidth: "none" }}
        >
          <div className="flex gap-2 w-max items-center">
            {/* All tab */}
            <button
              onClick={() => changeTab("all")}
              className="px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest border transition-all whitespace-nowrap"
              style={{
                borderColor:
                  activeTab === "all" ? "#00FF41" : "rgba(255,255,255,0.1)",
                color:
                  activeTab === "all" ? "#00FF41" : "rgba(255,255,255,0.4)",
                background:
                  activeTab === "all" ? "rgba(0,255,65,0.08)" : "transparent",
                boxShadow:
                  activeTab === "all" ? "0 0 12px rgba(0,255,65,0.2)" : "none",
              }}
            >
              All
            </button>

            {/* Latest event — dynamic tab, only shown when gallery has items */}
            {latestEventId && (
              <button
                onClick={() => changeTab(latestEventId)}
                className="px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest border transition-all whitespace-nowrap"
                style={{
                  borderColor:
                    activeTab === latestEventId
                      ? "#FFFF00"
                      : "rgba(255,255,255,0.1)",
                  color:
                    activeTab === latestEventId
                      ? "#FFFF00"
                      : "rgba(255,255,255,0.4)",
                  background:
                    activeTab === latestEventId
                      ? "rgba(255,255,0,0.08)"
                      : "transparent",
                  boxShadow:
                    activeTab === latestEventId
                      ? "0 0 12px rgba(255,255,0,0.2)"
                      : "none",
                }}
              >
                {eventTitleMap[latestEventId]}
              </button>
            )}

            {/* Per-event tabs — exclude latestEventId (already shown above) */}
            {eventIds
              .filter((eid) => eid !== latestEventId)
              .map((eid) => {
                const active = activeTab === eid;
                const accent = accentFor(eid, eventIds);
                return (
                  <button
                    key={eid}
                    onClick={() => changeTab(eid)}
                    className="px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest border transition-all whitespace-nowrap"
                    style={{
                      borderColor: active ? accent : "rgba(255,255,255,0.1)",
                      color: active ? accent : "rgba(255,255,255,0.4)",
                      background: active ? `${accent}10` : "transparent",
                      boxShadow: active ? `0 0 12px ${accent}30` : "none",
                    }}
                  >
                    {eventTitleMap[eid] ?? eid}
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* ── MASONRY GRID ── */}
      <div className="px-3 sm:px-5 py-6 max-w-[1600px] mx-auto">
        {loading ? (
          /* Skeleton */
          <div className="flex gap-3">
            {Array.from({ length: numCols }).map((_, ci) => (
              <div key={ci} className="flex-1 flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-full rounded-xl animate-pulse"
                    style={{
                      height: `${[180, 260, 200, 300][i % 4]}px`,
                      background: "rgba(255,255,255,0.04)",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Camera
              className="w-10 h-10 mb-3"
              style={{ color: "rgba(255,255,255,0.1)" }}
            />
            <p className="text-gray-600 text-sm">No media yet.</p>
          </div>
        ) : (
          <>
            <div className="flex gap-3">
              {cols.map((col, ci) => (
                <div key={ci} className="flex-1 flex flex-col gap-3 min-w-0">
                  {col.map((item) => {
                    const accent = accentFor(item.eventId, eventIds);
                    const videoUrl =
                      (item.url && typeof item.url === "string"
                        ? item.url
                        : typeof item.src === "string"
                          ? item.src
                          : "") || "";

                    return (
                      <div
                        key={item.id}
                        className="relative group cursor-pointer rounded-xl overflow-hidden border border-white/[0.06] hover:border-white/20 transition-all duration-300"
                        style={{ background: "#111" }}
                        onClick={() => openLightbox(item.id!)}
                      >
                        {item.type === "video" ? (
                          <video
                            ref={(el) => {
                              videoRefs.current[item.id!] = el;
                            }}
                            src={videoUrl}
                            className="w-full h-auto block"
                            muted
                            loop
                            playsInline
                            onMouseEnter={(e) =>
                              (e.currentTarget as HTMLVideoElement)
                                .play()
                                .catch(() => {})
                            }
                            onMouseLeave={(e) => {
                              const v = e.currentTarget as HTMLVideoElement;
                              v.pause();
                              v.currentTime = 0;
                            }}
                          />
                        ) : (
                          <Image
                            src={item.src}
                            alt={item.caption ?? ""}
                            width={800}
                            height={1066}
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            loading="lazy"
                            className="w-full h-auto block"
                            style={{
                              opacity: 0,
                              transition: "opacity 0.3s ease",
                            }}
                            onLoad={(e) => {
                              (
                                e.currentTarget as HTMLImageElement
                              ).style.opacity = "1";
                            }}
                          />
                        )}

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-all duration-300 flex flex-col items-center justify-center gap-2 p-3">
                          {item.type === "video" && (
                            <div
                              className="w-11 h-11 rounded-full border-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{
                                borderColor: accent,
                                boxShadow: `0 0 14px ${accent}50`,
                                background: "rgba(0,0,0,0.7)",
                              }}
                            >
                              <Film
                                className="w-4 h-4"
                                style={{ color: accent }}
                              />
                            </div>
                          )}
                          {item.caption && (
                            <p className="text-white text-xs text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 leading-relaxed line-clamp-2">
                              {item.caption}
                            </p>
                          )}
                        </div>

                        {/* Event badge (only on "all" tabs) */}
                        {isAllTab && (
                          <span
                            className="absolute top-2 left-2 text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{
                              background: `${accent}cc`,
                              color: "#000",
                            }}
                          >
                            {item.eventTitle}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {visible < filteredItems.length && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setVisible((n) => n + 30)}
                  className="px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest border transition-all hover:opacity-80"
                  style={{
                    borderColor: "rgba(0,255,65,0.35)",
                    color: "#00FF41",
                    background: "rgba(0,255,65,0.06)",
                  }}
                >
                  Load more — {filteredItems.length - visible} remaining
                </button>
              </div>
            )}
          </>
        )}
      </div>

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
              <motion.div
                className="relative overflow-hidden rounded-xl"
                style={{
                  border: "2px solid rgba(0,255,65,0.3)",
                  touchAction: "pan-y",
                }}
                onPanEnd={(_, info) => {
                  if (
                    Math.abs(info.offset.x) > 60 ||
                    Math.abs(info.velocity.x) > 400
                  ) {
                    navigate(info.offset.x < 0 ? 1 : -1);
                  }
                }}
              >
                <button
                  className="absolute top-2 right-2 z-20 w-9 h-9 rounded-full flex items-center justify-center"
                  style={{
                    background: "rgba(0,0,0,0.65)",
                    color: "rgba(255,255,255,0.85)",
                  }}
                  onClick={closeLightbox}
                >
                  <X className="w-5 h-5" />
                </button>
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center"
                  style={{
                    background: "rgba(0,0,0,0.65)",
                    color: "rgba(255,255,255,0.85)",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(-1);
                  }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center"
                  style={{
                    background: "rgba(0,0,0,0.65)",
                    color: "rgba(255,255,255,0.85)",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(1);
                  }}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

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
                        src={
                          (lightbox.item.url &&
                          typeof lightbox.item.url === "string"
                            ? lightbox.item.url
                            : typeof lightbox.item.src === "string"
                              ? lightbox.item.src
                              : "") || ""
                        }
                        className="w-full max-h-[80svh] sm:max-h-[82vh] object-contain"
                        controls
                        autoPlay
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={lightbox.item.src as string}
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
                {currentIndex + 1} / {filteredItems.length} ·{" "}
                {lightbox.item.eventTitle}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── IG CTA ── */}
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
