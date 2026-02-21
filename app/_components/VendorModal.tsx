"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import { upsertVendorApplication, getActiveEvents, type DanEvent } from "@/lib/firestore";

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FOOD_CATEGORIES = [
  "Street Food",
  "Grilled & BBQ",
  "Rice & Stews",
  "Snacks & Finger Foods",
  "Desserts & Sweets",
  "Drinks & Cocktails",
  "Fusion / International",
  "Other",
];

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
    <label className="block text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest mb-1.5">
      {label} {required && <span className="text-[#FFFF00]">*</span>}
    </label>
    {children}
  </div>
);

const inputCls =
  "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] focus:shadow-[0_0_15px_rgba(255,255,0,0.2)] transition-all placeholder:text-gray-700";

export default function VendorModal({ isOpen, onClose }: VendorModalProps) {
  const EMPTY_FORM = {
    brandName: "",
    ownerName: "",
    email: "",
    phone: "",
    instagram: "",
    categories: [] as string[],
    eventTitle: "",
    description: "",
    products: "",
    imageUrl: "",
  };

  const [form, setForm] = useState(EMPTY_FORM);
  const [activeEvents, setActiveEvents] = useState<DanEvent[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load active events for the event picker
  useEffect(() => {
    getActiveEvents().then(setActiveEvents).catch(() => {});
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const toggleCategory = (cat: string) => {
    setForm((p) => {
      if (p.categories.includes(cat)) {
        return { ...p, categories: p.categories.filter((c) => c !== cat) };
      }
      if (p.categories.length >= 3) return p; // max 3
      return { ...p, categories: [...p.categories, cat] };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.categories.length === 0) {
      setError("Please select at least one food category.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await upsertVendorApplication({
        brandName: form.brandName,
        ownerName: form.ownerName,
        email: form.email,
        phone: form.phone,
        instagram: form.instagram,
        categories: form.categories,
        events: form.eventTitle ? [form.eventTitle] : [],
        description: form.description,
        products: form.products,
        imageUrl: form.imageUrl,
      });
      setIsUpdate(result.isUpdate);
      setSubmitted(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("permission") || msg.includes("insufficient")) {
        setError("Submission is temporarily unavailable. Please try again shortly or contact us directly.");
      } else if (msg.includes("network") || msg.includes("unavailable")) {
        setError("Network error — please check your connection and try again.");
      } else {
        setError("Something went wrong. Please try again or reach out to us directly.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setSubmitted(false);
      setIsUpdate(false);
      setError("");
      setForm(EMPTY_FORM);
    }, 400);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

          {/* Sheet — slides up from bottom on mobile, scales in on desktop */}
          <motion.div
            className="relative w-full sm:max-w-lg max-h-[93svh] sm:max-h-[88vh] overflow-y-auto bg-[#050505] border border-[#FFFF00]/25 sm:rounded-2xl rounded-t-3xl"
            style={{
              boxShadow:
                "0 0 60px rgba(255,255,0,0.12), 0 0 120px rgba(255,255,0,0.05)",
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Desktop corner accents */}
            <span
              className="absolute top-0 left-0 w-8 h-8 hidden sm:block pointer-events-none"
              style={{ borderTop: "2px solid #FFFF00", borderLeft: "2px solid #FFFF00" }}
            />
            <span
              className="absolute bottom-0 right-0 w-8 h-8 hidden sm:block pointer-events-none"
              style={{ borderBottom: "2px solid #FFFF00", borderRight: "2px solid #FFFF00" }}
            />

            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center pt-4 pb-1">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            <div className="p-5 sm:p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2
                    className="text-2xl sm:text-3xl uppercase tracking-wide font-bold"
                    style={{ color: "#FFFF00", textShadow: "0 0 20px rgba(255,255,0,0.6)" }}
                  >
                    Apply to Vend
                  </h2>
                  <p className="text-gray-500 text-xs sm:text-sm mt-1">
                    Join Lagos&apos; first night food market
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/30 transition-all flex-shrink-0 ml-4"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {submitted ? (
                /* ── Success state ── */
                <motion.div
                  className="text-center py-10"
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
                    {isUpdate ? "Application Updated!" : "Application Received!"}
                  </h3>
                  <p className="text-gray-400 leading-relaxed mb-8 text-sm sm:text-base">
                    {isUpdate
                      ? "Your existing application has been updated with the new event. Our team will review it shortly."
                      : "We'll review your application and reach out within 5–7 business days. Get ready to dine after dark!"}
                  </p>
                  <button
                    onClick={handleClose}
                    className="px-8 py-3 rounded-full border-2 border-[#00FF41] text-[#00FF41] uppercase tracking-widest text-sm font-semibold hover:bg-[#00FF41] hover:text-black transition-all duration-300"
                  >
                    Got it!
                  </button>
                </motion.div>
              ) : (
                /* ── Form ── */
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Brand / Business Name" required>
                      <input
                        name="brandName"
                        value={form.brandName}
                        onChange={handleChange}
                        required
                        placeholder="e.g. Suya Spot Lagos"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Owner / Contact Name" required>
                      <input
                        name="ownerName"
                        value={form.ownerName}
                        onChange={handleChange}
                        required
                        placeholder="Your full name"
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <Field label="WhatsApp Number" required>
                      <input
                        name="phone"
                        type="tel"
                        value={form.phone}
                        onChange={handleChange}
                        required
                        placeholder="+234 800 000 0000"
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Event Applying For">
                      {activeEvents.length > 0 ? (
                        <select
                          name="eventTitle"
                          value={form.eventTitle}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] focus:shadow-[0_0_15px_rgba(255,255,0,0.2)] transition-all cursor-pointer"
                        >
                          <option value="" className="bg-[#0a0a0a]">Select event…</option>
                          {activeEvents.map((ev) => (
                            <option key={ev.id} value={ev.title} className="bg-[#0a0a0a]">
                              {ev.title}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          name="eventTitle"
                          value={form.eventTitle}
                          onChange={handleChange}
                          placeholder="e.g. Dine At Night — Edition 2"
                          className={inputCls}
                        />
                      )}
                    </Field>
                    <Field label="Instagram Handle">
                      <input
                        name="instagram"
                        value={form.instagram}
                        onChange={handleChange}
                        placeholder="@yourbrand"
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  {/* Multi-select categories */}
                  <Field label={`Food Categories (select up to 3)`} required>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {FOOD_CATEGORIES.map((cat) => {
                        const selected = form.categories.includes(cat);
                        const atMax = form.categories.length >= 3 && !selected;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            disabled={atMax}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border transition-all duration-200"
                            style={{
                              borderColor: selected ? "#FFFF00" : "rgba(255,255,255,0.12)",
                              color: selected ? "#FFFF00" : atMax ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.5)",
                              background: selected ? "rgba(255,255,0,0.1)" : "transparent",
                              boxShadow: selected ? "0 0 10px rgba(255,255,0,0.2)" : "none",
                            }}
                          >
                            {selected && <Check className="w-3 h-3" />}
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-gray-700 text-xs mt-2">
                      {form.categories.length}/3 selected
                      {form.categories.length === 3 && " — maximum reached"}
                    </p>
                  </Field>

                  <Field label="Tell Us About Your Brand" required>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      required
                      rows={3}
                      maxLength={300}
                      placeholder="What do you sell? What makes your food special?"
                      className={`${inputCls} resize-none`}
                    />
                    <p className="text-gray-700 text-xs mt-1 text-right">
                      {form.description.length}/300
                    </p>
                  </Field>

                  <Field label="What Do You Sell? (List your products)" required>
                    <textarea
                      name="products"
                      value={form.products}
                      onChange={handleChange}
                      required
                      rows={3}
                      placeholder="e.g. Suya, Grilled Chicken, Peppered Fish, Spiced Wings"
                      className={`${inputCls} resize-none`}
                    />
                  </Field>

                  <Field label="Brand / Food Photo URL" required>
                    <input
                      name="imageUrl"
                      type="url"
                      value={form.imageUrl}
                      onChange={handleChange}
                      required
                      placeholder="https://example.com/your-food-photo.jpg"
                      className={inputCls}
                    />
                    <p className="text-gray-700 text-xs mt-1">
                      Link to a photo of your food or brand. Each application adds a new photo — re-applying vendors get a slideshow on their profile.
                    </p>
                  </Field>

                  {error && (
                    <p className="text-[#FF3333] text-xs text-center py-1">{error}</p>
                  )}

                  <motion.button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-full font-bold uppercase tracking-widest text-sm mt-2 transition-all duration-300"
                    style={{
                      background: loading ? "transparent" : "#FFFF00",
                      color: loading ? "#FFFF00" : "#000",
                      border: "2px solid #FFFF00",
                      boxShadow: loading
                        ? "0 0 20px rgba(255,255,0,0.25)"
                        : "0 0 30px rgba(255,255,0,0.5)",
                    }}
                    whileHover={!loading ? { scale: 1.02 } : {}}
                    whileTap={!loading ? { scale: 0.97 } : {}}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-3">
                        <span className="w-4 h-4 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
                        Submitting…
                      </span>
                    ) : (
                      "Submit Application →"
                    )}
                  </motion.button>

                  <p className="text-gray-700 text-xs text-center pb-2">
                    We review all applications carefully. Only quality vendors are selected.
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
