"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Camera,
  Film,
  X,
  Images,
  PlusCircle,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { getCache, setCache, clearCache } from "@/lib/cache";
import { logAdminAction } from "@/lib/adminLog";
import MediaUpload from "@/app/_components/MediaUpload";
import {
  getAllEvents,
  getAllGalleryItems,
  createGalleryItem,
  deleteGalleryItem,
  type DanEvent,
  type DanGalleryItem,
} from "@/lib/firestore";

const ACCENT = "#00FF41";
const CONCURRENT = 5;
const CACHE_KEY = "dan_gallery_items";

type TabId = "all" | string;

type FileState = {
  id: string;
  name: string;
  type: "photo" | "video";
  status: "queued" | "uploading" | "done" | "error";
  progress: number;
  url: string;
  caption: string;
};

type MediaRow = { type: "photo" | "video"; src: string; caption: string };
const EMPTY_ROW: MediaRow = { type: "photo", src: "", caption: "" };

let _uid = 0;
const uid = () => `f${++_uid}`;

export default function AdminGalleryPage() {
  const [items, setItems] = useState<DanGalleryItem[]>([]);
  const [events, setEvents] = useState<DanEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("all");
  const [visibleCount, setVisibleCount] = useState(25);

  /* modal */
  const [showModal, setShowModal] = useState(false);
  const [eventId, setEventId] = useState("");

  /* bulk upload */
  const [fileStates, setFileStates] = useState<FileState[]>([]);
  const [bulkDragging, setBulkDragging] = useState(false);
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const filesMapRef = useRef<Map<string, File>>(new Map()); // id → File
  const queueRef = useRef<string[]>([]); // ids waiting
  const activeRef = useRef(0); // running count

  /* manual rows */
  const [rows, setRows] = useState<MediaRow[]>([{ ...EMPTY_ROW }]);

  /* save / delete */
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* bulk select */
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  /* ── Load (with cache) ────────────────────────────── */
  const load = async (force = false) => {
    setLoading(true);
    try {
      const [evRes, itemRes] = await Promise.allSettled([
        getAllEvents(),
        (async () => {
          if (!force) {
            const cached = getCache<DanGalleryItem[]>(CACHE_KEY);
            if (cached) return cached;
          }
          const fresh = await getAllGalleryItems();
          setCache(CACHE_KEY, fresh);
          return fresh;
        })(),
      ]);
      if (evRes.status === "fulfilled") setEvents(evRes.value);
      if (itemRes.status === "fulfilled") setItems(itemRes.value);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const eventTabs = events.filter((e) => items.some((i) => i.eventId === e.id));
  const filtered =
    tab === "all" ? items : items.filter((i) => i.eventId === tab);
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const openModal = () => {
    setEventId("");
    setFileStates([]);
    filesMapRef.current.clear();
    queueRef.current = [];
    activeRef.current = 0;
    setRows([{ ...EMPTY_ROW }]);
    setShowModal(true);
  };

  /* ── Queue engine ─────────────────────────────────── */
  const patchFile = (id: string, patch: Partial<FileState>) =>
    setFileStates((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    );

  const startUpload = (id: string) => {
    const file = filesMapRef.current.get(id);
    if (!file) return;
    activeRef.current++;
    patchFile(id, { status: "uploading" });

    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const storageRef = ref(storage, `gallery/${filename}`);
    const task = uploadBytesResumable(storageRef, file);

    task.on(
      "state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        patchFile(id, { progress: pct });
      },
      () => {
        patchFile(id, { status: "error" });
        activeRef.current--;
        drainQueue();
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        patchFile(id, { status: "done", url, progress: 100 });
        activeRef.current--;
        drainQueue();
      },
    );
  };

  const drainQueue = () => {
    while (activeRef.current < CONCURRENT && queueRef.current.length > 0) {
      const next = queueRef.current.shift()!;
      startUpload(next);
    }
  };

  const handleBulkFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (!arr.length) return;

    const newStates: FileState[] = arr.map((file) => {
      const id = uid();
      filesMapRef.current.set(id, file);
      return {
        id,
        name: file.name,
        type: file.type.startsWith("video/") ? "video" : "photo",
        status: "queued",
        progress: 0,
        url: "",
        caption: "",
      };
    });

    // add all ids to queue
    queueRef.current.push(...newStates.map((f) => f.id));

    setFileStates((prev) => [...prev, ...newStates]);

    // drain after state is set
    setTimeout(drainQueue, 0);
  };

  const handleBulkDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setBulkDragging(false);
    if (e.dataTransfer.files.length) handleBulkFiles(e.dataTransfer.files);
  };

  /* ── Manual rows ──────────────────────────────────── */
  const updateRow = (i: number, patch: Partial<MediaRow>) =>
    setRows((prev) => prev.map((r, ri) => (ri === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  const removeRow = (i: number) =>
    setRows((prev) => prev.filter((_, ri) => ri !== i));

  /* ── Derived counts ───────────────────────────────── */
  const doneFiles = fileStates.filter((f) => f.status === "done");
  const queuedFiles = fileStates.filter((f) => f.status === "queued");
  const uploadingNow = fileStates.filter((f) => f.status === "uploading");
  const errorFiles = fileStates.filter((f) => f.status === "error");
  const anyUploading = queuedFiles.length > 0 || uploadingNow.length > 0;
  const validRows = rows.filter((r) => r.src);
  const totalReady = doneFiles.length + validRows.length;
  const canSave = eventId !== "" && totalReady > 0 && !anyUploading;
  const overallPct =
    fileStates.length === 0
      ? 0
      : Math.round(
          fileStates.reduce(
            (s, f) => s + (f.status === "done" ? 100 : f.progress),
            0,
          ) / fileStates.length,
        );

  /* ── Save ─────────────────────────────────────────── */
  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const ev = events.find((e) => e.id === eventId);
      const all = [
        ...doneFiles.map((f) => ({
          type: f.type,
          src: f.url,
          caption: f.caption,
        })),
        ...validRows.map((r) => ({
          type: r.type,
          src: r.src,
          caption: r.caption,
        })),
      ];
      await Promise.all(
        all.map((item) =>
          createGalleryItem({
            eventId,
            eventTitle: ev?.title ?? "",
            type: item.type,
            url: item.src,
            caption: item.caption || "",
            src: ""
          }),
        ),
      );
      await logAdminAction(
        "UPLOAD_GALLERY",
        `Uploaded ${all.length} item${all.length !== 1 ? "s" : ""} to gallery for "${ev?.title ?? eventId}"`,
        { type: "gallery", id: eventId, name: ev?.title },
      );
      clearCache(CACHE_KEY);
      setShowModal(false);
      await load(true);
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ───────────────────────────────────────── */
  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const item = items.find((i) => i.id === id);
      await deleteGalleryItem(id);
      await logAdminAction(
        "DELETE_GALLERY",
        `Deleted gallery item "${item?.caption ?? id}"`,
        { type: "gallery", id, name: item?.caption },
      );
      clearCache(CACHE_KEY);
      setDeleteId(null);
      await load(true);
    } finally {
      setDeleting(false);
    }
  };

  /* ── Bulk delete ───────────────────────────────────── */
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => deleteGalleryItem(id)),
      );
      await logAdminAction(
        "DELETE_GALLERY",
        `Bulk deleted ${selectedIds.size} gallery item${selectedIds.size !== 1 ? "s" : ""}`,
        { type: "gallery", id: "bulk", name: `${selectedIds.size} items` },
      );
      clearCache(CACHE_KEY);
      exitSelectMode();
      await load(true);
    } finally {
      setBulkDeleting(false);
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
          <p className="text-gray-600 text-xs mt-0.5">
            {items.length} media items across all events
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectMode ? (
            <>
              <button
                onClick={exitSelectMode}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border"
                style={{
                  borderColor: "rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const allIds = filtered
                    .map((i) => i.id)
                    .filter((id): id is string => !!id);
                  const allSelected = allIds.every((id) => selectedIds.has(id));
                  setSelectedIds(allSelected ? new Set() : new Set(allIds));
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border"
                style={{
                  borderColor: "rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                {filtered.length > 0 &&
                filtered.every((i) => !!i.id && selectedIds.has(i.id))
                  ? "Deselect All"
                  : "Select All"}
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                  style={{ background: "#FF3333", color: "#fff" }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {bulkDeleting ? "Deleting…" : `Delete ${selectedIds.size}`}
                </button>
              )}
            </>
          ) : (
            <>
              {filtered.length > 0 && (
                <button
                  onClick={() => setSelectMode(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border"
                  style={{
                    borderColor: "rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  Select
                </button>
              )}
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
            </>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 flex-wrap">
        {(["all", ...eventTabs.map((e) => e.id!)] as TabId[]).map((t) => {
          const label =
            t === "all" ? "All" : (events.find((e) => e.id === t)?.title ?? t);
          const count =
            t === "all"
              ? items.length
              : items.filter((i) => i.eventId === t).length;
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setVisibleCount(25);
              }}
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
                style={{
                  background: active ? `${ACCENT}25` : "rgba(255,255,255,0.08)",
                  color: active ? ACCENT : "rgba(255,255,255,0.3)",
                }}
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
            <div
              key={i}
              className="aspect-video rounded-xl animate-pulse"
              style={{ background: "rgba(255,255,255,0.04)" }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl border"
          style={{
            borderColor: "rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <Images
            className="w-10 h-10 mb-3"
            style={{ color: "rgba(255,255,255,0.15)" }}
          />
          <p className="text-gray-600 text-sm">
            No media yet — add the first one
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {visible.map((item) => {
            const isSelected = !!item.id && selectedIds.has(item.id);
            return (
              <div
                key={item.id}
                className="relative group rounded-xl overflow-hidden border cursor-pointer transition-all"
                style={{
                  borderColor: isSelected
                    ? "#FF3333"
                    : "rgba(255,255,255,0.07)",
                  boxShadow: isSelected ? "0 0 0 2px #FF3333" : "none",
                }}
                onClick={() => selectMode && item.id && toggleSelect(item.id)}
              >
                <div
                  className="aspect-video relative"
                  style={{ background: "#1a1a1a" }}
                >
                  {item.type === "video" ? (
                    <video
                      src={item.url}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="none"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={item.caption}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                      style={{ opacity: 0, transition: "opacity 0.25s ease" }}
                      onLoad={(e) => {
                        (e.currentTarget as HTMLImageElement).style.opacity =
                          "1";
                      }}
                    />
                  )}
                  <div
                    className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                    style={{ background: "rgba(0,0,0,0.75)", color: ACCENT }}
                  >
                    {item.type === "video" ? (
                      <Film className="w-3 h-3" />
                    ) : (
                      <Camera className="w-3 h-3" />
                    )}
                    {item.type}
                  </div>
                  {selectMode ? (
                    <div
                      className="absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                      style={{
                        borderColor: isSelected
                          ? "#FF3333"
                          : "rgba(255,255,255,0.5)",
                        background: isSelected ? "#FF3333" : "rgba(0,0,0,0.6)",
                      }}
                    >
                      {isSelected && (
                        <span className="text-white text-[10px] font-bold leading-none">
                          ✓
                        </span>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => item.id && setDeleteId(item.id)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      style={{ background: "rgba(255,51,51,0.85)" }}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  )}
                </div>
                <div className="p-3" style={{ background: "#0a0a0a" }}>
                  <p className="text-white text-xs font-medium line-clamp-1">
                    {item.caption}
                  </p>
                  <p className="text-gray-600 text-[10px] mt-0.5 uppercase tracking-widest">
                    {item.eventTitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Load More ── */}
      {hasMore && (
        <div className="flex flex-col items-center gap-1.5 pt-2">
          <button
            onClick={() => setVisibleCount((n) => n + 25)}
            className="px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border transition-all hover:opacity-80"
            style={{
              borderColor: `${ACCENT}40`,
              color: ACCENT,
              background: `${ACCENT}08`,
            }}
          >
            Load More — {filtered.length - visibleCount} remaining
          </button>
        </div>
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
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => !anyUploading && setShowModal(false)}
            />
            <motion.div
              className="relative w-full max-w-2xl rounded-2xl border flex flex-col"
              style={{
                background: "#0d0d0d",
                borderColor: `${ACCENT}30`,
                maxHeight: "92vh",
              }}
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 16 }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 pt-5 pb-4 border-b shrink-0"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <div>
                  <h2
                    className="text-sm font-bold uppercase tracking-widest"
                    style={{ color: ACCENT }}
                  >
                    Add Media
                  </h2>
                  {fileStates.length > 0 && (
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {doneFiles.length} done · {uploadingNow.length} uploading
                      · {queuedFiles.length} queued
                      {errorFiles.length > 0 &&
                        ` · ${errorFiles.length} failed`}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => !anyUploading && setShowModal(false)}
                  disabled={anyUploading}
                >
                  <X className="w-4 h-4 text-gray-600 hover:text-white transition-colors" />
                </button>
              </div>

              {/* Overall progress bar */}
              {fileStates.length > 0 && (
                <div className="px-6 pt-3 shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-600 uppercase tracking-widest">
                      {doneFiles.length} / {fileStates.length} files
                    </span>
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: ACCENT }}
                    >
                      {overallPct}%
                    </span>
                  </div>
                  <div
                    className="w-full h-1.5 rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${overallPct}%`, background: ACCENT }}
                    />
                  </div>
                </div>
              )}

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                {/* Event selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-gray-600">
                    Event *
                  </label>
                  <select
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-white border outline-none"
                    style={{
                      background: "#1a1a1a",
                      borderColor: "rgba(255,255,255,0.1)",
                    }}
                  >
                    <option value="">Select an event…</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bulk drop zone */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-600 mb-1.5 block">
                    Bulk Upload{" "}
                    <span className="text-gray-700 normal-case">
                      — select as many files as you want
                    </span>
                  </label>
                  <div
                    className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 py-8 cursor-pointer transition-all"
                    style={{
                      borderColor: bulkDragging
                        ? ACCENT
                        : "rgba(255,255,255,0.1)",
                      background: bulkDragging ? `${ACCENT}06` : "transparent",
                    }}
                    onClick={() => bulkInputRef.current?.click()}
                    onDrop={handleBulkDrop}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setBulkDragging(true);
                    }}
                    onDragLeave={() => setBulkDragging(false)}
                  >
                    <UploadCloud
                      className="w-7 h-7"
                      style={{
                        color: bulkDragging ? ACCENT : "rgba(255,255,255,0.2)",
                      }}
                    />
                    <p
                      className="text-sm font-medium"
                      style={{ color: "rgba(255,255,255,0.6)" }}
                    >
                      <span style={{ color: ACCENT }}>Click to browse</span> or
                      drag &amp; drop
                    </p>
                    <p className="text-[10px] text-gray-700">
                      Photos &amp; videos · {CONCURRENT} upload simultaneously ·
                      no file limit
                    </p>
                    <input
                      ref={bulkInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) handleBulkFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>

                {/* File list */}
                {fileStates.length > 0 && (
                  <div>
                    {/* In-progress list */}
                    {fileStates.some((f) => f.status !== "done") && (
                      <div
                        className="rounded-xl border overflow-hidden mb-4"
                        style={{ borderColor: "rgba(255,255,255,0.07)" }}
                      >
                        {fileStates
                          .filter((f) => f.status !== "done")
                          .map((f) => (
                            <div
                              key={f.id}
                              className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0"
                              style={{ borderColor: "rgba(255,255,255,0.05)" }}
                            >
                              <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                                {f.status === "uploading" ? (
                                  <svg
                                    className="w-4 h-4 -rotate-90"
                                    viewBox="0 0 20 20"
                                  >
                                    <circle
                                      cx="10"
                                      cy="10"
                                      r="8"
                                      fill="none"
                                      stroke="rgba(255,255,255,0.1)"
                                      strokeWidth="2.5"
                                    />
                                    <circle
                                      cx="10"
                                      cy="10"
                                      r="8"
                                      fill="none"
                                      stroke={ACCENT}
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeDasharray={`${f.progress * 0.503} 50.3`}
                                      style={{
                                        transition: "stroke-dasharray 0.2s",
                                      }}
                                    />
                                  </svg>
                                ) : f.status === "error" ? (
                                  <AlertCircle className="w-4 h-4 text-[#FF3333]" />
                                ) : (
                                  <div className="w-3 h-3 rounded-full border border-gray-700" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-400 truncate">
                                  {f.name}
                                </p>
                                <p
                                  className="text-[10px] capitalize"
                                  style={{
                                    color:
                                      f.status === "error"
                                        ? "#FF3333"
                                        : f.status === "uploading"
                                          ? ACCENT
                                          : "rgba(255,255,255,0.25)",
                                  }}
                                >
                                  {f.status === "uploading"
                                    ? `${f.progress}%`
                                    : f.status}
                                </p>
                              </div>
                              <span
                                className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded"
                                style={{
                                  background: "rgba(255,255,255,0.06)",
                                  color: "rgba(255,255,255,0.3)",
                                }}
                              >
                                {f.type}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Done — thumbnail grid + captions */}
                    {doneFiles.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-2">
                          {doneFiles.length} ready · Add captions{" "}
                          <span className="text-gray-700 normal-case">
                            (optional)
                          </span>
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {fileStates.map((f) =>
                            f.status !== "done" ? null : (
                              <div
                                key={f.id}
                                className="rounded-lg overflow-hidden border"
                                style={{
                                  borderColor: "rgba(255,255,255,0.08)",
                                }}
                              >
                                <div className="aspect-video relative bg-white/[0.03]">
                                  {f.type === "video" ? (
                                    <video
                                      src={f.url}
                                      className="w-full h-full object-cover"
                                      muted
                                      playsInline
                                    />
                                  ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={f.url}
                                      alt=""
                                      loading="lazy"
                                      decoding="async"
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                  <div className="absolute inset-0 flex items-end justify-end p-1.5">
                                    <CheckCircle2
                                      className="w-4 h-4 drop-shadow"
                                      style={{ color: ACCENT }}
                                    />
                                  </div>
                                </div>
                                <input
                                  type="text"
                                  placeholder="Caption…"
                                  value={f.caption}
                                  onChange={(e) =>
                                    patchFile(f.id, { caption: e.target.value })
                                  }
                                  className="w-full px-2.5 py-1.5 text-xs text-white border-t outline-none placeholder-gray-700"
                                  style={{
                                    background: "#111",
                                    borderColor: "rgba(255,255,255,0.07)",
                                  }}
                                />
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div
                    className="flex-1 h-px"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  />
                  <span className="text-[10px] text-gray-700 uppercase tracking-widest">
                    or add individually
                  </span>
                  <div
                    className="flex-1 h-px"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  />
                </div>

                {/* Manual rows */}
                <div className="space-y-4">
                  {rows.map((row, i) => (
                    <div
                      key={i}
                      className="rounded-xl border p-4 space-y-3"
                      style={{
                        borderColor: "rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[10px] uppercase tracking-widest font-bold"
                          style={{ color: ACCENT }}
                        >
                          Item {i + 1}
                        </span>
                        {rows.length > 1 && (
                          <button
                            onClick={() => removeRow(i)}
                            className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={{
                              background: "rgba(255,51,51,0.15)",
                              color: "#FF3333",
                            }}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {(["photo", "video"] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => updateRow(i, { type: t })}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all"
                            style={{
                              borderColor:
                                row.type === t
                                  ? ACCENT
                                  : "rgba(255,255,255,0.1)",
                              color:
                                row.type === t
                                  ? ACCENT
                                  : "rgba(255,255,255,0.35)",
                              background:
                                row.type === t ? `${ACCENT}12` : "transparent",
                            }}
                          >
                            {t === "photo" ? (
                              <Camera className="w-3 h-3" />
                            ) : (
                              <Film className="w-3 h-3" />
                            )}
                            {t}
                          </button>
                        ))}
                      </div>
                      <MediaUpload
                        value={row.src}
                        mediaType={row.type}
                        onChange={(url) => updateRow(i, { src: url })}
                        folder="gallery"
                      />
                      <input
                        type="text"
                        placeholder="Caption…"
                        value={row.caption}
                        onChange={(e) =>
                          updateRow(i, { caption: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg text-sm text-white border outline-none placeholder-gray-700"
                        style={{
                          background: "#1a1a1a",
                          borderColor: "rgba(255,255,255,0.1)",
                        }}
                      />
                    </div>
                  ))}
                  <button
                    onClick={addRow}
                    className="w-full py-2.5 rounded-xl border-dashed border text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-80 transition-all"
                    style={{ borderColor: `${ACCENT}40`, color: `${ACCENT}80` }}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Add Another
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div
                className="px-6 py-4 border-t shrink-0 space-y-2"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                {anyUploading && (
                  <p className="text-[10px] text-center text-gray-600 uppercase tracking-widest">
                    {uploadingNow.length} uploading · {queuedFiles.length}{" "}
                    queued — please wait
                  </p>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving || !canSave}
                  className="w-full py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-40"
                  style={{ background: ACCENT, color: "#000" }}
                >
                  {saving
                    ? "Saving…"
                    : anyUploading
                      ? `Uploading… (${overallPct}%)`
                      : `Save ${totalReady} Item${totalReady !== 1 ? "s" : ""} to Gallery`}
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
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setDeleteId(null)}
            />
            <motion.div
              className="relative w-full max-w-xs rounded-2xl border p-6 text-center space-y-4"
              style={{
                background: "#0d0d0d",
                borderColor: "rgba(255,51,51,0.3)",
              }}
              initial={{ scale: 0.94 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.94 }}
            >
              <p className="text-white text-sm font-semibold">
                Delete this media?
              </p>
              <p className="text-gray-600 text-xs">This cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border"
                  style={{
                    borderColor: "rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest disabled:opacity-50"
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
