"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import SectionFadeIn from "../_components/SectionFadeIn";
import {
  Mail,
  Instagram,
  MapPin,
  Send,
  Check,
  Ticket,
  Utensils,
  Users,
  Moon,
  MessageCircle,
  Linkedin,
} from "lucide-react";
import Footer from "../_components/Footer";
import LordIcon from "../_components/LordIcon";
import Carousel from "../_components/Carousel";
import HeroCarousel from "../_components/HeroCarousel";
import NeonMarquee from "../_components/NeonMarquee";

const inputCls =
  "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#00FF41] focus:shadow-[0_0_15px_rgba(0,255,65,0.2)] transition-all placeholder:text-gray-700";

const Field = ({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <div>
    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
      {label} {required && <span className="text-[#00FF41]">*</span>}
    </label>
    {children}
  </div>
);

const contactTopics = [
  {
    label: "General Enquiry",
    color: "#FFFF00",
    glow: "rgba(255,255,0,0.5)",
    icon: <MessageCircle className="w-5 h-5" />,
  },
  {
    label: "Vendor Application",
    color: "#FF3333",
    glow: "rgba(255,51,51,0.5)",
    icon: <Utensils className="w-5 h-5" />,
  },
  
  {
    label: "Media & Press",
    color: "#FFFF00",
    glow: "rgba(255,255,0,0.5)",
    icon: <Moon className="w-5 h-5" />,
  },
  {
    label: "Ticketing Issues",
    color: "#FF3333",
    glow: "rgba(255,51,51,0.5)",
    icon: <Ticket className="w-5 h-5" />,
  },
  {
    label: "Other",
    color: "#00FF41",
    glow: "rgba(0,255,65,0.5)",
    icon: <Mail className="w-5 h-5" />,
  },
];

// Minimum ms between two successful contact submissions (client-side cooldown)
const SUBMIT_COOLDOWN_MS = 60_000;
const COOLDOWN_KEY = "dan_contact_last_submit";

export default function ContactPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: "",
    message: "",
  });
  // Honeypot — bots fill this, humans don't see it
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [emailError, setEmailError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Honeypot triggered — bot filled the hidden field, silently drop it
    if (honeypot) return;
    // Client-side cooldown (stored in localStorage — persists across tabs)
    const lastSubmitAt = Number(localStorage.getItem(COOLDOWN_KEY) ?? 0);
    if (Date.now() - lastSubmitAt < SUBMIT_COOLDOWN_MS) {
      setStatus("success");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || "Request failed");
      }
      localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      setStatus("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setEmailError(msg || "Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  const faqs = [
    {
      q: "What can I expect at Dine at Night?",
      a: "Expect a curated lineup of food vendors, great music, and a vibrant atmosphere. Come ready to eat, explore, and experience the energy of Lagos at night.",
    },
    {
      q: "When is the next event?",
      a: "Our main event takes place annually in December, with special editions throughout the year. Follow us on Instagram or join our mailing list to be the first to know when tickets drop.",
    },
    {
      q: "How do I get tickets?",
      a: "Tickets are released online ahead of each event and are available until sold out. We recommend purchasing early as tickets are limited and previous editions have sold out.",
    },
    {
      q: "Is there an age limit?",
      a: "Yes, Dine at Night is strictly a 16+ event.",
    },
    {
      q: "How do I become a vendor?",
      a: "Vendors are selected through a curation process. You can apply through our vendor form, and our team reviews each application based on quality, originality, and fit. We’ll reach out if selected.",
    },
    {
      q: "What do you look for in vendors?",
      a: "We prioritise quality, originality, and strong food concepts. We’re looking for vendors who understand the experience and can deliver consistently within a high-energy environment.",
    },
    {
      q: "Is there a fee to vend?",
      a: "Yes. Selected vendors are required to pay a participation fee. Full details are shared with vendors upon acceptance.",
    },
    {
      q: "How do I become a sponsor? ",
      a: "For sponsorship enquiries, please email contact@dineatnight.com with your brand details and the type of partnership you have in mind. Our team will be in touch if there’s a fit.",
    },
  ];

  return (
    <div className="relative w-full min-h-screen bg-black overflow-x-hidden">
      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center h-[50vh] pt-28 pb-16 px-6 text-center overflow-hidden">
        <HeroCarousel accent="#00FF41" />

        <div
          className="absolute inset-0 pointer-events-none z-1"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,0,0.06) 0%, transparent 70%)",
          }}
        />
        <motion.h1
          className="relative z-10 text-5xl sm:text-7xl md:text-8xl uppercase tracking-tight leading-none"
          style={{
            color: "transparent",
            WebkitTextStroke: "2px #00FF41",
            textShadow: "0 0 40px rgba(0,255,65,0.3)",
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          Contact Us
        </motion.h1>
        <motion.p
          className="relative z-10 mt-6 text-gray-300 text-lg sm:text-xl max-w-2xl leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          Questions, partnerships, or just want to say hi — we&apos;re here for
          it.
        </motion.p>
      </section>

      <NeonMarquee />

      <div className="w-full mx-auto px-6 pb-5 grid grid-col-1 gap-10 md:flex md:justify-center pt-5">
        {/* ── LEFT: Contact Info ── */}
        <SectionFadeIn>
          <div className="space-y-8 w-full">
            <div>
              <h2
                className="text-2xl uppercase tracking-widest font-bold mb-6"
                style={{
                  color: "#FFFF00",
                  textShadow: "0 0 15px rgba(255,255,0,0.5)",
                }}
              >
                Reach Us
              </h2>

              <div className="space-y-5">
                {[
                  {
                    icon: <Mail className="w-4 h-4" />,
                    label: "Email",
                    value: "contact@dineatnight.com",
                    href: "mailto:contact@dineatnight.com",
                    color: "#FFFF00",
                    sub: "thosewdine@gmail.com",
                  },
                  
                  {
                    icon: <Instagram className="w-4 h-4" />,
                    label: "Instagram",
                    value: "@dineatnight.ng",
                    href: "https://www.instagram.com/dineatnight.ng/",
                    color: "#00FF41",
                  },
                  {
                    icon: <MapPin className="w-4 h-4" />,
                    label: "Location",
                    value: "Lagos, Nigeria",
                    href: "https://maps.google.com/?q=Lagos,Nigeria",
                    color: "#FFFF00",
                  },
                ].map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={
                      item.href.startsWith("http")
                        ? "noopener noreferrer"
                        : undefined
                    }
                    className="flex items-start gap-4 group"
                  >
                    <div
                      className="w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-300"
                      style={{
                        borderColor: `${item.color}30`,
                        color: `${item.color}60`,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor =
                          item.color;
                        (e.currentTarget as HTMLDivElement).style.color =
                          item.color;
                        (e.currentTarget as HTMLDivElement).style.boxShadow =
                          `0 0 15px ${item.color}50`;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor =
                          `${item.color}30`;
                        (e.currentTarget as HTMLDivElement).style.color =
                          `${item.color}60`;
                        (e.currentTarget as HTMLDivElement).style.boxShadow =
                          "none";
                      }}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-0.5">
                        {item.label}
                      </p>
                      <p
                        className="text-sm transition-colors duration-300"
                        style={{ color: `${item.color}80` }}
                      >
                        {item.value}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Response time note */}
            <div
              className="rounded-xl border p-4"
              style={{
                borderColor: "rgba(0,255,65,0.15)",
                background: "rgba(0,255,65,0.03)",
              }}
            >
              <p className="text-xs text-gray-500 leading-relaxed">
                <Check
                  className="w-3 h-3 inline-block mr-1"
                  style={{ color: "#00FF41" }}
                />{" "}
                We typically respond within 24–48 hours. For urgent vendor
                enquiries, DM us on Instagram.
              </p>
            </div>

            {/* Social Links */}
            <div>
              <h3 className="text-xs text-gray-600 uppercase tracking-widest mb-4">
                Find Us Online
              </h3>
              <div className="flex gap-3">
                {[
                  {
                    label: "Instagram",
                    href: "https://www.instagram.com/dineatnight.ng/",
                    color: "#FF3333",
                    glow: "rgba(255,51,51,0.3)",
                    icon: (
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-5 h-5"
                      >
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    ),
                  },
                  {
                    label: "TikTok",
                    href: "https://tiktok.com/@dineatnight.ng",
                    color: "#00FF41",
                    glow: "rgba(0,255,65,0.3)",
                    icon: (
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-5 h-5"
                      >
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.3 6.3 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.67a8.18 8.18 0 0 0 4.78 1.52V6.7a4.85 4.85 0 0 1-1-.01z" />
                      </svg>
                    ),
                  },
                  {
                    label: "LinkedIn",
                    href: "https://www.linkedin.com/company/dine-at-night/",
                    color: "#0077B5",
                    glow: "rgba(0,119,181,0.3)",
                    icon: <Linkedin className="w-5 h-5" />,
                  },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border transition-all duration-300"
                    style={{
                      borderColor: `${s.color}20`,
                      color: `${s.color}50`,
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.borderColor = s.color;
                      el.style.color = s.color;
                      el.style.boxShadow = `0 0 20px ${s.glow}`;
                      el.style.background = `${s.color}08`;
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.borderColor = `${s.color}20`;
                      el.style.color = `${s.color}50`;
                      el.style.boxShadow = "none";
                      el.style.background = "transparent";
                    }}
                  >
                    {s.icon}
                    <span className="text-[9px] uppercase tracking-widest font-bold">
                      {s.label}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </SectionFadeIn>

        {/* ── RIGHT: Contact Form ── */}
        <SectionFadeIn>
          <div className="w-full">
            <div
              className="relative rounded-2xl border p-6 sm:p-8"
              style={{
                borderColor: "rgba(0,255,65,0.2)",
                background: "linear-gradient(135deg, #080808, #030303)",
                boxShadow: "0 0 40px rgba(0,255,65,0.06)",
              }}
            >
              {/* Corner accents */}
              <span
                className="absolute top-0 left-0 w-8 h-8 pointer-events-none"
                style={{
                  borderTop: "2px solid #00FF41",
                  borderLeft: "2px solid #00FF41",
                }}
              />
              <span
                className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none"
                style={{
                  borderBottom: "2px solid #00FF41",
                  borderRight: "2px solid #00FF41",
                }}
              />

              {status === "error" ? (
                <motion.div
                  className="text-center py-12"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", damping: 20 }}
                >
                  <div className="text-5xl mb-4">⚠️</div>
                  <h3
                    className="text-xl font-bold uppercase tracking-wide mb-3"
                    style={{
                      color: "#FF3333",
                      textShadow: "0 0 15px rgba(255,51,51,0.6)",
                    }}
                  >
                    Email Failed to Send
                  </h3>
                  <div
                    className="text-xs font-mono text-left rounded-lg border p-3 mb-6 break-all"
                    style={{
                      borderColor: "rgba(255,51,51,0.2)",
                      background: "rgba(255,51,51,0.04)",
                      color: "#FF6666",
                    }}
                  >
                    {emailError}
                  </div>
                  <p className="text-gray-500 text-sm mb-6">
                    Check the browser console (F12 → Console) for more detail.
                    <br />
                    Likely cause: network error or server misconfiguration.
                  </p>
                  <button
                    onClick={() => {
                      setStatus("idle");
                      setEmailError("");
                    }}
                    className="px-8 py-3 rounded-full border-2 border-[#FF3333] text-[#FF3333] uppercase tracking-widest text-sm font-bold hover:bg-[#FF3333] hover:text-black transition-all duration-300"
                  >
                    Try Again
                  </button>
                </motion.div>
              ) : status === "success" ? (
                <motion.div
                  className="text-center py-12"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", damping: 20 }}
                >
                  <div className="flex justify-center mb-5">
                    <LordIcon size={120} colors="primary:#00FF41,secondary:#00FF41" trigger="in" />
                  </div>
                  <h3
                    className="text-2xl font-bold uppercase tracking-wide mb-3"
                    style={{
                      color: "#00FF41",
                      textShadow: "0 0 15px rgba(0,255,65,0.6)",
                    }}
                  >
                    Message Received!
                  </h3>
                  <p className="text-gray-400 leading-relaxed text-sm sm:text-base">
                    We&apos;ll get back to you within 24–48 hours. Thanks for
                    reaching out.
                  </p>
                  <button
                    onClick={() => {
                      setStatus("idle");
                      setEmailError("");
                      setForm({ name: "", email: "", topic: "", message: "" });
                    }}
                    className="mt-8 px-8 py-3 rounded-full border-2 border-[#00FF41] text-[#00FF41] uppercase tracking-widest text-sm font-bold hover:bg-[#00FF41] hover:text-black transition-all duration-300"
                  >
                    Send Another
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Honeypot — hidden from real users, bots fill it */}
                  <input
                    type="text"
                    name="_gotcha"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: "-9999px",
                      width: "1px",
                      height: "1px",
                      opacity: 0,
                    }}
                    autoComplete="off"
                  />
                  <h2
                    className="text-xl font-bold uppercase tracking-widest mb-6"
                    style={{
                      color: "#00FF41",
                      textShadow: "0 0 15px rgba(0,255,65,0.5)",
                    }}
                  >
                    Send a Message
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Your Name" required>
                      <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        placeholder="Full name"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Email Address" required>
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        placeholder="you@example.com"
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  <Field label="Topic" required>
                    <select
                      name="topic"
                      value={form.topic}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#00FF41] focus:shadow-[0_0_15px_rgba(0,255,65,0.2)] transition-all cursor-pointer"
                    >
                      <option value="" className="bg-[#0a0a0a]">
                        Select a topic…
                      </option>
                      {contactTopics.map((t) => (
                        <option
                          key={t.label}
                          value={t.label}
                          className="bg-[#0a0a0a]"
                        >
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Message" required>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      maxLength={1000}
                      placeholder="Tell us what's on your mind…"
                      className={`${inputCls} resize-none`}
                    />
                    <p className="text-gray-700 text-xs mt-1 text-right">
                      {form.message.length}/1000
                    </p>
                  </Field>

                  <motion.button
                    type="submit"
                    disabled={status === "loading"}
                    className="w-full py-4 rounded-full font-bold uppercase tracking-widest text-sm mt-1 flex items-center justify-center gap-3 transition-all duration-300"
                    style={{
                      background:
                        status === "loading" ? "transparent" : "#00FF41",
                      color: status === "loading" ? "#00FF41" : "#000",
                      border: "2px solid #00FF41",
                      boxShadow:
                        status === "loading"
                          ? "0 0 20px rgba(0,255,65,0.25)"
                          : "0 0 30px rgba(0,255,65,0.5)",
                    }}
                    whileHover={status !== "loading" ? { scale: 1.02 } : {}}
                    whileTap={status !== "loading" ? { scale: 0.97 } : {}}
                  >
                    {status === "loading" ? (
                      <>
                        <span className="w-4 h-4 border-2 border-[#00FF41] border-t-transparent rounded-full animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Message
                      </>
                    )}
                  </motion.button>
                </form>
              )}
            </div>
          </div>
        </SectionFadeIn>
      </div>

      {/* ── FAQ CAROUSEL ── */}
      <SectionFadeIn>
        <section className="relative z-10 pt-10 pb-5 px-6 md:px-16 bg-black/75">
          <div className="max-w-3xl mx-auto">
            <h2
              className="text-4xl md:text-5xl uppercase tracking-wider text-center mb-14"
              style={{
                color: "transparent",
                WebkitTextStroke: "2px #FFFF00",
                textShadow: "0 0 20px rgba(255,255,0,0.4)",
              }}
            >
              FAQ
            </h2>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <motion.div
                  key={i}
                  className="rounded-xl border overflow-hidden"
                  style={{
                    borderColor:
                      openFaq === i ? "#FFFF00" : "rgba(255,255,255,0.07)",
                    boxShadow:
                      openFaq === i ? "0 0 20px rgba(255,255,0,0.15)" : "none",
                  }}
                >
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="text-gray-200 text-sm sm:text-base font-medium pr-4">
                      {faq.q}
                    </span>
                    <span
                      className="text-xl flex-shrink-0 transition-transform duration-300"
                      style={{
                        color: "#FFFF00",
                        transform:
                          openFaq === i ? "rotate(45deg)" : "rotate(0deg)",
                      }}
                    >
                      +
                    </span>
                  </button>
                  {openFaq === i && (
                    <motion.div
                      className="px-5 pb-5"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="text-gray-500 text-sm leading-relaxed">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </SectionFadeIn>

      <Footer />
    </div>
  );
}
