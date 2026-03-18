"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { subscribeGalleryItems, type DanGalleryItem } from "@/lib/firestore";
import { getCache, setCache } from "@/lib/cache";

interface HeroCarouselProps {
  /** Explicit image URLs — if omitted the component picks from gallery items. */
  images?: string[];
  accent?: string;
  interval?: number;
}

/** Same round-robin logic as gallery carouselPicks — one photo per event, up to 8. */
function pickImages(items: DanGalleryItem[]): string[] {
  const photos = items.filter((i) => i.type !== "video");
  if (photos.length === 0) return [];
  const byEvent: Record<string, DanGalleryItem[]> = {};
  photos.forEach((item) => {
    if (!byEvent[item.eventId]) byEvent[item.eventId] = [];
    byEvent[item.eventId].push(item);
  });
  const groups = Object.values(byEvent).map((arr) =>
    [...arr].sort(() => Math.random() - 0.5),
  );
  const result: string[] = [];
  let i = 0;
  while (result.length < 8 && groups.some((g) => g.length > 0)) {
    const group = groups[i % groups.length];
    if (group.length > 0) result.push(group.shift()!.src);
    i++;
  }
  return result;
}

export default function HeroCarousel({
  images: imagesProp,
  accent = "#FFFF00",
  interval = 5000,
}: HeroCarouselProps) {
  const [autoImages, setAutoImages] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (imagesProp !== undefined) return;
    // Seed from cache immediately on mount (client only — avoids hydration mismatch)
    const cached = getCache<DanGalleryItem[]>("dan_gallery");
    if (cached?.length) setAutoImages(pickImages(cached));

    return subscribeGalleryItems((data) => {
      setCache("dan_gallery", data);
      setAutoImages(pickImages(data));
    });
  }, [imagesProp]);

  const images = imagesProp ?? autoImages;

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % images.length), interval);
    return () => clearInterval(id);
  }, [images.length, interval]);

  useEffect(() => {
    setIdx(0);
  }, [images.length]);

  if (images.length === 0) return null;

  const current = images[idx] ?? images[0];

  return (
    <>
      {/* Slideshow */}
      <AnimatePresence mode="sync">
        <motion.div
          key={idx}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt=""
            className="w-full h-full object-cover object-center"
          />
        </motion.div>
      </AnimatePresence>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Bottom-to-black gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, #000 0%, rgba(0,0,0,0.6) 30%, transparent 100%)",
        }}
      />

      {/* Dot indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === idx ? "20px" : "8px",
                height: "8px",
                background: i === idx ? accent : "rgba(255,255,255,0.3)",
                boxShadow: i === idx ? `0 0 8px ${accent}cc` : "none",
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
