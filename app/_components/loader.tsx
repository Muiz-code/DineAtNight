"use client";

import { motion } from "framer-motion";

export default function Loader() {
  const text = "DINE AT NIGHT";
  const characters = text.split("");

  const colors = ["#FF1744", "#FF6D00", "#FFEA00", "#0FFF50", "#00E5FF", "#7C4DFF"];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black z-50 overflow-hidden">
      {/* Animated gradient background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute w-72 h-72 rounded-full mix-blend-screen filter blur-3xl opacity-30"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            background: "linear-gradient(135deg, #FF1744, #FF6D00)",
          }}
        />
        <motion.div
          className="absolute w-72 h-72 rounded-full mix-blend-screen filter blur-3xl opacity-30 top-20 right-20"
          animate={{
            x: [-100, 0, -100],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            background: "linear-gradient(135deg, #0FFF50, #00E5FF)",
          }}
        />
        <motion.div
          className="absolute w-72 h-72 rounded-full mix-blend-screen filter blur-3xl opacity-30 bottom-20 right-1/4"
          animate={{
            x: [50, -50, 50],
            y: [50, -50, 50],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            background: "linear-gradient(135deg, #7C4DFF, #FFEA00)",
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Rotating outer rings */}
        <div className="relative w-80 h-80 flex items-center justify-center">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            style={{
              borderImage: `linear-gradient(90deg, ${colors.join(", ")}) 1`,
            }}
          />

          <motion.div
            className="absolute inset-8 rounded-full border-2 border-transparent"
            animate={{ rotate: -360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            style={{
              borderImage: `linear-gradient(90deg, ${[...colors].reverse().join(", ")}) 1`,
            }}
          />

          <motion.div
            className="absolute inset-16 rounded-full border-2 border-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            style={{
              borderImage: `linear-gradient(90deg, ${colors.join(", ")}) 1`,
            }}
          />

          {/* Center text */}
          <motion.div
            className="flex flex-col items-center gap-4"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {/* Text with gradient and animation */}
            <div className="flex gap-0 text-5xl md:text-6xl font-black text-center">
              {characters.map((char, index) => (
                <motion.span
                  key={index}
                  animate={{
                    color: colors,
                    y: [0, -10, 0],
                  }}
                  transition={{
                    color: {
                      duration: 3,
                      repeat: Infinity,
                      times: [0, 0.2, 0.4, 0.6, 0.8, 1],
                    },
                    y: {
                      duration: 2,
                      repeat: Infinity,
                      delay: index * 0.1,
                    },
                  }}
                  style={{
                    textShadow: "0 0 20px currentColor",
                  }}
                >
                  {char}
                </motion.span>
              ))}
            </div>

            {/* Animated dots underneath */}
            <div className="flex gap-3 mt-4">
              {colors.map((color, index) => (
                <motion.div
                  key={index}
                  className="w-3 h-3 rounded-full"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: index * 0.15,
                  }}
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 0 15px ${color}`,
                  }}
                />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom text */}
        <motion.div
          className="text-sm tracking-widest uppercase font-bold mt-8"
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
          style={{
            background: `linear-gradient(90deg, ${colors.join(", ")})`,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Loading Experience
        </motion.div>
      </div>
    </div>
  );
}
