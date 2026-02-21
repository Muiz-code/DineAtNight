"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import {
  createTestimonial,
  subscribeToTestimonials,
  getAllEvents,
  type DanTestimonial,
  type DanEvent,
} from "@/lib/firestore";

const ACCENT_COLORS = [
  { color: "#FFFF00", glow: "rgba(255,255,0,0.5)" },
  { color: "#FF3333", glow: "rgba(255,51,51,0.5)" },
  { color: "#00FF41", glow: "rgba(0,255,65,0.5)" },
];

const inputCls =
  "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] focus:shadow-[0_0_15px_rgba(255,255,0,0.2)] transition-all placeholder:text-gray-700";

interface TestimonialSectionProps {
  title?: string;
  accentColor?: string;
  showForm?: boolean;
}

export default function TestimonialSection({
  title = "What People Say",
  accentColor = "#FFFF00",
  showForm = true,
}: TestimonialSectionProps) {
  const [testimonials, setTestimonials] = useState<DanTestimonial[]>([]);
  const [loadingT, setLoadingT] = useState(true);
  const [events, setEvents] = useState<DanEvent[]>([]);

  const [form, setForm] = useState({
    name: "",
    type: "user" as "vendor" | "user",
    brandName: "",
    quote: "",
    eventTitle: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  // Derive glow from accentColor
  const glowColor =
    accentColor === "#FF3333"
      ? "rgba(255,51,51,0.4)"
      : accentColor === "#00FF41"
        ? "rgba(0,255,65,0.4)"
        : "rgba(255,255,0,0.4)";

  // Real-time listener
  useEffect(() => {
    const unsub = subscribeToTestimonials((data) => {
      setTestimonials(data);
      setLoadingT(false);
    });
    return () => unsub();
  }, []);

  // Fetch all events for the dropdown
  useEffect(() => {
    getAllEvents()
      .then(setEvents)
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const displayName =
      form.type === "vendor" ? form.brandName.trim() : form.name.trim();
    if (!displayName) {
      setFormError("Please enter your name.");
      return;
    }
    if (form.quote.trim().length < 10) {
      setFormError("Please write at least 10 characters.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      await createTestimonial({
        name: displayName,
        type: form.type,
        role: form.type === "vendor" ? "Vendor" : "Event Attendee",
        quote: form.quote.trim(),
        eventTitle: form.eventTitle.trim() || undefined,
        createdBy: "user",
      });
      setSubmitted(true);
      setForm({
        name: "",
        type: "user",
        brandName: "",
        quote: "",
        eventTitle: "",
      });
      setTimeout(() => setSubmitted(false), 6000);
    } catch {
      setFormError("Couldn't submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-14">
      {/* Section heading */}
      <motion.h2
        className="text-4xl md:text-6xl uppercase tracking-wider text-center"
        style={{
          color: "transparent",
          WebkitTextStroke: `2px ${accentColor}`,
          textShadow: `0 0 20px ${glowColor}, 0 0 50px ${glowColor}50`,
        }}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
      >
        {title}
      </motion.h2>

      {/* Live testimonial cards */}
      {loadingT ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/5 p-6 h-44 animate-pulse"
              style={{ background: "rgba(255,255,255,0.02)" }}
            />
          ))}
        </div>
      ) : testimonials.length === 0 ? (
        <p className="text-gray-700 text-center text-sm tracking-widest uppercase py-10">
          Be the first to share your experience
        </p>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto"
        >
          <AnimatePresence>
            {testimonials.map((t, i) => {
              const palette = ACCENT_COLORS[i % ACCENT_COLORS.length];
              const isVendor = t.type === "vendor";
              const isAdmin = t.type === "admin";
              return (
                <motion.div
                  key={t.id}
                  layout
                  className="relative rounded-2xl border p-6 flex flex-col gap-3"
                  style={{
                    borderColor: `${palette.color}18`,
                    background: "linear-gradient(135deg, #0a0a0a, #050505)",
                    boxShadow: `0 0 20px ${palette.glow}06`,
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.4 }}
                  whileHover={{
                    borderColor: `${palette.color}40`,
                    boxShadow: `0 0 30px ${palette.glow}20`,
                  }}
                >
                  {/* Opening quote mark */}
                  <span
                    className="absolute -top-3 left-5 text-3xl leading-none pointer-events-none"
                    style={{ color: palette.color }}
                  >
                    &ldquo;
                  </span>

                  {/* Badges row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {/* Type badge */}
                    <span
                      className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border"
                      style={
                        isAdmin
                          ? {
                              color: "#FFFF00",
                              borderColor: "rgba(255,255,0,0.3)",
                              background: "rgba(255,255,0,0.08)",
                            }
                          : isVendor
                            ? {
                                color: "#FF3333",
                                borderColor: "rgba(255,51,51,0.3)",
                                background: "rgba(255,51,51,0.08)",
                              }
                            : {
                                color: "#00FF41",
                                borderColor: "rgba(0,255,65,0.3)",
                                background: "rgba(0,255,65,0.08)",
                              }
                      }
                    >
                      {isAdmin ? "Team" : isVendor ? "Vendor" : "Attendee"}
                    </span>

                    {/* Event chip */}
                    {t.eventTitle && (
                      <span className="text-[9px] text-gray-600 uppercase tracking-wide truncate max-w-[130px]">
                        {t.eventTitle}
                      </span>
                    )}
                  </div>

                  {/* Quote */}
                  <p className="text-gray-300 text-sm leading-relaxed italic flex-1">
                    {t.quote}
                  </p>

                  {/* Author */}
                  <div>
                    <p
                      className="font-bold text-xs uppercase tracking-widest"
                      style={{
                        color: palette.color,
                        textShadow: `0 0 10px ${palette.glow}`,
                      }}
                    >
                      — {t.name}
                    </p>
                    {t.role && !isAdmin && (
                      <p className="text-gray-600 text-[10px] mt-0.5">
                        {t.role}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Submission form */}
      {showForm && (
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                className="text-center py-10 rounded-2xl border border-white/8 bg-white/[0.02]"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", damping: 20 }}
              >
                <motion.div
                  animate={{ scale: [0.8, 1.2, 1] }}
                  transition={{ duration: 0.6 }}
                >
                  <CheckCircle2
                    className="w-14 h-14 mx-auto mb-4"
                    style={{
                      color: "#00FF41",
                      filter: "drop-shadow(0 0 12px rgba(0,255,65,0.6))",
                    }}
                  />
                </motion.div>
                <p
                  className="text-xl font-bold uppercase tracking-widest"
                  style={{
                    color: "#00FF41",
                    textShadow: "0 0 15px rgba(0,255,65,0.6)",
                  }}
                >
                  Thank you!
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Your review is now live — scroll down to see it.
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                className="space-y-4 rounded-2xl border border-white/8 bg-white/[0.02] p-6"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <p
                  className="text-[10px] uppercase tracking-[0.3em] mb-1"
                  style={{ color: accentColor }}
                >
                  Share your experience
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Role dropdown */}
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                      I am a <span style={{ color: accentColor }}>*</span>
                    </label>
                    <select
                      value={form.type}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          type: e.target.value as "vendor" | "user",
                        }))
                      }
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all cursor-pointer"
                    >
                      <option value="user" className="bg-[#0a0a0a]">
                        Event Attendee
                      </option>
                      <option value="vendor" className="bg-[#0a0a0a]">
                        Vendor
                      </option>
                    </select>
                  </div>

                  {/* Name / Brand */}
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                      {form.type === "vendor" ? "Brand Name" : "Your Name"}{" "}
                      <span style={{ color: accentColor }}>*</span>
                    </label>
                    <input
                      value={
                        form.type === "vendor" ? form.brandName : form.name
                      }
                      onChange={(e) => {
                        if (form.type === "vendor")
                          setForm((p) => ({ ...p, brandName: e.target.value }));
                        else setForm((p) => ({ ...p, name: e.target.value }));
                      }}
                      required
                      placeholder={
                        form.type === "vendor"
                          ? "e.g. Suya Spot Lagos"
                          : "Your name"
                      }
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Event (optional) */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                    Which event?{" "}
                    <span className="text-gray-700 normal-case">
                      (optional)
                    </span>
                  </label>
                  <select
                    value={form.eventTitle}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, eventTitle: e.target.value }))
                    }
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all cursor-pointer"
                  >
                    <option value="" className="bg-[#0a0a0a]">
                      — Select an event —
                    </option>
                    {events.map((ev) => (
                      <option
                        key={ev.id}
                        value={ev.title}
                        className="bg-[#0a0a0a]"
                      >
                        {ev.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quote */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                    Your Review <span style={{ color: accentColor }}>*</span>
                  </label>
                  <textarea
                    value={form.quote}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, quote: e.target.value }))
                    }
                    required
                    rows={3}
                    maxLength={400}
                    placeholder="Tell us about your experience..."
                    className={`${inputCls} resize-none`}
                  />
                  <p className="text-gray-700 text-xs mt-1 text-right">
                    {form.quote.length}/400
                  </p>
                </div>

                {formError && (
                  <p className="text-[#FF3333] text-xs text-center">
                    {formError}
                  </p>
                )}

                <motion.button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-full font-bold uppercase tracking-widest text-sm"
                  style={{
                    background: submitting ? "transparent" : accentColor,
                    color: submitting ? accentColor : "#000",
                    border: `2px solid ${accentColor}`,
                    boxShadow: submitting
                      ? `0 0 15px ${glowColor}`
                      : `0 0 25px ${glowColor}`,
                  }}
                  whileHover={!submitting ? { scale: 1.02 } : {}}
                  whileTap={!submitting ? { scale: 0.97 } : {}}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span
                        className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                        style={{
                          borderColor: `${accentColor} transparent transparent transparent`,
                        }}
                      />
                      Submitting…
                    </span>
                  ) : (
                    "Submit Review →"
                  )}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
