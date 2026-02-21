"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getAllTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  getAllEvents,
  type DanTestimonial,
  type DanEvent,
} from "@/lib/firestore";
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  MessageSquare,
} from "lucide-react";

const inputCls =
  "w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all placeholder:text-gray-700";

const EMPTY_FORM = {
  name: "",
  type: "user" as DanTestimonial["type"],
  role: "",
  quote: "",
  eventTitle: "",
};

const TYPE_BADGE: Record<
  DanTestimonial["type"],
  { label: string; color: string; bg: string; border: string }
> = {
  vendor: {
    label: "Vendor",
    color: "#FF3333",
    bg: "rgba(255,51,51,0.1)",
    border: "rgba(255,51,51,0.3)",
  },
  user: {
    label: "Attendee",
    color: "#00FF41",
    bg: "rgba(0,255,65,0.1)",
    border: "rgba(0,255,65,0.3)",
  },
  admin: {
    label: "Team",
    color: "#FFFF00",
    bg: "rgba(255,255,0,0.1)",
    border: "rgba(255,255,0,0.3)",
  },
};

function TypeBadge({ type }: { type: DanTestimonial["type"] }) {
  const s = TYPE_BADGE[type];
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border flex-shrink-0"
      style={{ color: s.color, background: s.bg, borderColor: s.border }}
    >
      {s.label}
    </span>
  );
}

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<DanTestimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<DanEvent[]>([]);

  // Add new testimonial modal
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  // Edit modal (admin-created only)
  const [editTarget, setEditTarget] = useState<DanTestimonial | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Filter
  const [filter, setFilter] = useState<"all" | "vendor" | "user" | "admin">("all");

  const load = async () => {
    setLoading(true);
    try {
      setTestimonials(await getAllTestimonials());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    getAllEvents().then(setEvents).catch(() => {});
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.quote.trim()) {
      setAddError("Name and review are required.");
      return;
    }
    setAdding(true);
    setAddError("");
    try {
      await createTestimonial({
        name: addForm.name.trim(),
        type: addForm.type,
        role: addForm.role.trim() || (addForm.type === "vendor" ? "Vendor" : addForm.type === "user" ? "Event Attendee" : "Team"),
        quote: addForm.quote.trim(),
        eventTitle: addForm.eventTitle.trim() || undefined,
        createdBy: "admin",
      });
      setAddOpen(false);
      setAddForm(EMPTY_FORM);
      await load();
    } catch {
      setAddError("Failed to post. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const openEdit = (t: DanTestimonial) => {
    setEditTarget(t);
    setEditForm({
      name: t.name,
      type: t.type,
      role: t.role,
      quote: t.quote,
      eventTitle: t.eventTitle ?? "",
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    try {
      await updateTestimonial(editTarget.id!, {
        name: editForm.name.trim(),
        type: editForm.type,
        role: editForm.role.trim(),
        quote: editForm.quote.trim(),
        eventTitle: editForm.eventTitle.trim() || undefined,
      });
      setTestimonials((prev) =>
        prev.map((t) =>
          t.id === editTarget.id
            ? {
                ...t,
                name: editForm.name.trim(),
                type: editForm.type,
                role: editForm.role.trim(),
                quote: editForm.quote.trim(),
                eventTitle: editForm.eventTitle.trim() || undefined,
              }
            : t
        )
      );
      setEditTarget(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: DanTestimonial) => {
    if (!confirm(`Delete review from "${t.name}"?`)) return;
    await deleteTestimonial(t.id!);
    setTestimonials((prev) => prev.filter((x) => x.id !== t.id));
  };

  const filtered =
    filter === "all" ? testimonials : testimonials.filter((t) => t.type === filter);

  const counts = {
    all: testimonials.length,
    vendor: testimonials.filter((t) => t.type === "vendor").length,
    user: testimonials.filter((t) => t.type === "user").length,
    admin: testimonials.filter((t) => t.type === "admin").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1
            className="text-xl sm:text-2xl font-bold uppercase tracking-widest"
            style={{ color: "#FFFF00" }}
          >
            Testimonials
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {counts.all} total · {counts.vendor} vendor · {counts.user} attendee · {counts.admin} team
          </p>
        </div>
        <button
          onClick={() => { setAddForm(EMPTY_FORM); setAddError(""); setAddOpen(true); }}
          className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm uppercase tracking-widest text-black flex-shrink-0"
          style={{ background: "#FFFF00", boxShadow: "0 0 20px rgba(255,255,0,0.4)" }}
        >
          <Plus className="w-4 h-4" /> Post Review
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl border border-white/8 bg-white/[0.02] w-fit overflow-x-auto">
        {(["all", "vendor", "user", "admin"] as const).map((key) => {
          const active = filter === key;
          const accent = key === "vendor" ? "#FF3333" : key === "user" ? "#00FF41" : key === "admin" ? "#FFFF00" : "#FFFF00";
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap"
              style={{
                color: active ? accent : "rgba(255,255,255,0.3)",
                background: active ? `${accent}12` : "transparent",
              }}
            >
              {key === "all" ? "All" : key === "vendor" ? "Vendors" : key === "user" ? "Attendees" : "Team"}
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{
                  background: active ? `${accent}25` : "rgba(255,255,255,0.06)",
                  color: active ? accent : "rgba(255,255,255,0.3)",
                }}
              >
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      <AnimatePresence mode="wait">
        <motion.div
          key={filter}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-gray-700">
              <MessageSquare className="w-8 h-8 opacity-30" />
              <span className="text-sm">No testimonials yet</span>
            </div>
          ) : (
            filtered.map((t) => (
              <div
                key={t.id}
                className="flex flex-col sm:flex-row sm:items-start gap-4 px-5 py-4 rounded-xl border border-white/8 bg-white/[0.02]"
              >
                {/* Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-sm">{t.name}</span>
                    <TypeBadge type={t.type} />
                    {t.createdBy === "admin" && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full border border-white/15 text-gray-500 uppercase tracking-widest">
                        Admin post
                      </span>
                    )}
                  </div>
                  {t.eventTitle && (
                    <p className="text-[10px] text-gray-600 uppercase tracking-wide">
                      {t.eventTitle}
                    </p>
                  )}
                  <p className="text-gray-400 text-sm leading-relaxed italic line-clamp-3">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  {t.submittedAt && (
                    <p className="text-gray-700 text-[10px]">
                      {new Date(t.submittedAt.seconds * 1000).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Edit — admin-created only */}
                  {t.createdBy === "admin" && (
                    <button
                      onClick={() => openEdit(t)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all border-white/10 text-gray-400 hover:text-[#FFFF00] hover:border-yellow-400/30"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {/* Delete — any */}
                  <button
                    onClick={() => handleDelete(t)}
                    className="w-8 h-8 rounded-lg border transition-all border-white/8 text-gray-600 hover:text-[#FF3333] hover:border-red-400/25 flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── ADD TESTIMONIAL MODAL ── */}
      <AnimatePresence>
        {addOpen && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAddOpen(false)}
          >
            <div className="absolute inset-0 bg-black/80" />
            <motion.div
              className="relative w-full max-w-lg bg-[#0a0a0a] border border-[#FFFF00]/25 rounded-2xl p-6 mx-4 max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3
                  className="text-lg font-bold uppercase tracking-widest"
                  style={{ color: "#FFFF00" }}
                >
                  Post a Review
                </h3>
                <button
                  onClick={() => setAddOpen(false)}
                  className="text-gray-500 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                      Name *
                    </label>
                    <input
                      value={addForm.name}
                      onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                      required
                      placeholder="Person or brand name"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                      Type *
                    </label>
                    <select
                      value={addForm.type}
                      onChange={(e) =>
                        setAddForm((p) => ({ ...p, type: e.target.value as DanTestimonial["type"] }))
                      }
                      className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all cursor-pointer"
                    >
                      <option value="user" className="bg-[#0a0a0a]">Event Attendee</option>
                      <option value="vendor" className="bg-[#0a0a0a]">Vendor</option>
                      <option value="admin" className="bg-[#0a0a0a]">Team / Admin</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                      Role <span className="text-gray-700 normal-case">(optional)</span>
                    </label>
                    <input
                      value={addForm.role}
                      onChange={(e) => setAddForm((p) => ({ ...p, role: e.target.value }))}
                      placeholder="e.g. Vendor, Guest, Organiser"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                      Event <span className="text-gray-700 normal-case">(optional)</span>
                    </label>
                    <select
                      value={addForm.eventTitle}
                      onChange={(e) => setAddForm((p) => ({ ...p, eventTitle: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all cursor-pointer"
                    >
                      <option value="" className="bg-[#0a0a0a]">— Select an event —</option>
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.title} className="bg-[#0a0a0a]">{ev.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                    Review *
                  </label>
                  <textarea
                    value={addForm.quote}
                    onChange={(e) => setAddForm((p) => ({ ...p, quote: e.target.value }))}
                    required
                    rows={4}
                    maxLength={500}
                    placeholder="The testimonial text…"
                    className={`${inputCls} resize-none`}
                  />
                  <p className="text-gray-700 text-xs mt-1 text-right">{addForm.quote.length}/500</p>
                </div>

                {addError && (
                  <p className="text-[#FF3333] text-xs text-center">{addError}</p>
                )}

                <div className="flex gap-3 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setAddOpen(false)}
                    className="px-5 py-2.5 rounded-lg text-sm border border-white/10 text-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adding}
                    className="px-6 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest text-black flex items-center gap-2"
                    style={{ background: adding ? "rgba(255,255,0,0.5)" : "#FFFF00" }}
                  >
                    {adding && (
                      <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    )}
                    {adding ? "Posting…" : "Post Review"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── EDIT MODAL (admin-created only) ── */}
      <AnimatePresence>
        {editTarget && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditTarget(null)}
          >
            <div className="absolute inset-0 bg-black/80" />
            <motion.div
              className="relative w-full max-w-lg bg-[#0a0a0a] border border-[#FFFF00]/25 rounded-2xl p-6 mx-4 max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3
                  className="text-lg font-bold uppercase tracking-widest"
                  style={{ color: "#FFFF00" }}
                >
                  Edit Review
                </h3>
                <button onClick={() => setEditTarget(null)} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEdit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Name *</label>
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      required
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Type *</label>
                    <select
                      value={editForm.type}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, type: e.target.value as DanTestimonial["type"] }))
                      }
                      className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all cursor-pointer"
                    >
                      <option value="user" className="bg-[#0a0a0a]">Event Attendee</option>
                      <option value="vendor" className="bg-[#0a0a0a]">Vendor</option>
                      <option value="admin" className="bg-[#0a0a0a]">Team / Admin</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Role</label>
                    <input
                      value={editForm.role}
                      onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Event</label>
                    <select
                      value={editForm.eventTitle}
                      onChange={(e) => setEditForm((p) => ({ ...p, eventTitle: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all cursor-pointer"
                    >
                      <option value="" className="bg-[#0a0a0a]">— Select an event —</option>
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.title} className="bg-[#0a0a0a]">{ev.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Review *</label>
                  <textarea
                    value={editForm.quote}
                    onChange={(e) => setEditForm((p) => ({ ...p, quote: e.target.value }))}
                    required
                    rows={4}
                    maxLength={500}
                    className={`${inputCls} resize-none`}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setEditTarget(null)}
                    className="px-5 py-2.5 rounded-lg text-sm border border-white/10 text-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest text-black flex items-center gap-2"
                    style={{ background: saving ? "rgba(255,255,0,0.5)" : "#FFFF00" }}
                  >
                    {saving && (
                      <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    )}
                    {saving ? "Saving…" : <><Check className="w-3.5 h-3.5" /> Save</>}
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
