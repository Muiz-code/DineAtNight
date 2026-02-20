"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Mail, Instagram, Send } from "lucide-react";
import Footer from "../_components/Footer";
import Carousel from "../_components/Carousel";

const SectionFadeIn = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

const inputCls =
  "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#00FF41] focus:shadow-[0_0_15px_rgba(0,255,65,0.2)] transition-all placeholder:text-gray-700";

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div>
    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
      {label} {required && <span className="text-[#00FF41]">*</span>}
    </label>
    {children}
  </div>
);

const contactTopics = [
  { label: "General Enquiry", icon: "💬", color: "#FFFF00", glow: "rgba(255,255,0,0.5)" },
  { label: "Vendor Application", icon: "🍖", color: "#FF3333", glow: "rgba(255,51,51,0.5)" },
  { label: "Sponsorship & Partnerships", icon: "🤝", color: "#00FF41", glow: "rgba(0,255,65,0.5)" },
  { label: "Media & Press", icon: "📸", color: "#FFFF00", glow: "rgba(255,255,0,0.5)" },
  { label: "Ticketing Issues", icon: "🎟️", color: "#FF3333", glow: "rgba(255,51,51,0.5)" },
  { label: "Other", icon: "✉️", color: "#00FF41", glow: "rgba(0,255,65,0.5)" },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", topic: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    /*
     * API NEEDED: POST form data to backend/form service.
     * Options:
     *   - Formspree: POST https://formspree.io/f/{your_id}
     *   - Custom:    /app/api/contact/route.ts → Resend / Nodemailer
     * Simulating a 1.2s delay for now.
     */
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="relative w-full min-h-screen bg-black overflow-x-hidden">
      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center pt-28 pb-16 px-6 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,255,65,0.06) 0%, transparent 70%)" }}
        />
        <motion.p
          className="text-xs tracking-[0.4em] uppercase mb-3"
          style={{ color: "#00FF41", textShadow: "0 0 12px rgba(0,255,65,0.7)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Get in Touch
        </motion.p>
        <motion.h1
          className="text-5xl sm:text-7xl uppercase tracking-tight"
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
          className="mt-4 text-gray-400 text-base sm:text-lg max-w-md"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
        >
          Questions, partnerships, or just want to say hi — we&apos;re here for it.
        </motion.p>
      </section>

      <div className="max-w-5xl mx-auto px-6 pb-20 grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* ── LEFT: Contact Info ── */}
        <SectionFadeIn>
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2
                className="text-2xl uppercase tracking-widest font-bold mb-6"
                style={{ color: "#FFFF00", textShadow: "0 0 15px rgba(255,255,0,0.5)" }}
              >
                Reach Us
              </h2>

              <div className="space-y-5">
                {[
                  {
                    icon: <Mail className="w-4 h-4" />,
                    label: "General",
                    value: "hello@dineatnight.com",
                    href: "mailto:hello@dineatnight.com",
                    color: "#FFFF00",
                  },
                  {
                    icon: <Mail className="w-4 h-4" />,
                    label: "Sponsorship",
                    value: "sponsors@dineatnight.com",
                    href: "mailto:sponsors@dineatnight.com",
                    color: "#FF3333",
                  },
                  {
                    icon: <Instagram className="w-4 h-4" />,
                    label: "Instagram",
                    value: "@dineatnight",
                    href: "https://instagram.com/dineatnight",
                    color: "#00FF41",
                  },
                ].map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="flex items-start gap-4 group"
                  >
                    <div
                      className="w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-300"
                      style={{
                        borderColor: `${item.color}30`,
                        color: `${item.color}60`,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = item.color;
                        (e.currentTarget as HTMLDivElement).style.color = item.color;
                        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 15px ${item.color}50`;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = `${item.color}30`;
                        (e.currentTarget as HTMLDivElement).style.color = `${item.color}60`;
                        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                      }}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-0.5">{item.label}</p>
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

            {/* Topic Cards */}
            <div>
              <h3 className="text-xs text-gray-600 uppercase tracking-widest mb-4">What Can We Help With?</h3>
              <div className="grid grid-cols-2 gap-2">
                {contactTopics.map((topic) => (
                  <div
                    key={topic.label}
                    className="rounded-lg border p-3 text-center cursor-default"
                    style={{
                      borderColor: `${topic.color}15`,
                      background: "rgba(10,10,10,0.8)",
                    }}
                  >
                    <div className="text-lg mb-1">{topic.icon}</div>
                    <p className="text-[10px] text-gray-600 leading-snug">{topic.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Response time note */}
            <div
              className="rounded-xl border p-4"
              style={{ borderColor: "rgba(0,255,65,0.15)", background: "rgba(0,255,65,0.03)" }}
            >
              <p className="text-xs text-gray-500 leading-relaxed">
                <span style={{ color: "#00FF41" }}>✓</span> We typically respond within 24–48 hours.
                For urgent vendor enquiries, DM us on Instagram.
              </p>
            </div>
          </div>
        </SectionFadeIn>

        {/* ── RIGHT: Contact Form ── */}
        <SectionFadeIn>
          <div className="lg:col-span-3">
            <div
              className="relative rounded-2xl border p-6 sm:p-8"
              style={{
                borderColor: "rgba(0,255,65,0.2)",
                background: "linear-gradient(135deg, #080808, #030303)",
                boxShadow: "0 0 40px rgba(0,255,65,0.06)",
              }}
            >
              {/* Corner accents */}
              <span className="absolute top-0 left-0 w-8 h-8" style={{ borderTop: "2px solid #00FF41", borderLeft: "2px solid #00FF41" }} />
              <span className="absolute bottom-0 right-0 w-8 h-8" style={{ borderBottom: "2px solid #00FF41", borderRight: "2px solid #00FF41" }} />

              {submitted ? (
                <motion.div
                  className="text-center py-12"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", damping: 20 }}
                >
                  <motion.div
                    className="text-6xl mb-5"
                    animate={{ scale: [0.8, 1.2, 1] }}
                    transition={{ duration: 0.6 }}
                  >
                    ✅
                  </motion.div>
                  <h3
                    className="text-2xl font-bold uppercase tracking-wide mb-3"
                    style={{ color: "#00FF41", textShadow: "0 0 15px rgba(0,255,65,0.6)" }}
                  >
                    Message Received!
                  </h3>
                  <p className="text-gray-400 leading-relaxed text-sm sm:text-base">
                    We&apos;ll get back to you within 24–48 hours. Thanks for reaching out.
                  </p>
                  <button
                    onClick={() => { setSubmitted(false); setForm({ name: "", email: "", topic: "", message: "" }); }}
                    className="mt-8 px-8 py-3 rounded-full border-2 border-[#00FF41] text-[#00FF41] uppercase tracking-widest text-sm font-bold hover:bg-[#00FF41] hover:text-black transition-all duration-300"
                  >
                    Send Another
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h2
                    className="text-xl font-bold uppercase tracking-widest mb-6"
                    style={{ color: "#00FF41", textShadow: "0 0 15px rgba(0,255,65,0.5)" }}
                  >
                    Send a Message
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Your Name" required>
                      <input name="name" value={form.name} onChange={handleChange} required placeholder="Full name" className={inputCls} />
                    </Field>
                    <Field label="Email Address" required>
                      <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="you@example.com" className={inputCls} />
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
                      <option value="" className="bg-[#0a0a0a]">Select a topic…</option>
                      {contactTopics.map((t) => (
                        <option key={t.label} value={t.label} className="bg-[#0a0a0a]">
                          {t.icon} {t.label}
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
                    <p className="text-gray-700 text-xs mt-1 text-right">{form.message.length}/1000</p>
                  </Field>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-full font-bold uppercase tracking-widest text-sm mt-1 flex items-center justify-center gap-3 transition-all duration-300"
                    style={{
                      background: loading ? "transparent" : "#00FF41",
                      color: loading ? "#00FF41" : "#000",
                      border: "2px solid #00FF41",
                      boxShadow: loading ? "0 0 20px rgba(0,255,65,0.25)" : "0 0 30px rgba(0,255,65,0.5)",
                    }}
                    whileHover={!loading ? { scale: 1.02 } : {}}
                    whileTap={!loading ? { scale: 0.97 } : {}}
                  >
                    {loading ? (
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
        <section className="py-16 px-6 max-w-5xl mx-auto">
          <Carousel
            title="Frequently Asked Questions"
            accentColor="#FFFF00"
            glowColor="rgba(255,255,0,0.35)"
            autoPlay={false}
            showDots
            showArrows
            items={[
              {
                id: "faq1",
                content: (
                  <div className="text-center px-6 py-8 max-w-2xl mx-auto">
                    <p className="text-3xl mb-4">🎟️</p>
                    <h3 className="text-lg font-bold uppercase tracking-wide mb-3" style={{ color: "#FFFF00" }}>
                      How do I get tickets?
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Head to our Events page, select an upcoming edition, and click &quot;Get Tickets&quot;.
                      You&apos;ll be redirected to our secure Paystack checkout. Your e-ticket with QR code
                      is sent instantly after payment.
                    </p>
                  </div>
                ),
              },
              {
                id: "faq2",
                content: (
                  <div className="text-center px-6 py-8 max-w-2xl mx-auto">
                    <p className="text-3xl mb-4">🍖</p>
                    <h3 className="text-lg font-bold uppercase tracking-wide mb-3" style={{ color: "#FF3333" }}>
                      How do I apply to vend?
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Visit our Vendors page and click &quot;Apply to Vend&quot;. Fill in your details —
                      food category, business name, Instagram, and a description of what you&apos;ll be serving.
                      We review all applications and get back within 5 business days.
                    </p>
                  </div>
                ),
              },
              {
                id: "faq3",
                content: (
                  <div className="text-center px-6 py-8 max-w-2xl mx-auto">
                    <p className="text-3xl mb-4">🤝</p>
                    <h3 className="text-lg font-bold uppercase tracking-wide mb-3" style={{ color: "#00FF41" }}>
                      How do I become a sponsor?
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Email us at sponsors@dineatnight.com with your brand name and what kind of partnership
                      you have in mind. We offer booth activations, brand mentions, social media features,
                      and custom integrations within the event experience.
                    </p>
                  </div>
                ),
              },
              {
                id: "faq4",
                content: (
                  <div className="text-center px-6 py-8 max-w-2xl mx-auto">
                    <p className="text-3xl mb-4">🌙</p>
                    <h3 className="text-lg font-bold uppercase tracking-wide mb-3" style={{ color: "#FFFF00" }}>
                      What exactly is Dine At Night?
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Dine At Night is Lagos&apos;s premier nighttime food market — an outdoor experience combining
                      the best local food vendors, live music, and neon-lit ambiance. It runs from dusk till
                      late, with a new edition every few months.
                    </p>
                  </div>
                ),
              },
            ]}
          />
        </section>
      </SectionFadeIn>

      <Footer />
    </div>
  );
}
