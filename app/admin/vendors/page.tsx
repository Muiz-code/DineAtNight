"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getAllVendors,
  updateVendorStatus,
  createVendorDirect,
  deleteVendor,
  type DanVendor,
} from "@/lib/firestore";
import { Plus, Check, X, RotateCcw, Trash2, Store, ChevronRight, Mail, Phone, Instagram, Tag, FileText, ShoppingBag, Calendar } from "lucide-react";

const inputCls =
  "w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all placeholder:text-gray-700";

const FOOD_CATEGORIES = [
  "Street Food", "Grilled & BBQ", "Rice & Stews", "Snacks & Finger Foods",
  "Desserts & Sweets", "Drinks & Cocktails", "Fusion / International", "Other",
];

const EMPTY_FORM = {
  brandName: "", ownerName: "", email: "", phone: "", instagram: "",
  categories: [] as string[], events: [] as string[],
  description: "", products: "", imageUrl: "",
  status: "approved" as DanVendor["status"],
};

type FormState = typeof EMPTY_FORM;
type TabKey = "pending" | "approved" | "declined" | "reapplying";

const TAB_CONFIG: { key: TabKey; label: string; accent: string }[] = [
  { key: "pending",    label: "Pending",      accent: "#FFFF00" },
  { key: "approved",  label: "Approved",     accent: "#00FF41" },
  { key: "declined",  label: "Declined",     accent: "#FF3333" },
  { key: "reapplying", label: "Re-applying", accent: "#FF8C00" },
];

const StatusBadge = ({ status }: { status: DanVendor["status"] }) => {
  const styles = {
    pending:  { color: "#FFFF00", bg: "rgba(255,255,0,0.1)",  border: "rgba(255,255,0,0.3)"  },
    approved: { color: "#00FF41", bg: "rgba(0,255,65,0.1)",   border: "rgba(0,255,65,0.3)"   },
    declined: { color: "#FF3333", bg: "rgba(255,51,51,0.1)",  border: "rgba(255,51,51,0.3)"  },
  }[status];
  return (
    <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border"
      style={{ color: styles.color, background: styles.bg, borderColor: styles.border }}>
      {status}
    </span>
  );
};

