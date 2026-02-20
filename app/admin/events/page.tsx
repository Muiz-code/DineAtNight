"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timestamp } from "firebase/firestore";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  getAllEvents, createEvent, updateEvent, deleteEvent, type DanEvent, type DanTicket,
} from "@/lib/firestore";
import { Plus, Pencil, Trash2, X } from "lucide-react";

const inputCls = "w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all placeholder:text-gray-700";

const EMPTY_FORM = {
  title: "", date: "", time: "19:00",
  venue: "", description: "", isPast: false,
  ticketPrice: 5000, totalTickets: 500,
  status: "draft" as DanEvent["status"],
  imageUrl: "", highlights: "",
};

type FormState = typeof EMPTY_FORM;

type EventTab = "all" | "active" | "draft" | "ended";

const EVENT_TABS: { key: EventTab; label: string; accent: string }[] = [
  { key: "all",    label: "All",    accent: "#FFFF00" },
  { key: "active", label: "Active", accent: "#00FF41" },
  { key: "draft",  label: "Draft",  accent: "#888888" },
  { key: "ended",  label: "Ended",  accent: "#FF3333" },
];

export default function AdminEventsPage() {
  const [events, setEvents] = useState<DanEvent[]>([]);
  const [soldByEvent, setSoldByEvent] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<EventTab>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DanEvent | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [evs, txSnap] = await Promise.all([
        getAllEvents(),
        getDocs(collection(db, "tickets")),
      ]);
      const txs = txSnap.docs.map((d) => ({ id: d.id, ...d.data() } as DanTicket));
      const counts: Record<string, number> = {};
      for (const t of txs) {
        if (t.status !== "pending") {
          counts[t.eventId] = (counts[t.eventId] ?? 0) + t.quantity;
        }
      }
      setEvents(evs);
      setSoldByEvent(counts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (ev: DanEvent) => {
    const d = ev.date?.toDate?.() ?? new Date();
    setEditing(ev);
    setForm({
      title: ev.title,
      date: d.toISOString().split("T")[0],
      time: d.toTimeString().slice(0, 5),
      venue: ev.venue,
      description: ev.description,
      isPast: ev.isPast,
      ticketPrice: ev.ticketPrice,
      totalTickets: ev.totalTickets,
      status: ev.status,
      imageUrl: ev.imageUrl,
      highlights: (ev.highlights ?? []).join("\n"),
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dateTime = new Date(`${form.date}T${form.time}:00`);
      const data = {
        title: form.title,
        edition: form.title,
        date: Timestamp.fromDate(dateTime),
        venue: form.venue,
        description: form.description,
        isPast: form.isPast,
        ticketPrice: Number(form.ticketPrice),
        totalTickets: Number(form.totalTickets),
        status: form.status,
        imageUrl: form.imageUrl,
        highlights: form.highlights.split("\n").map((s) => s.trim()).filter(Boolean),
      };

      if (editing?.id) {
        await updateEvent(editing.id, data);
      } else {
        await createEvent({ ...data, soldTickets: 0 });
      }

      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteEvent(id);
    setDeleteConfirm(null);
    load();
  };

  const statusColor = (s: string) =>
    s === "active" ? "#00FF41" : s === "ended" ? "#FF3333" : "#888";

  const tabCounts = {
    all:    events.length,
    active: events.filter((e) => e.status === "active").length,
    draft:  events.filter((e) => e.status === "draft").length,
    ended:  events.filter((e) => e.status === "ended").length,
  };

  const filteredEvents = activeTab === "all" ? events : events.filter((e) => e.status === activeTab);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-widest">Events</h1>
          <p className="text-gray-600 text-sm mt-0.5">Manage past and upcoming events</p>
        </div>
        <motion.button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-widest text-black flex-shrink-0"
          style={{ background: "#FFFF00", boxShadow: "0 0 20px rgba(255,255,0,0.4)" }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden xs:inline">New Event</span>
          <span className="xs:hidden">New</span>
        </motion.button>
      </div>

      {/* Tabs — scrollable on mobile */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
      <div className="flex gap-1 p-1 rounded-xl border border-white/8 bg-white/[0.02] w-fit min-w-max">
        {EVENT_TABS.map(({ key, label, accent }) => {
          const active = activeTab === key;
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
                {tabCounts[key]}
              </span>
              {active && (
                <motion.span
                  layoutId="event-tab-underline"
                  className="absolute bottom-0 left-3 right-3 h-px rounded-full"
                  style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
                />
              )}
            </button>
          );
        })}
      </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <p className="text-gray-600 text-sm">{activeTab === "all" ? "No events yet." : `No ${activeTab} events.`}</p>
          {activeTab === "all" && <button onClick={openCreate} className="mt-4 text-[#FFFF00] text-sm underline">Create your first event</button>}
        </div>
      ) : (
        <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-3">
          {filteredEvents.map((ev) => {
            const evDate = ev.date?.toDate?.()?.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
            const sold = soldByEvent[ev.id ?? ""] ?? 0;
            const remaining = ev.totalTickets - sold;
            const pct = ev.totalTickets > 0 ? Math.round((sold / ev.totalTickets) * 100) : 0;
            const sc = statusColor(ev.status);
            return (
              <div
                key={ev.id}
                className="rounded-xl border p-4 sm:p-5 flex items-start gap-4 sm:gap-5"
                style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0a0a0a" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full" style={{ background: `${sc}15`, color: sc }}>
                      {ev.status}
                    </span>
                    <span className="text-gray-600 text-xs">{ev.edition}</span>
                  </div>
                  <h3 className="text-white font-bold text-base">{ev.title}</h3>
                  <p className="text-gray-500 text-xs mt-0.5">{evDate} · {ev.venue}</p>

                  <div className="mt-3 flex items-center gap-4">
                    <div>
                      <p className="text-gray-600 text-[10px] uppercase tracking-widest">Sold</p>
                      <p className="text-white text-sm font-bold">{sold}/{ev.totalTickets} <span className="text-gray-600 font-normal text-xs">({remaining} left)</span></p>
                    </div>
                    <div className="w-28 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 90 ? "#FF3333" : "#FFFF00" }} />
                    </div>
                    <div>
                      <p className="text-gray-600 text-[10px] uppercase tracking-widest">Price</p>
                      <p className="text-white text-sm font-bold">₦{ev.ticketPrice.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(ev)}
                    className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/30 transition-all"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(ev.id!)}
                    className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-gray-400 hover:text-[#FF3333] hover:border-[#FF3333]/30 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </motion.div>
        </AnimatePresence>
      )}

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/80" onClick={() => setDeleteConfirm(null)} />
            <motion.div className="relative z-10 bg-[#0a0a0a] border border-[#FF3333]/30 rounded-2xl p-7 max-w-sm w-full mx-4 text-center" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-white font-bold uppercase tracking-wide mb-2">Delete Event?</h3>
              <p className="text-gray-500 text-sm mb-6">This action cannot be undone. All data for this event will be lost.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-full border border-white/15 text-gray-400 text-sm hover:text-white transition-all">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-full bg-[#FF3333] text-black text-sm font-bold hover:opacity-90 transition-all">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create / Edit modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
            <motion.div
              className="relative w-full sm:max-w-2xl max-h-[93svh] overflow-y-auto bg-[#070707] border border-[#FFFF00]/20 sm:rounded-2xl rounded-t-3xl"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="absolute top-0 left-0 w-8 h-8" style={{ borderTop: "2px solid #FFFF00", borderLeft: "2px solid #FFFF00" }} />
              <span className="absolute bottom-0 right-0 w-8 h-8" style={{ borderBottom: "2px solid #FFFF00", borderRight: "2px solid #FFFF00" }} />

              <div className="sm:hidden flex justify-center pt-4 pb-1">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold uppercase tracking-widest" style={{ color: "#FFFF00" }}>
                    {editing ? "Edit Event" : "New Event"}
                  </h2>
                  <button onClick={() => setModalOpen(false)} className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-gray-600 uppercase tracking-widest mb-1.5">Title *</label>
                    <input required value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Dine At Night — Edition 2" className={inputCls} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-gray-600 uppercase tracking-widest mb-1.5">Date *</label>
                      <input required type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-600 uppercase tracking-widest mb-1.5">Time *</label>
                      <input required type="time" value={form.time} onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))} className={inputCls} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-600 uppercase tracking-widest mb-1.5">Venue *</label>
                    <input required value={form.venue} onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))} placeholder="Eko Atlantic, Lagos" className={inputCls} />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-600 uppercase tracking-widest mb-1.5">Description *</label>
                    <textarea required rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="What makes this edition special…" className={`${inputCls} resize-none`} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-gray-600 uppercase tracking-widest mb-1.5">Ticket Price (₦)</label>
                      <input type="number" min="0" value={form.ticketPrice} onChange={(e) => setForm((p) => ({ ...p, ticketPrice: Number(e.target.value) }))} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-600 uppercase tracking-widest mb-1.5">Total Tickets</label>
                      <input type="number" min="1" value={form.totalTickets} onChange={(e) => setForm((p) => ({ ...p, totalTickets: Number(e.target.value) }))} className={inputCls} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-gray-600 uppercase tracking-widest mb-1.5">Status</label>
                      <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as DanEvent["status"] }))} className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all cursor-pointer">
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="ended">Ended</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-3 pt-5">
                      <input type="checkbox" id="isPast" checked={form.isPast} onChange={(e) => setForm((p) => ({ ...p, isPast: e.target.checked }))} className="w-4 h-4 accent-yellow-400" />
                      <label htmlFor="isPast" className="text-gray-400 text-sm">Mark as past event</label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-600 uppercase tracking-widest mb-1.5">Cover Image URL</label>
                    <input value={form.imageUrl} onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))} placeholder="https://..." className={inputCls} />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-600 uppercase tracking-widest mb-1.5">Highlights (one per line)</label>
                    <textarea rows={3} value={form.highlights} onChange={(e) => setForm((p) => ({ ...p, highlights: e.target.value }))} placeholder={"50+ Vendors\nLive Music\nBar Activations"} className={`${inputCls} resize-none`} />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3.5 rounded-full font-bold uppercase tracking-widest text-sm mt-2"
                    style={{ background: saving ? "transparent" : "#FFFF00", color: saving ? "#FFFF00" : "#000", border: "2px solid #FFFF00", boxShadow: saving ? "0 0 15px rgba(255,255,0,0.2)" : "0 0 25px rgba(255,255,0,0.4)" }}
                    whileHover={!saving ? { scale: 1.01 } : {}}
                    whileTap={!saving ? { scale: 0.98 } : {}}
                  >
                    {saving ? (
                      <span className="flex items-center justify-center gap-3">
                        <span className="w-4 h-4 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
                        Saving…
                      </span>
                    ) : editing ? "Save Changes" : "Create Event"}
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
