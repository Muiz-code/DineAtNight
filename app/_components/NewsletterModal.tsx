"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import LordIcon from "./LordIcon";

const STORAGE_KEY = "dan_newsletter_seen";

export default function NewsletterModal() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "exists">("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      const isNew = data.isNew !== false;
      setStatus(isNew ? "done" : "exists");
      localStorage.setItem(STORAGE_KEY, "1");
      setTimeout(() => setVisible(false), 3500);
    } catch {
      setStatus("done");
      localStorage.setItem(STORAGE_KEY, "1");
      setTimeout(() => setVisible(false), 3500);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => e.target === e.currentTarget && dismiss()}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Modal panel */}
          <motion.div
            className="relative w-full max-w-md rounded-2xl border p-8 text-center space-y-5"
            style={{
              background: "linear-gradient(135deg, #0a0a0a, #050505)",
              borderColor: "rgba(0,255,65,0.25)",
              boxShadow:
                "0 0 60px rgba(0,255,65,0.08), 0 0 120px rgba(0,255,65,0.04)",
            }}
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
          >
            {/* Corner accents */}
            <span
              className="absolute top-0 left-0 w-6 h-6"
              style={{
                borderTop: "2px solid #00FF41",
                borderLeft: "2px solid #00FF41",
              }}
            />
            <span
              className="absolute bottom-0 right-0 w-6 h-6"
              style={{
                borderBottom: "2px solid #00FF41",
                borderRight: "2px solid #00FF41",
              }}
            />

            {/* Close button */}
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {status === "done" ? (
              <motion.div
                className="py-4 space-y-3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", damping: 18 }}
              >
                <LordIcon size={100} colors="primary:#00FF41,secondary:#00FF41" trigger="in" />
                <p
                  className="text-lg font-bold uppercase tracking-widest"
                  style={{
                    color: "#00FF41",
                    textShadow: "0 0 15px rgba(0,255,65,0.6)",
                  }}
                >
                  You&apos;re on the list!
                </p>
                <p className="text-gray-500 text-sm">
                  Welcome to the night — expect something special in your inbox.
                </p>
              </motion.div>
            ) : status === "exists" ? (
              <motion.div
                className="py-4 space-y-3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", damping: 18 }}
              >
                <LordIcon size={100} colors="primary:#FFFF00,secondary:#FFFF00" trigger="in" />
                <p
                  className="text-lg font-bold uppercase tracking-widest"
                  style={{
                    color: "#FFFF00",
                    textShadow: "0 0 15px rgba(255,255,0,0.6)",
                  }}
                >
                  We know you love us!
                </p>
                <p className="text-gray-500 text-sm">
                  You&apos;re already in our records — we&apos;ve got you covered.
                </p>
              </motion.div>
            ) : (
              <>
                {/* Heading */}
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-xs text-gray-500 uppercase tracking-[0.3em] font-medium">
                    Don&apos;t Miss
                  </span>
                  <h2
                    className="text-2xl sm:text-3xl font-bold uppercase tracking-wide leading-tight"
                    style={{
                      color: "#00FF41",
                      textShadow: "0 0 20px rgba(0,255,65,0.5)",
                    }}
                  >
                    The Next Event
                  </h2>
                </div>

                <p className="text-gray-400 text-sm leading-relaxed">
                  Subscribe for early-bird access, vendor reveals, and exclusive
                  updates.
                </p>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-full text-white text-sm focus:outline-none focus:border-[#00FF41] focus:shadow-[0_0_20px_rgba(0,255,65,0.25)] transition-all placeholder:text-gray-700"
                  />
                  <motion.button
                    type="submit"
                    disabled={status === "loading"}
                    className="w-full py-3 rounded-full font-bold uppercase tracking-widest text-sm"
                    style={{
                      background:
                        status === "loading" ? "transparent" : "#00FF41",
                      color: status === "loading" ? "#00FF41" : "#000",
                      border: "2px solid #00FF41",
                      boxShadow:
                        status === "loading"
                          ? "0 0 15px rgba(0,255,65,0.3)"
                          : "0 0 25px rgba(0,255,65,0.45)",
                    }}
                    whileHover={status !== "loading" ? { scale: 1.02 } : {}}
                    whileTap={status !== "loading" ? { scale: 0.97 } : {}}
                  >
                    {status === "loading" ? (
                      <span className="flex items-center justify-center gap-2">
                        <span
                          className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                          style={{
                            borderColor:
                              "#00FF41 transparent transparent transparent",
                          }}
                        />
                        Subscribing…
                      </span>
                    ) : (
                      "Subscribe →"
                    )}
                  </motion.button>
                </form>

                <button
                  onClick={dismiss}
                  className="text-gray-700 text-xs hover:text-gray-500 transition-colors tracking-wider"
                >
                  No thanks, I&apos;ll miss out
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
