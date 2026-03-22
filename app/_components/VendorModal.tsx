"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LordIcon from "@/app/_components/LordIcon";
import {
  X,
  Check,
  Plus,
  Trash2,
  Upload,
  ChevronLeft,
  Download,
  User,
  Mail,
  Phone,
  Instagram,
  Tag,
  FileText,
  BookOpen,
} from "lucide-react";
import {
  upsertVendorApplication,
  getActiveEvents,
  type DanEvent,
  type VendorMenuCategory,
  type VendorMenuItem,
} from "@/lib/firestore";
import { getCache, setCache } from "@/lib/cache";
import { useScrollLock } from "@/lib/useScrollLock";
import ImageUpload from "@/app/_components/ImageUpload";

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FOOD_CATEGORIES = ["Food", "Drinks", "Dessert"];

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

const EMPTY_CATEGORY = (): VendorMenuCategory => ({
  name: "",
  items: [{ name: "", price: "" }],
});

// Module-level constant — not recreated on every render
const EMPTY_FORM = {
  brandName: "",
  ownerName: "",
  email: "",
  phone: "",
  instagram: "",
  categories: [] as string[],
  eventTitle: "",
  description: "",
  logoUrl: "",
  imageUrl: "",
};

// ── Review row helper ─────────────────────────────────────────────────────
function ReviewRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      {icon && (
        <span className="text-gray-600 mt-0.5 flex-shrink-0">{icon}</span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-0.5">
          {label}
        </p>
        <p className="text-gray-300 text-xs leading-relaxed break-words">
          {value}
        </p>
      </div>
    </div>
  );
}