// Auto-advancing image carousel for the detail drawer
function DrawerImageCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % images.length), 3500);
    return () => clearInterval(t);
  }, [images.length]);

  return (
    <div className="relative w-full h-52 overflow-hidden flex-shrink-0">
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src + i} src={src} alt={`${alt} ${i + 1}`}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: i === idx ? 1 : 0 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      ))}
      {/* Dot indicators + photo count */}
      {images.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex flex-col items-center gap-1.5 z-10">
          <div className="flex gap-1.5">
            {images.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === idx ? "14px" : "5px",
                  height: "5px",
                  background: i === idx ? "#FFFF00" : "rgba(255,255,255,0.35)",
                }} />
            ))}
          </div>
          <span className="text-[9px] text-gray-500 uppercase tracking-widest">
            {idx + 1} / {images.length} photos
          </span>
        </div>
      )}
    </div>
  );
}

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<DanVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("pending");

  // Detail drawer
  const [detailVendor, setDetailVendor] = useState<DanVendor | null>(null);
  const [showPreviousDetails, setShowPreviousDetails] = useState(false);

  // Add vendor form modal
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Decline reason modal
  const [declineTarget, setDeclineTarget] = useState<DanVendor | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setVendors(await getAllVendors()); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const byTab = {
    pending:    vendors.filter((v) => v.status === "pending"),
    approved:   vendors.filter((v) => v.status === "approved"),
    declined:   vendors.filter((v) => v.status === "declined"),
    reapplying: vendors.filter((v) => (v.reapplyCount ?? 0) > 0),
  };

  /* ── Actions ── */
  const handleApprove = async (v: DanVendor) => {
    await updateVendorStatus(v.id!, "approved");
    const updated = { ...v, status: "approved" as const };
    setVendors((prev) => prev.map((x) => x.id === v.id ? updated : x));
    if (detailVendor?.id === v.id) setDetailVendor(updated);
  };

  const openDecline = (v: DanVendor) => { setDeclineTarget(v); setDeclineReason(""); };

  const confirmDecline = async () => {
    if (!declineTarget) return;
    setDeclining(true);
    await updateVendorStatus(declineTarget.id!, "declined", declineReason);
    const updated = { ...declineTarget, status: "declined" as const, declineReason };
    setVendors((prev) => prev.map((x) => x.id === declineTarget.id ? updated : x));
    if (detailVendor?.id === declineTarget.id) setDetailVendor(updated);
    setDeclineTarget(null);
    setDeclining(false);
  };

  const handleResubmit = async (v: DanVendor) => {
    await updateVendorStatus(v.id!, "pending");
    const updated = { ...v, status: "pending" as const, declineReason: "" };
    setVendors((prev) => prev.map((x) => x.id === v.id ? updated : x));
    if (detailVendor?.id === v.id) setDetailVendor(updated);
    setActiveTab("pending");
  };

  const handleRevoke = async (v: DanVendor) => {
    await updateVendorStatus(v.id!, "declined", "Revoked by admin");
    const updated = { ...v, status: "declined" as const, declineReason: "Revoked by admin" };
    setVendors((prev) => prev.map((x) => x.id === v.id ? updated : x));
    if (detailVendor?.id === v.id) setDetailVendor(updated);
  };

  const handleDelete = async (v: DanVendor) => {
    if (!confirm(`Delete "${v.brandName}"? This cannot be undone.`)) return;
    await deleteVendor(v.id!);
    setVendors((prev) => prev.filter((x) => x.id !== v.id));
    if (detailVendor?.id === v.id) setDetailVendor(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const toggleFormCategory = (cat: string) => {
    setForm((p) => {
      if (p.categories.includes(cat)) return { ...p, categories: p.categories.filter((c) => c !== cat) };
      if (p.categories.length >= 3) return p;
      return { ...p, categories: [...p.categories, cat] };
    });
  };

  const [eventInput, setEventInput] = useState("");
  const addFormEvent = () => {
    const ev = eventInput.trim();
    if (!ev || form.events.includes(ev)) return;
    setForm((p) => ({ ...p, events: [...p.events, ev] }));
    setEventInput("");
  };
  const removeFormEvent = (ev: string) => setForm((p) => ({ ...p, events: p.events.filter((e) => e !== ev) }));

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createVendorDirect(form);
      setFormOpen(false);
      setForm(EMPTY_FORM);
      setEventInput("");
      await load();
      setActiveTab(form.status === "approved" ? "approved" : "pending");
    } finally { setSaving(false); }
  };

  const currentList = byTab[activeTab];
  const currentAccent = TAB_CONFIG.find((t) => t.key === activeTab)!.accent;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-widest" style={{ color: "#FFFF00" }}>Vendors</h1>
          <p className="text-gray-600 text-sm mt-1">
            {byTab.pending.length} pending · {byTab.approved.length} approved · {byTab.declined.length} declined · {byTab.reapplying.length} re-applying
          </p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setFormOpen(true); }}
          className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm uppercase tracking-widest text-black flex-shrink-0"
          style={{ background: "#FFFF00", boxShadow: "0 0 20px rgba(255,255,0,0.4)" }}
        >
          <Plus className="w-4 h-4" /> Add Vendor
        </button>
      </div>

      {/* ── Tabs — scrollable on mobile ── */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
      <div className="flex gap-1 p-1 rounded-xl border border-white/8 bg-white/[0.02] w-fit min-w-max">
        {TAB_CONFIG.map(({ key, label, accent }) => {
          const active = activeTab === key;
          const count = byTab[key].length;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="relative flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold uppercase tracking-widest transition-all duration-200"
              style={{
                color: active ? accent : "rgba(255,255,255,0.3)",
                background: active ? `${accent}12` : "transparent",
              }}
            >
              {label}
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                style={{
                  background: active ? `${accent}25` : "rgba(255,255,255,0.06)",
                  color: active ? accent : "rgba(255,255,255,0.3)",
                }}
              >
                {count}
              </span>
              {active && (
                <motion.span
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-3 right-3 h-px rounded-full"
                  style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
                />
              )}
            </button>
          );
        })}
      </div>
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          {currentList.length === 0 ? (
            <div className="flex items-center gap-3 px-5 py-10 rounded-xl border border-white/5 text-gray-700 text-sm justify-center flex-col">
              <Store className="w-8 h-8 opacity-30" />
              <span>
                {activeTab === "pending"    ? "No pending applications" :
                 activeTab === "approved"   ? "No approved vendors yet" :
                 activeTab === "declined"   ? "No declined vendors" :
                 "No re-applying vendors yet"}
              </span>
            </div>
          ) : (
            currentList.map((v) => (
              <div
                key={v.id}
                className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 rounded-xl border border-white/8 bg-white/[0.02] group"
              >
                {/* Thumbnail with optional photo count badge */}
                <div className="relative flex-shrink-0">
                  {v.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.imageUrl} alt={v.brandName}
                      className="w-14 h-14 rounded-lg object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center">
                      <Store className="w-6 h-6 text-gray-700" />
                    </div>
                  )}
                  {(v.imageUrls?.length ?? 0) > 1 && (
                    <span className="absolute -bottom-1 -right-1 text-[8px] font-bold px-1 py-0.5 rounded bg-[#FFFF00] text-black leading-none">
                      {v.imageUrls!.length}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-sm">{v.brandName}</span>
                    <StatusBadge status={v.status} />
                    {(v.reapplyCount ?? 0) > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#FFFF00]/40 text-[#FFFF00] uppercase tracking-widest font-bold">
                        ↩ Re-applicant
                      </span>
                    )}
                  </div>
                  {/* Category chips */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(v.categories?.length ? v.categories : v.category ? [v.category] : []).map((cat) => (
                      <span key={cat} className="text-[9px] px-1.5 py-0.5 rounded border border-white/10 text-gray-500 uppercase tracking-wide">{cat}</span>
                    ))}
                    {(v.events?.length ?? 0) > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded border border-white/8 text-gray-600 uppercase tracking-wide">
                        {v.events!.length} event{v.events!.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5 truncate">{v.ownerName} · {v.email}</p>
                  {v.declineReason && activeTab === "declined" && (
                    <p className="text-[#FF3333] text-xs mt-0.5 truncate opacity-70">Reason: {v.declineReason}</p>
                  )}
                </div>

                {/* Actions */}
                {(() => {
                  // In the re-applying tab, actions are based on the vendor's actual status
                  const effectiveStatus = activeTab === "reapplying" ? v.status : activeTab as DanVendor["status"];
                  return (
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
                      {/* View details */}
                      <button
                        onClick={() => setDetailVendor(v)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all border-white/10 text-gray-400 hover:text-white hover:border-white/25"
                      >
                        View <ChevronRight className="w-3 h-3" />
                      </button>

                      {effectiveStatus === "pending" && (
                        <>
                          <button onClick={() => handleApprove(v)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all"
                            style={{ borderColor: "rgba(0,255,65,0.4)", color: "#00FF41" }}>
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button onClick={() => openDecline(v)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all"
                            style={{ borderColor: "rgba(255,51,51,0.4)", color: "#FF3333" }}>
                            <X className="w-3.5 h-3.5" /> Decline
                          </button>
                        </>
                      )}

                      {effectiveStatus === "approved" && (
                        <button onClick={() => handleRevoke(v)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all"
                          style={{ borderColor: "rgba(255,51,51,0.4)", color: "#FF3333" }}>
                          <X className="w-3.5 h-3.5" /> Revoke
                        </button>
                      )}

                      {effectiveStatus === "declined" && (
                        <>
                          <button onClick={() => handleApprove(v)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all"
                            style={{ borderColor: "rgba(0,255,65,0.4)", color: "#00FF41" }}>
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button onClick={() => handleResubmit(v)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all border-white/10 text-gray-400 hover:text-[#FFFF00] hover:border-yellow-400/30">
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      <button onClick={() => handleDelete(v)}
                        className="w-8 h-8 rounded-lg border transition-all border-white/8 text-gray-600 hover:text-[#FF3333] hover:border-red-400/25 flex items-center justify-center">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })()}
              </div>
            ))
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── VENDOR DETAIL DRAWER ── */}
      <AnimatePresence>
        {detailVendor && (
          <motion.div className="fixed inset-0 z-[300] flex justify-end"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setDetailVendor(null); setShowPreviousDetails(false); }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.aside
              className="relative w-full max-w-md h-full overflow-y-auto bg-[#080808] border-l border-white/10 flex flex-col"
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/8 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-white text-base uppercase tracking-wide">Vendor Details</h2>
                  <StatusBadge status={detailVendor.status} />
                </div>
                <button onClick={() => { setDetailVendor(null); setShowPreviousDetails(false); }} className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Photo carousel */}
              {(detailVendor.imageUrls?.length || detailVendor.imageUrl) && (
                <DrawerImageCarousel
                  images={detailVendor.imageUrls?.length ? detailVendor.imageUrls : [detailVendor.imageUrl!]}
                  alt={detailVendor.brandName}
                />
              )}

              {/* Body */}
              <div className="flex-1 px-6 py-5 space-y-5">
                {/* Re-applicant notice + View Previous button */}
                {(detailVendor.reapplyCount ?? 0) > 0 && (
                  <div className="rounded-lg border border-[#FFFF00]/20 bg-[#FFFF00]/5 px-4 py-3 space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[#FFFF00] font-bold mb-1">
                        ↩ Re-applicant — {detailVendor.reapplyCount} re-application{detailVendor.reapplyCount! > 1 ? "s" : ""}
                      </p>
                      <p className="text-gray-400 text-xs leading-relaxed">
                        This vendor has applied before. Their categories and photos were automatically
                        merged.{(detailVendor.imageUrls?.length ?? 0) > 1 ? ` ${detailVendor.imageUrls!.length} photos in slideshow.` : ""}
                      </p>
                    </div>
                    {detailVendor.previousSnapshot && (
                      <button
                        onClick={() => setShowPreviousDetails((p) => !p)}
                        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border rounded-lg px-3 py-2 transition-all w-full justify-center"
                        style={{
                          borderColor: showPreviousDetails ? "#FFFF00" : "rgba(255,255,0,0.25)",
                          color: showPreviousDetails ? "#FFFF00" : "rgba(255,255,0,0.6)",
                          background: showPreviousDetails ? "rgba(255,255,0,0.08)" : "transparent",
                        }}
                      >
                        {showPreviousDetails ? "▲ Hide" : "▼ View"} Previous Application
                      </button>
                    )}
                    {showPreviousDetails && detailVendor.previousSnapshot && (
                      <div className="rounded-lg border border-white/8 bg-black/40 p-3 space-y-3">
                        <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-2">— Before last re-application —</p>
                        {detailVendor.previousSnapshot.status && (
                          <p className="text-[10px] text-gray-500">
                            Status was:&nbsp;
                            <span className="font-bold uppercase" style={{
                              color: detailVendor.previousSnapshot.status === "approved" ? "#00FF41"
                                   : detailVendor.previousSnapshot.status === "declined" ? "#FF3333"
                                   : "#FFFF00",
                            }}>{detailVendor.previousSnapshot.status}</span>
                          </p>
                        )}
                        {detailVendor.previousSnapshot.categories?.length ? (
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Previous Categories</p>
                            <div className="flex flex-wrap gap-1">
                              {detailVendor.previousSnapshot.categories.map((c) => (
                                <span key={c} className="text-[9px] px-1.5 py-0.5 rounded border border-white/10 text-gray-500 uppercase tracking-wide">{c}</span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {detailVendor.previousSnapshot.imageUrl && (
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Previous Photo</p>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={detailVendor.previousSnapshot.imageUrl} alt="previous"
                              className="w-full h-28 object-cover rounded-lg"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        )}
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Previous Description</p>
                          <p className="text-gray-400 text-xs leading-relaxed">{detailVendor.previousSnapshot.description}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Previous Products</p>
                          <p className="text-gray-400 text-xs leading-relaxed">{detailVendor.previousSnapshot.products}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Brand + owner */}
                <div>
                  <h3 className="text-xl font-bold text-white">{detailVendor.brandName}</h3>
                  <p className="text-gray-500 text-sm mt-0.5">{detailVendor.ownerName}</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <DetailRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={detailVendor.email} />
                  <DetailRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={detailVendor.phone} />
                  {detailVendor.instagram && (
                    <DetailRow icon={<Instagram className="w-3.5 h-3.5" />} label="Instagram" value={detailVendor.instagram} />
                  )}
                  {/* Categories chips */}
                  <div className="flex items-start gap-3">
                    <span className="text-gray-600 mt-0.5 flex-shrink-0"><Tag className="w-3.5 h-3.5" /></span>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-1.5">Categories</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(detailVendor.categories?.length
                          ? detailVendor.categories
                          : detailVendor.category
                          ? [detailVendor.category]
                          : ["—"]
                        ).map((cat) => (
                          <span key={cat} className="text-[10px] px-2 py-0.5 rounded border border-[#FFFF00]/25 text-[#FFFF00] uppercase tracking-wide font-bold">{cat}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Events */}
                  {(detailVendor.events?.length ?? 0) > 0 && (
                    <div className="flex items-start gap-3">
                      <span className="text-gray-600 mt-0.5 flex-shrink-0"><Calendar className="w-3.5 h-3.5" /></span>
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-1.5">Events</p>
                        <div className="flex flex-wrap gap-1.5">
                          {detailVendor.events!.map((ev) => (
                            <span key={ev} className="text-[10px] px-2 py-0.5 rounded border border-white/15 text-gray-400 uppercase tracking-wide">{ev}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/6 pt-4 space-y-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-gray-600 text-[10px] uppercase tracking-widest mb-1.5">
                      <FileText className="w-3 h-3" /> About
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">{detailVendor.description}</p>
                  </div>
                  {detailVendor.products && (
                    <div>
                      <div className="flex items-center gap-1.5 text-gray-600 text-[10px] uppercase tracking-widest mb-1.5">
                        <ShoppingBag className="w-3 h-3" /> Products / Menu
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">{detailVendor.products}</p>
                    </div>
                  )}
                  {detailVendor.declineReason && detailVendor.status === "declined" && (
                    <div className="rounded-lg border border-[#FF3333]/20 bg-[#FF3333]/5 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-[#FF3333] mb-1">Decline Reason</p>
                      <p className="text-gray-400 text-sm">{detailVendor.declineReason}</p>
                    </div>
                  )}
                  {detailVendor.submittedAt && (
                    <p className="text-gray-700 text-xs">
                      Applied {new Date(detailVendor.submittedAt.seconds * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  )}
                </div>
              </div>

              {/* Drawer footer — action buttons */}
              <div className="px-6 py-5 border-t border-white/8 flex-shrink-0 flex flex-wrap gap-2">
                {detailVendor.status !== "approved" && (
                  <button onClick={() => handleApprove(detailVendor)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest border flex-1 justify-center transition-all"
                    style={{ borderColor: "rgba(0,255,65,0.4)", color: "#00FF41", background: "rgba(0,255,65,0.06)" }}>
                    <Check className="w-4 h-4" /> Approve
                  </button>
                )}
                {detailVendor.status === "pending" && (
                  <button onClick={() => { openDecline(detailVendor); setDetailVendor(null); }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest border flex-1 justify-center transition-all"
                    style={{ borderColor: "rgba(255,51,51,0.4)", color: "#FF3333", background: "rgba(255,51,51,0.06)" }}>
                    <X className="w-4 h-4" /> Decline
                  </button>
                )}
                {detailVendor.status === "approved" && (
                  <button onClick={() => handleRevoke(detailVendor)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest border flex-1 justify-center transition-all"
                    style={{ borderColor: "rgba(255,51,51,0.4)", color: "#FF3333", background: "rgba(255,51,51,0.06)" }}>
                    <X className="w-4 h-4" /> Revoke Approval
                  </button>
                )}
                {detailVendor.status === "declined" && (
                  <button onClick={() => handleResubmit(detailVendor)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest border flex-1 justify-center transition-all border-white/10 text-gray-400 hover:text-[#FFFF00]">
                    <RotateCcw className="w-4 h-4" /> Allow Resubmit
                  </button>
                )}
                <button onClick={() => handleDelete(detailVendor)}
                  className="w-10 h-10 rounded-lg border border-white/10 flex items-center justify-center text-gray-500 hover:text-[#FF3333] hover:border-red-400/25 transition-all flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DECLINE REASON MODAL ── */}
      <AnimatePresence>
        {declineTarget && (
          <motion.div className="fixed inset-0 z-[400] flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDeclineTarget(null)}>
            <div className="absolute inset-0 bg-black/80" />
            <motion.div className="relative w-full max-w-md bg-[#0a0a0a] border border-[#FF3333]/30 rounded-2xl p-6 mx-4"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold uppercase tracking-widest mb-1" style={{ color: "#FF3333" }}>Decline Vendor</h3>
              <p className="text-gray-500 text-sm mb-4">{declineTarget.brandName} — provide a reason (optional)</p>
              <textarea rows={3} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g. Category already at capacity, please reapply next edition."
                className={`${inputCls} resize-none mb-4`} />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeclineTarget(null)} className="px-5 py-2.5 rounded-lg text-sm border border-white/10 text-gray-400">Cancel</button>
                <button onClick={confirmDecline} disabled={declining}
                  className="px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest border flex items-center gap-2"
                  style={{ borderColor: "#FF3333", color: "#FF3333" }}>
                  {declining && <span className="w-3.5 h-3.5 border-2 border-[#FF3333] border-t-transparent rounded-full animate-spin" />}
                  Confirm Decline
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ADD VENDOR FORM MODAL ── */}
      <AnimatePresence>
        {formOpen && (
          <motion.div className="fixed inset-0 z-[300] flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setFormOpen(false)}>
            <div className="absolute inset-0 bg-black/80" />
            <motion.div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border border-[#FFFF00]/25 rounded-2xl p-6 mx-4"
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold uppercase tracking-widest" style={{ color: "#FFFF00" }}>Add Vendor Directly</h3>
                <button onClick={() => setFormOpen(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleAddVendor} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Brand Name *</label>
                    <input name="brandName" value={form.brandName} onChange={handleChange} required placeholder="Suya Spot Lagos" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Owner Name *</label>
                    <input name="ownerName" value={form.ownerName} onChange={handleChange} required placeholder="Full name" className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Email *</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="you@example.com" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Phone *</label>
                    <input name="phone" type="tel" value={form.phone} onChange={handleChange} required placeholder="+234 800 000 0000" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Instagram</label>
                  <input name="instagram" value={form.instagram} onChange={handleChange} placeholder="@yourbrand" className={inputCls} />
                </div>
                {/* Multi-select categories */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                    Food Categories * <span className="text-gray-700 normal-case">(select up to 3)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {FOOD_CATEGORIES.map((cat) => {
                      const sel = form.categories.includes(cat);
                      const atMax = form.categories.length >= 3 && !sel;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleFormCategory(cat)}
                          disabled={atMax}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide border transition-all"
                          style={{
                            borderColor: sel ? "#FFFF00" : "rgba(255,255,255,0.1)",
                            color: sel ? "#FFFF00" : atMax ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.45)",
                            background: sel ? "rgba(255,255,0,0.08)" : "transparent",
                          }}
                        >
                          {sel && <Check className="w-2.5 h-2.5" />}
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-gray-700 text-xs mt-1">{form.categories.length}/3 selected</p>
                </div>
                {/* Events */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Events (optional)</label>
                  <div className="flex gap-2">
                    <input
                      value={eventInput}
                      onChange={(e) => setEventInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFormEvent(); } }}
                      placeholder="e.g. Dine At Night — Edition 1"
                      className={`${inputCls} flex-1`}
                    />
                    <button type="button" onClick={addFormEvent}
                      className="px-3 py-2.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/25 text-xs font-bold uppercase tracking-wide transition-all flex-shrink-0">
                      + Add
                    </button>
                  </div>
                  {form.events.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.events.map((ev) => (
                        <span key={ev} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-white/12 text-gray-400 uppercase tracking-wide">
                          {ev}
                          <button type="button" onClick={() => removeFormEvent(ev)} className="text-gray-600 hover:text-[#FF3333] ml-0.5">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Description *</label>
                  <textarea name="description" value={form.description} onChange={handleChange} required rows={2} placeholder="About the brand" className={`${inputCls} resize-none`} />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Products / Menu *</label>
                  <textarea name="products" value={form.products} onChange={handleChange} required rows={2} placeholder="e.g. Suya, Chicken Wings, Peppered Fish" className={`${inputCls} resize-none`} />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Photo URL *</label>
                  <input name="imageUrl" type="url" value={form.imageUrl} onChange={handleChange} required placeholder="https://..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Status</label>
                  <select name="status" value={form.status} onChange={handleChange} className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all cursor-pointer">
                    <option value="approved" className="bg-[#0a0a0a]">Approved (show on site)</option>
                    <option value="pending" className="bg-[#0a0a0a]">Pending (review later)</option>
                  </select>
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" onClick={() => setFormOpen(false)} className="px-5 py-2.5 rounded-lg text-sm border border-white/10 text-gray-400">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="px-6 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest text-black flex items-center gap-2"
                    style={{ background: saving ? "rgba(255,255,0,0.5)" : "#FFFF00" }}>
                    {saving && <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />}
                    {saving ? "Saving…" : "Add Vendor"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-gray-600 mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-gray-600">{label}</p>
        <p className="text-gray-300 text-sm break-all">{value}</p>
      </div>
    </div>
  );
}
