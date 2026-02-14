"use client";

import { motion } from "framer-motion";

const draw = (delay: number, duration: number = 1.5) => ({
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { delay, duration, ease: "easeInOut" as const },
      opacity: { delay, duration: 0.3 },
    },
  },
});

const fadeIn = (delay: number) => ({
  hidden: { opacity: 0, scale: 0.6 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { delay, duration: 0.6, ease: "easeOut" as const },
  },
});

const sparkPulse = (delay: number) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: [0, 0.25, 0, 0.25, 0],
    transition: {
      delay,
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
});

const float = (delay: number, y: number = 6) => ({
  y: [-y, y, -y],
  transition: {
    delay,
    duration: 4 + Math.random() * 2,
    repeat: Infinity,
    ease: "easeInOut" as const,
  },
});

export default function DoodleBg() {
  return (
    <>
      {/* Doodle SVG background */}
      <motion.svg
        className="fixed inset-0 z-0 pointer-events-none opacity-95"
        style={{ width: "100vw", height: "100vh" }}
        viewBox="0 0 1200 700"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        initial="hidden"
        animate="visible"
      >
        {/* faint grid */}
        <defs>
          <pattern
            id="grid"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <motion.rect
          width="1200"
          height="700"
          fill="url(#grid)"
          variants={fadeIn(0)}
        />

        {/* ── Yellow doodles ── */}
        <motion.g animate={float(0, 5)}>
          <motion.path
            d="M70 120 C140 40, 250 40, 320 120 S500 210, 580 120"
            fill="none"
            stroke="#FFFF00"
            strokeWidth="6"
            strokeLinecap="round"
            variants={draw(0.2, 1.8)}
          />
        </motion.g>
        <motion.g animate={float(0.5, 4)}>
          <motion.path
            d="M120 560 C220 500, 300 620, 420 560 S620 520, 760 590"
            fill="none"
            stroke="#FFFF00"
            strokeWidth="5"
            strokeLinecap="round"
            variants={draw(0.6, 1.6)}
          />
        </motion.g>
        <motion.g animate={float(1, 6)}>
          <motion.circle
            cx="1020"
            cy="130"
            r="46"
            fill="none"
            stroke="#FFFF00"
            strokeWidth="6"
            variants={draw(1.0, 1.2)}
          />
        </motion.g>

        {/* ── Red doodles ── */}
        <motion.g animate={float(0.3, 5)}>
          <motion.path
            d="M680 170 Q750 80, 820 170 T960 170"
            fill="none"
            stroke="#FF0000"
            strokeWidth="6"
            strokeLinecap="round"
            variants={draw(0.4, 1.6)}
          />
        </motion.g>
        <motion.g animate={float(0.8, 4)}>
          <motion.path
            d="M920 520 C980 470, 1050 470, 1110 520"
            fill="none"
            stroke="#FF0000"
            strokeWidth="6"
            strokeLinecap="round"
            variants={draw(0.8, 1.4)}
          />
        </motion.g>
        <motion.g animate={float(1.2, 7)}>
          <motion.polygon
            points="160,250 210,330 120,330"
            fill="none"
            stroke="#FF0000"
            strokeWidth="6"
            strokeLinejoin="round"
            variants={draw(1.2, 1.0)}
          />
        </motion.g>

        {/* ── Green doodles ── */}
        <motion.g animate={float(0.4, 6)}>
          <motion.path
            d="M980 260 C910 320, 910 420, 980 480 C1050 540, 1150 520, 1140 420"
            fill="none"
            stroke="#008000"
            strokeWidth="7"
            strokeLinecap="round"
            variants={draw(0.5, 2.0)}
          />
        </motion.g>
        <motion.g animate={float(0.9, 5)}>
          <motion.path
            d="M420 260 C470 220, 520 220, 570 260 S670 300, 720 260"
            fill="none"
            stroke="#008000"
            strokeWidth="5"
            strokeLinecap="round"
            variants={draw(0.9, 1.4)}
          />
        </motion.g>
        <motion.g animate={float(1.3, 4)}>
          <motion.circle
            cx="310"
            cy="520"
            r="28"
            fill="none"
            stroke="#008000"
            strokeWidth="6"
            variants={draw(1.3, 1.0)}
          />
        </motion.g>

        {/* ── Spark doodles (pulsing) ── */}
        <motion.g
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="2"
          strokeLinecap="round"
          variants={sparkPulse(1.5)}
        >
          <path d="M104 420 l14 0" />
          <path d="M111 413 l0 14" />
          <path d="M600 420 l14 0" />
          <path d="M607 413 l0 14" />
          <path d="M860 350 l14 0" />
          <path d="M867 343 l0 14" />
        </motion.g>
      </motion.svg>
    </>
  );
}