export default function VendorModal({ isOpen, onClose }: VendorModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [menu, setMenu] = useState<VendorMenuCategory[]>([EMPTY_CATEGORY()]);
  const [menuUploadError, setMenuUploadError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeEvents, setActiveEvents] = useState<DanEvent[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);
  const [modalProgress, setModalProgress] = useState(0);
  useScrollLock(isOpen);

  const handleModalScroll = () => {
    const el = modalScrollRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    setModalProgress(scrollable > 0 ? el.scrollTop / scrollable : 0);
  };

  useEffect(() => {
    // Serve from cache immediately so the dropdown isn't empty on open
    const cached = getCache<DanEvent[]>("dan_active_events");
    if (cached?.length) setActiveEvents(cached);
    // Then fetch fresh data in the background
    getActiveEvents()
      .then((evs) => {
        setActiveEvents(evs);
        setCache("dan_active_events", evs);
      })
      .catch(() => {});
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const toggleCategory = (cat: string) => {
    setForm((p) => {
      if (p.categories.includes(cat))
        return { ...p, categories: p.categories.filter((c) => c !== cat) };
      if (p.categories.length >= 3) return p;
      return { ...p, categories: [...p.categories, cat] };
    });
  };

  // ── Step 1 → Step 2 ───────────────────────────────────────────────────────
  const handleNext = () => {
    if (
      !form.brandName.trim() ||
      !form.ownerName.trim() ||
      !form.email.trim() ||
      !form.phone.trim()
    ) {
      setError("Please fill in all required fields.");
      return;
    }
    if (form.categories.length === 0) {
      setError("Please select at least one food category.");
      return;
    }
    if (!form.description.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    setError("");
    setStep(2);
  };

  // ── Menu helpers ──────────────────────────────────────────────────────────
  const addCategory = () => setMenu((prev) => [...prev, EMPTY_CATEGORY()]);

  const removeCategory = (ci: number) =>
    setMenu((prev) => prev.filter((_, i) => i !== ci));

  const updateCategoryName = (ci: number, name: string) =>
    setMenu((prev) =>
      prev.map((cat, i) => (i === ci ? { ...cat, name } : cat)),
    );

  const addItem = (ci: number) =>
    setMenu((prev) =>
      prev.map((cat, i) =>
        i === ci
          ? { ...cat, items: [...cat.items, { name: "", price: "" }] }
          : cat,
      ),
    );

  const removeItem = (ci: number, ii: number) =>
    setMenu((prev) =>
      prev.map((cat, i) =>
        i === ci
          ? { ...cat, items: cat.items.filter((_, j) => j !== ii) }
          : cat,
      ),
    );

  const updateItem = (
    ci: number,
    ii: number,
    field: keyof VendorMenuItem,
    value: string,
  ) =>
    setMenu((prev) =>
      prev.map((cat, i) =>
        i === ci
          ? {
              ...cat,
              items: cat.items.map((item, j) =>
                j === ii ? { ...item, [field]: value } : item,
              ),
            }
          : cat,
      ),
    );

  // ── Excel / CSV upload ───────────────────────────────────────────────────
  const processFile = async (file: File) => {
    setMenuUploadError("");

    const parseRows = (rows: string[][]) => {
      const firstLower = (rows[0]?.[0] ?? "").toLowerCase();
      const startIdx =
        firstLower === "category" || firstLower === "cat" ? 1 : 0;

      const catMap = new Map<string, VendorMenuItem[]>();
      for (let i = startIdx; i < rows.length; i++) {
        const catName = (rows[i][0] ?? "").trim();
        const itemName = (rows[i][1] ?? "").trim();
        const price = (rows[i][2] ?? "").trim();
        if (!catName || !itemName) continue;
        if (!catMap.has(catName)) catMap.set(catName, []);
        catMap.get(catName)!.push({ name: itemName, price });
      }

      const parsed: VendorMenuCategory[] = Array.from(catMap.entries()).map(
        ([name, items]) => ({ name, items }),
      );

      if (parsed.length > 0) {
        setMenu(parsed);
      } else {
        setMenuUploadError(
          "Could not parse file. Expected columns: Category, Item Name, Price",
        );
      }
    };

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
        header: 1,
        defval: "",
      });
      parseRows(rows as string[][]);
    } catch {
      setMenuUploadError(
        "Failed to read file. Make sure it is a valid .xlsx or .csv file.",
      );
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".csv")) {
      setMenuUploadError("Please drop a .xlsx or .csv file.");
      return;
    }
    await processFile(file);
  };

  // ── Clean menu for preview + submit ──────────────────────────────────────
  const getCleanMenu = () =>
    menu
      .filter(
        (cat) => cat.name.trim() && cat.items.some((item) => item.name.trim()),
      )
      .map((cat) => ({
        name: cat.name.trim(),
        items: cat.items
          .filter((item) => item.name.trim())
          .map((item) => ({
            name: item.name.trim(),
            price: item.price.trim(),
          })),
      }));

  // ── Final submit ──────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const cleanMenu = getCleanMenu();

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
        ...(form.logoUrl ? { logoUrl: form.logoUrl } : {}),
        imageUrl: form.imageUrl,
        menu: cleanMenu.length > 0 ? cleanMenu : undefined,
      });
      setIsUpdate(result.isUpdate);
      setSubmitted(true);

      if (!result.isUpdate) {
        fetch("/api/emails/vendor-applied", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownerName: form.ownerName,
            brandName: form.brandName,
            email: form.email,
            phone: form.phone || undefined,
            instagram: form.instagram || undefined,
            categories: form.categories,
            description: form.description || undefined,
          }),
        }).catch((err) =>
          console.error("[vendor-applied] email notify failed:", err),
        );
      }
    } catch (err) {
      console.error("[VendorModal] submit failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("permission") || msg.includes("insufficient")) {
        setError(
          "Submission is temporarily unavailable. Please try again shortly or contact us directly.",
        );
      } else if (msg.includes("network") || msg.includes("unavailable")) {
        setError("Network error — please check your connection and try again.");
      } else {
        setError(
          "Something went wrong. Please try again or reach out to us directly.",
        );
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
      setStep(1);
      setForm(EMPTY_FORM);
      setMenu([EMPTY_CATEGORY()]);
      setMenuUploadError("");
      setIsDragOver(false);
    }, 400);
  };

  const STEPS = [
    { n: 1, label: "Details" },
    { n: 2, label: "Menu" },
    { n: 3, label: "Review" },
  ] as const;

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
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

          <motion.div
            className="relative w-full sm:max-w-lg bg-[#050505] border border-[#FFFF00]/25 sm:rounded-2xl rounded-t-3xl"
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
            {/* Corner decorations — on the outer wrapper so they never scroll */}
            <span
              className="absolute top-0 left-0 w-8 h-8 hidden sm:block pointer-events-none z-10"
              style={{
                borderTop: "2px solid #FFFF00",
                borderLeft: "2px solid #FFFF00",
              }}
            />
            <span
              className="absolute bottom-0 right-0 w-8 h-8 hidden sm:block pointer-events-none z-10"
              style={{
                borderBottom: "2px solid #FFFF00",
                borderRight: "2px solid #FFFF00",
              }}
            />
            {/* Scrollable content */}
            <div
              ref={modalScrollRef}
              className="overflow-y-auto scrollbar-hide max-h-[93svh] sm:max-h-[88vh]"
              onScroll={handleModalScroll}
            >
              {/* Modal scroll progress bar */}
              <div className="sticky top-0 left-0 w-full h-[3px] z-10 pointer-events-none">
                <div
                  style={{
                    width: `${modalProgress * 100}%`,
                    height: "100%",
                    background:
                      "linear-gradient(to right, #FF3333, #FFFF00, #00FF41)",
                    transition: "width 60ms linear",
                  }}
                />
              </div>

              <div className="sm:hidden flex justify-center pt-4 pb-1">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

              <div className="p-5 sm:p-8">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h2
                      className="text-2xl sm:text-3xl uppercase tracking-wide font-bold"
                      style={{
                        color: "#FFFF00",
                        textShadow: "0 0 20px rgba(255,255,0,0.6)",
                      }}
                    >
                      Apply
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
                  /* ── Success ── */
                  <motion.div
                    className="text-center py-10"
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
                      {isUpdate
                        ? "Application Updated!"
                        : "Application Received!"}
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
                  <>
                    {/* ── Step indicator ── */}
                    <div className="flex items-center gap-1.5 mb-6">
                      {STEPS.map(({ n, label }, idx) => {
                        const done = step > n;
                        const active = step === n;
                        return (
                          <div
                            key={n}
                            className="flex items-center gap-1.5 flex-1"
                          >
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all flex-shrink-0"
                              style={{
                                borderColor: done
                                  ? "#00FF41"
                                  : active
                                    ? "#FFFF00"
                                    : "rgba(255,255,255,0.12)",
                                color: done
                                  ? "#000"
                                  : active
                                    ? "#FFFF00"
                                    : "rgba(255,255,255,0.2)",
                                background: done ? "#00FF41" : "transparent",
                              }}
                            >
                              {done ? <Check className="w-3 h-3" /> : String(n)}
                            </div>
                            <span
                              className="text-[9px] uppercase tracking-widest flex-shrink-0 hidden sm:block"
                              style={{
                                color: active
                                  ? "#FFFF00"
                                  : done
                                    ? "#00FF41"
                                    : "rgba(255,255,255,0.2)",
                              }}
                            >
                              {label}
                            </span>
                            {idx < STEPS.length - 1 && (
                              <div
                                className="flex-1 h-px mx-1 transition-all"
                                style={{
                                  background:
                                    step > n
                                      ? "rgba(0,255,65,0.4)"
                                      : "rgba(255,255,255,0.08)",
                                }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <AnimatePresence mode="wait">
                      {/* ═══════════════════════════════════
                        STEP 1 — DETAILS
                    ═══════════════════════════════════ */}
                      {step === 1 && (
                        <motion.form
                          key="step1"
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleNext();
                          }}
                          className="space-y-4"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                        >
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
                                  <option value="" className="bg-[#0a0a0a]">
                                    Select event…
                                  </option>
                                  {activeEvents.map((ev) => (
                                    <option
                                      key={ev.id}
                                      value={ev.title}
                                      className="bg-[#0a0a0a]"
                                    >
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

                          <Field
                            label="Food Categories (select up to 3)"
                            required
                          >
                            <div className="flex flex-wrap gap-2 mt-1">
                              {FOOD_CATEGORIES.map((cat) => {
                                const selected = form.categories.includes(cat);
                                const atMax =
                                  form.categories.length >= 3 && !selected;
                                return (
                                  <button
                                    key={cat}
                                    type="button"
                                    onClick={() => toggleCategory(cat)}
                                    disabled={atMax}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border transition-all duration-200"
                                    style={{
                                      borderColor: selected
                                        ? "#FFFF00"
                                        : "rgba(255,255,255,0.12)",
                                      color: selected
                                        ? "#FFFF00"
                                        : atMax
                                          ? "rgba(255,255,255,0.2)"
                                          : "rgba(255,255,255,0.5)",
                                      background: selected
                                        ? "rgba(255,255,0,0.1)"
                                        : "transparent",
                                      boxShadow: selected
                                        ? "0 0 10px rgba(255,255,0,0.2)"
                                        : "none",
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
                              {form.categories.length === 3 &&
                                " — maximum reached"}
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

                          <Field label="Brand Logo">
                            <ImageUpload
                              value={form.imageUrl}
                              onChange={(url) =>
                                setForm((p) => ({ ...p, imageUrl: url }))
                              }
                              folder="vendors/photos"
                              compact
                              hint="A clear photo of your food or brand. Optional."
                            />
                          </Field>

                          {error && (
                            <p className="text-[#FF3333] text-xs text-center py-1">
                              {error}
                            </p>
                          )}

                          <motion.button
                            type="submit"
                            className="w-full py-4 rounded-full font-bold uppercase tracking-widest text-sm mt-2 transition-all duration-300"
                            style={{
                              background: "#FFFF00",
                              color: "#000",
                              border: "2px solid #FFFF00",
                              boxShadow: "0 0 30px rgba(255,255,0,0.4)",
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            Next — Add Your Menu →
                          </motion.button>

                          <p className="text-gray-700 text-xs text-center pb-2">
                            We review all applications carefully. Only quality
                            vendors are selected.
                          </p>
                        </motion.form>
                      )}

                      {/* ═══════════════════════════════════
                        STEP 2 — MENU
                    ═══════════════════════════════════ */}
                      {step === 2 && (
                        <motion.div
                          key="step2"
                          className="space-y-5"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div>
                            <h3 className="text-base font-bold text-white uppercase tracking-widest">
                              Your Menu
                            </h3>
                            <p className="text-gray-600 text-xs mt-0.5">
                              Optional — add your menu items so the admin can
                              see exactly what you&apos;ll be serving.
                            </p>
                          </div>

                          {/* Upload zone */}
                          <div className="space-y-3">
                            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                              Upload from Excel / CSV
                            </p>

                            {/* Drag & drop zone */}
                            <div
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={handleDrop}
                              onClick={() => fileInputRef.current?.click()}
                              className="cursor-pointer rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2.5 py-8 px-4 transition-all duration-200 select-none"
                              style={{
                                borderColor: isDragOver
                                  ? "#FFFF00"
                                  : "rgba(255,255,255,0.1)",
                                background: isDragOver
                                  ? "rgba(255,255,0,0.04)"
                                  : "rgba(255,255,255,0.01)",
                                boxShadow: isDragOver
                                  ? "0 0 24px rgba(255,255,0,0.08)"
                                  : "none",
                              }}
                            >
                              <Upload
                                className="w-7 h-7 transition-colors duration-200"
                                style={{
                                  color: isDragOver
                                    ? "#FFFF00"
                                    : "rgba(255,255,255,0.18)",
                                }}
                              />
                              <div className="text-center">
                                <p
                                  className="text-xs font-bold transition-colors duration-200"
                                  style={{
                                    color: isDragOver
                                      ? "#FFFF00"
                                      : "rgba(255,255,255,0.4)",
                                  }}
                                >
                                  {isDragOver
                                    ? "Drop to import"
                                    : "Drag & drop your file here"}
                                </p>
                                <p className="text-gray-700 text-[10px] mt-1">
                                  or{" "}
                                  <span
                                    className="underline"
                                    style={{
                                      color: isDragOver
                                        ? "#FFFF00"
                                        : "rgba(255,255,0,0.55)",
                                    }}
                                  >
                                    click to browse
                                  </span>
                                </p>
                              </div>
                              <p className="text-gray-700 text-[10px]">
                                .xlsx or .csv &nbsp;·&nbsp; Category | Item Name
                                | Price
                              </p>
                            </div>

                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".xlsx,.csv"
                              onChange={handleFileUpload}
                              className="hidden"
                            />

                            {/* Reference download */}
                            <a
                              href="/Menu_Reference.xlsx"
                              download
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#FFFF00]/70 hover:text-[#FFFF00] border border-[#FFFF00]/20 hover:border-[#FFFF00]/50 px-3 py-1.5 rounded-lg transition-all"
                            >
                              <Download className="w-3 h-3" />
                              Download Template
                            </a>

                            {menuUploadError && (
                              <p className="text-[#FF3333] text-xs">
                                {menuUploadError}
                              </p>
                            )}
                          </div>

                          {/* Divider */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-white/8" />
                            <span className="text-gray-700 text-[10px] uppercase tracking-widest">
                              or type below
                            </span>
                            <div className="flex-1 h-px bg-white/8" />
                          </div>

                          {/* Menu builder */}
                          <div className="space-y-4">
                            {menu.map((cat, ci) => (
                              <div
                                key={ci}
                                className="rounded-xl border border-white/8 bg-white/[0.015] p-4 space-y-3"
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={cat.name}
                                    onChange={(e) =>
                                      updateCategoryName(ci, e.target.value)
                                    }
                                    placeholder="Category name (e.g. Starters, Mains, Drinks)"
                                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-bold focus:outline-none focus:border-[#FFFF00] transition-all placeholder:text-gray-700"
                                  />
                                  {menu.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeCategory(ci)}
                                      className="w-8 h-8 rounded-lg border border-white/8 flex items-center justify-center text-gray-600 hover:text-[#FF3333] hover:border-red-400/25 transition-all flex-shrink-0"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>

                                <div className="space-y-2 pl-1">
                                  {cat.items.map((item, ii) => (
                                    <div
                                      key={ii}
                                      className="flex items-center gap-2"
                                    >
                                      <input
                                        type="text"
                                        value={item.name}
                                        onChange={(e) =>
                                          updateItem(
                                            ci,
                                            ii,
                                            "name",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Item name"
                                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all placeholder:text-gray-700"
                                      />
                                      <div className="relative flex-shrink-0">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm pointer-events-none">
                                          ₦
                                        </span>
                                        <input
                                          type="text"
                                          value={item.price}
                                          onChange={(e) =>
                                            updateItem(
                                              ci,
                                              ii,
                                              "price",
                                              e.target.value,
                                            )
                                          }
                                          placeholder="Price"
                                          className="w-24 pl-7 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all placeholder:text-gray-700"
                                        />
                                      </div>
                                      {cat.items.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => removeItem(ci, ii)}
                                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-700 hover:text-[#FF3333] transition-all flex-shrink-0"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => addItem(ci)}
                                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:text-[#FFFF00] transition-all ml-1"
                                >
                                  <Plus className="w-3 h-3" /> Add item
                                </button>
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={addCategory}
                            className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-white/15 text-gray-600 text-xs font-bold uppercase tracking-widest hover:border-[#FFFF00]/40 hover:text-[#FFFF00] transition-all justify-center"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add New Category
                          </button>

                          {/* Buttons */}
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setStep(1);
                                setError("");
                              }}
                              className="flex items-center gap-1.5 px-5 py-4 rounded-full border border-white/15 text-gray-400 text-sm font-bold uppercase tracking-widest hover:border-white/30 hover:text-white transition-all"
                            >
                              <ChevronLeft className="w-4 h-4" /> Back
                            </button>
                            <motion.button
                              type="button"
                              onClick={() => setStep(3)}
                              className="flex-1 py-4 rounded-full font-bold uppercase tracking-widest text-sm transition-all duration-300"
                              style={{
                                background: "#FFFF00",
                                color: "#000",
                                border: "2px solid #FFFF00",
                                boxShadow: "0 0 30px rgba(255,255,0,0.4)",
                              }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                            >
                              Next — Review →
                            </motion.button>
                          </div>

                          <p className="text-gray-700 text-xs text-center pb-2">
                            Menu is optional — you can skip to review now.
                          </p>
                        </motion.div>
                      )}

                      {/* ═══════════════════════════════════
                        STEP 3 — REVIEW
                    ═══════════════════════════════════ */}
                      {step === 3 && (
                        <motion.form
                          key="step3"
                          onSubmit={handleSubmit}
                          className="space-y-4"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div>
                            <h3 className="text-base font-bold text-white uppercase tracking-widest">
                              Review Your Application
                            </h3>
                            <p className="text-gray-600 text-xs mt-0.5">
                              Check everything below before submitting.
                            </p>
                          </div>

                          {/* ── Details summary ── */}
                          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
                            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold flex items-center gap-1.5">
                              <User className="w-3 h-3" /> Your Details
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <ReviewRow
                                label="Brand Name"
                                value={form.brandName}
                              />
                              <ReviewRow
                                label="Owner Name"
                                value={form.ownerName}
                              />
                              <ReviewRow
                                icon={<Mail className="w-3 h-3" />}
                                label="Email"
                                value={form.email}
                              />
                              <ReviewRow
                                icon={<Phone className="w-3 h-3" />}
                                label="WhatsApp"
                                value={form.phone}
                              />
                              {form.instagram && (
                                <ReviewRow
                                  icon={<Instagram className="w-3 h-3" />}
                                  label="Instagram"
                                  value={form.instagram}
                                />
                              )}
                              {form.eventTitle && (
                                <ReviewRow
                                  label="Event"
                                  value={form.eventTitle}
                                />
                              )}
                            </div>

                            {/* Categories */}
                            <div>
                              <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-1.5 flex items-center gap-1">
                                <Tag className="w-3 h-3" /> Categories
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {form.categories.map((cat) => (
                                  <span
                                    key={cat}
                                    className="text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wide"
                                    style={{
                                      borderColor: "rgba(255,255,0,0.3)",
                                      color: "#FFFF00",
                                      background: "rgba(255,255,0,0.06)",
                                    }}
                                  >
                                    {cat}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Description */}
                            <div>
                              <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-1 flex items-center gap-1">
                                <FileText className="w-3 h-3" /> About
                              </p>
                              <p className="text-gray-300 text-xs leading-relaxed">
                                {form.description}
                              </p>
                            </div>

                            {/* Edit details link */}
                            <button
                              type="button"
                              onClick={() => {
                                setStep(1);
                                setError("");
                              }}
                              className="text-[10px] uppercase tracking-widest text-gray-600 hover:text-[#FFFF00] transition-colors"
                            >
                              ✎ Edit details
                            </button>
                          </div>

                          {/* ── Menu summary ── */}
                          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold flex items-center gap-1.5">
                                <BookOpen className="w-3 h-3" /> Your Menu
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setStep(2);
                                  setError("");
                                }}
                                className="text-[10px] uppercase tracking-widest text-gray-600 hover:text-[#FFFF00] transition-colors"
                              >
                                ✎ Edit menu
                              </button>
                            </div>

                            {(() => {
                              const preview = getCleanMenu();
                              if (preview.length === 0) {
                                return (
                                  <p className="text-gray-700 text-xs italic">
                                    No menu added — you can add one later.
                                  </p>
                                );
                              }
                              return (
                                <div className="space-y-3">
                                  {preview.map((cat, ci) => (
                                    <div key={ci}>
                                      <p
                                        className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
                                        style={{ color: "#FFFF00" }}
                                      >
                                        {cat.name}
                                      </p>
                                      <div className="space-y-1">
                                        {cat.items.map((item, ii) => (
                                          <div
                                            key={ii}
                                            className="flex items-center justify-between gap-4"
                                          >
                                            <span className="text-gray-300 text-xs">
                                              {item.name}
                                            </span>
                                            {item.price && (
                                              <span className="text-gray-500 text-xs flex-shrink-0">
                                                ₦{item.price}
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>

                          {error && (
                            <p className="text-[#FF3333] text-xs text-center py-1">
                              {error}
                            </p>
                          )}

                          {/* Buttons */}
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setStep(2);
                                setError("");
                              }}
                              className="flex items-center gap-1.5 px-5 py-4 rounded-full border border-white/15 text-gray-400 text-sm font-bold uppercase tracking-widest hover:border-white/30 hover:text-white transition-all"
                            >
                              <ChevronLeft className="w-4 h-4" /> Back
                            </button>
                            <motion.button
                              type="submit"
                              disabled={loading}
                              className="flex-1 py-4 rounded-full font-bold uppercase tracking-widest text-sm transition-all duration-300"
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
                          </div>

                          <p className="text-gray-700 text-xs text-center pb-2">
                            We review all applications carefully. Only quality
                            vendors are selected.
                          </p>
                        </motion.form>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            </div>{" "}
            {/* end scrollable inner */}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
