"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Camera, Film, X, Images, PlusCircle } from "lucide-react";
import {
  getAllEvents,
  getAllGalleryItems,
  createGalleryItem,
  deleteGalleryItem,
  type DanEvent,
  type DanGalleryItem,
} from "@/lib/firestore";

const ACCENT = "#00FF41";

type TabId = "all" | string;
type MediaRow = { type: "photo" | "video"; src: string; caption: string };
const EMPTY_ROW: MediaRow = { type: "photo", src: "", caption: "" };

export default function AdminGalleryPage() {
  const [items, setItems] = useState<DanGalleryItem[]>([]);
  const [events, setEvents] = useState<DanEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("all");
  const [showModal, setShowModal] = useState(false);
  const [eventId, setEventId] = useState("");
  const [rows, setRows] = useState<MediaRow[]>([{ ...EMPTY_ROW }]);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [evRes, itemRes] = await Promise.allSettled([getAllEvents(), getAllGalleryItems()]);
      if (evRes.status === "fulfilled") setEvents(evRes.value);
      if (itemRes.status === "fulfilled") setItems(itemRes.value);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const eventTabs = events.filter((e) => items.some((i) => i.eventId === e.id));
  const filtered = tab === "all" ? items : items.filter((i) => i.eventId === tab);

  const openModal = () => {
    setEventId("");
    setRows([{ ...EMPTY_ROW }]);
    setShowModal(true);
  };

  const updateRow = (index: number, patch: Partial<MediaRow>) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const addRow = () => setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index));

  const validRows = rows.filter((r) => r.src && r.caption);
  const canSave = eventId !== "" && validRows.length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const ev = events.find((e) => e.id === eventId);
      await Promise.all(
        validRows.map((r) =>
          createGalleryItem({
            eventId,
            eventTitle: ev?.title ?? "",
            type: r.type,
            src: r.src,
            caption: r.caption,
          })
        )
      );
      setShowModal(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await deleteGalleryItem(id);
      setDeleteId(null);
      await load();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold uppercase tracking-widest"
            style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}60` }}
          >
            Gallery
          </h1>
          <p className="text-gray-600 text-xs mt-0.5">{items.length} media items across all events</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border"
          style={{
            borderColor: ACCENT,
            color: ACCENT,
            boxShadow: `0 0 14px ${ACCENT}30`,
            background: `${ACCENT}10`,
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Media
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 flex-wrap">
        {(["all", ...eventTabs.map((e) => e.id!)] as TabId[]).map((t) => {
          const label = t === "all" ? "All" : events.find((e) => e.id === t)?.title ?? t;
          const count = t === "all" ? items.length : items.filter((i) => i.eventId === t).length;
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all border"
              style={{
                borderColor: active ? ACCENT : "rgba(255,255,255,0.1)",
                color: active ? ACCENT : "rgba(255,255,255,0.4)",
                background: active ? `${ACCENT}12` : "transparent",
                boxShadow: active ? `0 0 10px ${ACCENT}25` : "none",
              }}
            >
              {label}
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: active ? `${ACCENT}25` : "rgba(255,255,255,0.08)", color: active ? ACCENT : "rgba(255,255,255,0.3)" }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-video rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl border"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
        >
          <Images className="w-10 h-10 mb-3" style={{ color: "rgba(255,255,255,0.15)" }} />
          <p className="text-gray-600 text-sm">No media yet — add the first one</p>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative group rounded-xl overflow-hidden border"
                style={{ borderColor: "rgba(255,255,255,0.07)" }}
              >
                <div className="aspect-video relative">
                  {item.type === "video" ? (
                    <video src={item.src} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.src} alt={item.caption} className="w-full h-full object-cover" />
                  )}
                  <div
                    className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                    style={{ background: "rgba(0,0,0,0.75)", color: ACCENT }}
                  >
                    {item.type === "video" ? <Film className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
                    {item.type}
                  </div>
                  <button
                    onClick={() => setDeleteId(item.id!)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    style={{ background: "rgba(255,51,51,0.85)" }}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
                <div className="p-3" style={{ background: "#0a0a0a" }}>
                  <p className="text-white text-xs font-medium line-clamp-1">{item.caption}</p>
                  <p className="text-gray-600 text-[10px] mt-0.5 uppercase tracking-widest">{item.eventTitle}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Add Modal ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div
              className="relative w-full max-w-xl rounded-2xl border flex flex-col"
              style={{ background: "#0d0d0d", borderColor: `${ACCENT}30`, maxHeight: "90vh" }}
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 16 }}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: ACCENT }}>
                  Add Media
                </h2>
                <button onClick={() => setShowModal(false)}>
                  <X className="w-4 h-4 text-gray-600 hover:text-white transition-colors" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                {/* Event selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-gray-600">Event *</label>
                  <select
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-white border outline-none"
                    style={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,0.1)" }}
                  >
                    <option value="">Select an event…</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>{ev.title}</option>
                    ))}
                  </select>
                </div>

                {/* Media rows */}
                <div className="space-y-4">
                  {rows.map((row, index) => (
                    <div
                      key={index}
                      className="rounded-xl border p-4 space-y-3"
                      style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
                    >
                      {/* Row label + remove */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: ACCENT }}>
                          Item {index + 1}
                        </span>
                        {rows.length > 1 && (
                          <button
                            onClick={() => removeRow(index)}
                            className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                            style={{ background: "rgba(255,51,51,0.15)", color: "#FF3333" }}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Type toggle */}
                      <div className="flex gap-2">
                        {(["photo", "video"] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => updateRow(index, { type: t })}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all"
                            style={{
                              borderColor: row.type === t ? ACCENT : "rgba(255,255,255,0.1)",
                              color: row.type === t ? ACCENT : "rgba(255,255,255,0.35)",
                              background: row.type === t ? `${ACCENT}12` : "transparent",
                            }}
                          >
                            {t === "photo" ? <Camera className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                            {t}
                          </button>
                        ))}
                      </div>

                      {/* URL input */}
                      <input
                        type="url"
                        placeholder={row.type === "video" ? "https://…/video.mp4" : "https://…/photo.jpg"}
                        value={row.src}
                        onChange={(e) => updateRow(index, { src: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg text-sm text-white border outline-none placeholder-gray-700"
                        style={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,0.1)" }}
                      />

                      {/* Preview */}
                      {row.src && (
                        <div className="rounded-lg overflow-hidden border aspect-video" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                          {row.type === "video" ? (
                            <video src={row.src} className="w-full h-full object-cover" muted playsInline />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={row.src} alt="preview" className="w-full h-full object-cover" />
                          )}
                        </div>
                      )}

                      {/* Caption */}
                      <input
                        type="text"
                        placeholder="Caption…"
                        value={row.caption}
                        onChange={(e) => updateRow(index, { caption: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg text-sm text-white border outline-none placeholder-gray-700"
                        style={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,0.1)" }}
                      />
                    </div>
                  ))}

                  {/* Add another */}
                  <button
                    onClick={addRow}
                    className="w-full py-2.5 rounded-xl border-dashed border text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:opacity-80"
                    style={{ borderColor: `${ACCENT}40`, color: `${ACCENT}80` }}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Add Another
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <button
                  onClick={handleSave}
                  disabled={saving || !canSave}
                  className="w-full py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-40"
                  style={{ background: ACCENT, color: "#000" }}
                >
                  {saving
                    ? "Saving…"
                    : `Upload ${validRows.length} Item${validRows.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirm ── */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
            <motion.div
              className="relative w-full max-w-xs rounded-2xl border p-6 text-center space-y-4"
              style={{ background: "#0d0d0d", borderColor: "rgba(255,51,51,0.3)" }}
              initial={{ scale: 0.94 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.94 }}
            >
              <p className="text-white text-sm font-semibold">Delete this media?</p>
              <p className="text-gray-600 text-xs">This cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border"
                  style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                  style={{ background: "#FF3333", color: "#fff" }}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
