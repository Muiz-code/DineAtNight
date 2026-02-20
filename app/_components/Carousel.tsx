"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselProps {
  items: {
    id: string | number;
    content: React.ReactNode;
  }[];
  title?: string;
  accentColor?: string;
  glowColor?: string;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showDots?: boolean;
  showArrows?: boolean;
  className?: string;
}

export default function Carousel({
  items,
  title,
  accentColor = "#FFFF00",
  glowColor = "rgba(255,255,0,0.4)",
  autoPlay = true,
  autoPlayInterval = 5000,
  showDots = true,
  showArrows = true,
  className = "",
}: CarouselProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = (next: number, dir: 1 | -1) => {
    setDirection(dir);
    setCurrent(next);
  };

  const prev = () => go((current - 1 + items.length) % items.length, -1);
  const next = () => go((current + 1) % items.length, 1);

  useEffect(() => {
    if (!autoPlay || items.length <= 1) return;
    timerRef.current = setInterval(() => {
      setDirection(1);
      setCurrent((c) => (c + 1) % items.length);
    }, autoPlayInterval);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoPlay, autoPlayInterval, items.length]);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoPlay && items.length > 1) {
      timerRef.current = setInterval(() => {
        setDirection(1);
        setCurrent((c) => (c + 1) % items.length);
      }, autoPlayInterval);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className={`relative w-full ${className}`}>
      {title && (
        <h2
          className="text-3xl md:text-4xl uppercase tracking-wider text-center mb-10"
          style={{
            color: "transparent",
            WebkitTextStroke: `1.5px ${accentColor}`,
            textShadow: `0 0 20px ${glowColor}`,
          }}
        >
          {title}
        </h2>
      )}

      {/* Slide area */}
      <div className="relative overflow-hidden min-h-[200px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={items[current].id}
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: d * 60, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d * -60, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: "easeInOut" }}
          >
            {items[current].content}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls row */}
      {(showDots || showArrows) && items.length > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          {showArrows && (
            <button
              onClick={() => { prev(); resetTimer(); }}
              className="w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-300"
              style={{
                borderColor: `${accentColor}30`,
                color: `${accentColor}60`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = accentColor;
                (e.currentTarget as HTMLButtonElement).style.color = accentColor;
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 15px ${glowColor}`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = `${accentColor}30`;
                (e.currentTarget as HTMLButtonElement).style.color = `${accentColor}60`;
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {showDots && (
            <div className="flex gap-2">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { go(i, i > current ? 1 : -1); resetTimer(); }}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: current === i ? "20px" : "8px",
                    height: "8px",
                    backgroundColor: current === i ? accentColor : `${accentColor}30`,
                    boxShadow: current === i ? `0 0 8px ${glowColor}` : "none",
                  }}
                />
              ))}
            </div>
          )}

          {showArrows && (
            <button
              onClick={() => { next(); resetTimer(); }}
              className="w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-300"
              style={{
                borderColor: `${accentColor}30`,
                color: `${accentColor}60`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = accentColor;
                (e.currentTarget as HTMLButtonElement).style.color = accentColor;
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 15px ${glowColor}`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = `${accentColor}30`;
                (e.currentTarget as HTMLButtonElement).style.color = `${accentColor}60`;
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
