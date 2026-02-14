"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Images } from "@/Images/images";

interface LoaderProps {
  duration?: number;
  onComplete?: () => void;
}

export default function Loader({ duration = 3500, onComplete }: LoaderProps) {
  const [visible, setVisible] = useState(true);
  const { logo } = Images();

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  const orbVariants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "linear" as const,
      },
    },
  };

  const neonColors = ["#FFFF00", "#FF3333", "#00FF41"];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black z-50 overflow-hidden"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          {/* Neon flicker lines — subtle, mostly black */}
          {neonColors.map((color, i) => (
            <motion.div
              key={`h-${i}`}
              className="absolute pointer-events-none"
              style={{
                top: `${20 + i * 30}%`,
                left: 0,
                right: 0,
                height: "1px",
                background: `linear-gradient(90deg, transparent 0%, ${color} 30%, transparent 50%, ${color} 70%, transparent 100%)`,
              }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 0.15, 0, 0, 0.1, 0, 0.2, 0, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: i * 1.3,
                ease: "easeInOut" as const,
              }}
            />
          ))}

          {/* Subtle neon corner accents that flicker */}
          <motion.div
            className="absolute top-0 left-0 w-32 h-32 pointer-events-none"
            style={{
              borderLeft: "1px solid #FFFF00",
              borderTop: "1px solid #FFFF00",
              boxShadow:
                "inset 4px 4px 20px rgba(255,255,0,0.1), -2px -2px 15px rgba(255,255,0,0.05)",
            }}
            animate={{ opacity: [0, 0.3, 0, 0, 0.15, 0] }}
            transition={{
              duration: 5,
              repeat: Infinity,
              delay: 0.5,
              ease: "easeInOut" as const,
            }}
          />
          <motion.div
            className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none"
            style={{
              borderRight: "1px solid #FF3333",
              borderBottom: "1px solid #FF3333",
              boxShadow:
                "inset -4px -4px 20px rgba(255,51,51,0.1), 2px 2px 15px rgba(255,51,51,0.05)",
            }}
            animate={{ opacity: [0, 0.25, 0, 0.1, 0, 0] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: 1.8,
              ease: "easeInOut" as const,
            }}
          />
          <motion.div
            className="absolute top-0 right-0 w-24 h-24 pointer-events-none"
            style={{
              borderRight: "1px solid #00FF41",
              borderTop: "1px solid #00FF41",
              boxShadow:
                "inset -4px 4px 20px rgba(0,255,65,0.1), 2px -2px 15px rgba(0,255,65,0.05)",
            }}
            animate={{ opacity: [0, 0.2, 0, 0, 0.3, 0, 0] }}
            transition={{
              duration: 6,
              repeat: Infinity,
              delay: 3,
              ease: "easeInOut" as const,
            }}
          />

          {/* Tiny neon dots scattered — flicker randomly */}
          {[
            { x: "10%", y: "15%", color: "#FFFF00", delay: 0.8 },
            { x: "85%", y: "25%", color: "#FF3333", delay: 2.2 },
            { x: "75%", y: "80%", color: "#00FF41", delay: 1.5 },
            { x: "20%", y: "75%", color: "#FF3333", delay: 3.5 },
            { x: "50%", y: "10%", color: "#00FF41", delay: 4.2 },
            { x: "90%", y: "55%", color: "#FFFF00", delay: 2.8 },
          ].map((dot, i) => (
            <motion.div
              key={`dot-${i}`}
              className="absolute w-1 h-1 rounded-full pointer-events-none"
              style={{
                left: dot.x,
                top: dot.y,
                backgroundColor: dot.color,
                boxShadow: `0 0 6px ${dot.color}, 0 0 12px ${dot.color}`,
              }}
              animate={{
                opacity: [0, 0.6, 0, 0, 0.4, 0, 0, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: dot.delay,
                ease: "easeInOut" as const,
              }}
            />
          ))}

          {/* Rotating background orbs — smaller, dimmer */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            variants={orbVariants}
            animate="animate"
          >
            <div className="absolute top-20 left-20 w-32 h-32 bg-[#FF3333] rounded-full mix-blend-screen filter blur-3xl opacity-[0.15]" />
            <div className="absolute bottom-20 right-20 w-32 h-32 bg-[#FFFF00] rounded-full mix-blend-screen filter blur-3xl opacity-[0.15]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 bg-[#00FF41] rounded-full mix-blend-screen filter blur-3xl opacity-[0.1]" />
          </motion.div>

          {/* Main content */}
          <div className="flex flex-col items-center gap-8 relative z-10">
            {/* Animated logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.8,
                ease: "easeOut" as const,
              }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  filter: [
                    "drop-shadow(0 0 20px rgba(255,255,0,0.3))",
                    "drop-shadow(0 0 40px rgba(255,255,0,0.6))",
                    "drop-shadow(0 0 10px rgba(255,255,0,0.1))",
                    "drop-shadow(0 0 35px rgba(255,255,0,0.5))",
                    "drop-shadow(0 0 20px rgba(255,255,0,0.3))",
                  ],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut" as const,
                }}
              >
                <Image
                  src={logo}
                  alt="Dine At Night Logo"
                  width={200}
                  height={200}
                  className="w-40 h-40 md:w-52 md:h-52 object-contain"
                  priority
                />
              </motion.div>
            </motion.div>

            {/* Animated dots */}
            <motion.div
              className="flex gap-2"
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.2,
                    delayChildren: 1,
                  },
                },
              }}
            >
              {[0, 1, 2].map((dot) => (
                <motion.div
                  key={dot}
                  className="w-2 h-2 bg-[#FFFF00] rounded-full"
                  variants={{
                    hidden: { opacity: 0, scale: 0 },
                    visible: {
                      opacity: 1,
                      scale: 1,
                      transition: {
                        type: "spring" as const,
                        stiffness: 100,
                      },
                    },
                  }}
                  animate={{
                    y: [0, -10, 0],
                    transition: {
                      duration: 1,
                      repeat: Infinity,
                      delay: dot * 0.1,
                    },
                  }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
