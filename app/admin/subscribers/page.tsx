"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  doc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Download, Mail, Ticket, Trash2, Send, X } from "lucide-react";
import * as XLSX from "xlsx";

interface SubscriberRow {
  id: string;
  email: string;
  subscribedAt?: string;
  source: "newsletter";
}

interface TicketEmailRow {
  email: string;
  name: string;
  eventTitle: string;
  source: "ticket";
}

type EmailRow = SubscriberRow | TicketEmailRow;
type Tab = "all" | "newsletter" | "tickets";

const inputCls =
  "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all placeholder:text-gray-700";

export default function SubscribersPage() {
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [copied, setCopied] = useState(false);

  // Delete state
  const [deleting, setDeleting] = useState<string | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Compose state
  const [compose, setCompose] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subSnap, ticketSnap] = await Promise.all([
        getDocs(query(collection(db, "subscribers"), orderBy("subscribedAt", "desc"))).catch(() => null),
        getDocs(collection(db, "tickets")),
      ]);

      const subs: SubscriberRow[] = [];
      if (subSnap) {
        subSnap.forEach((d) => {
          const data = d.data();
          subs.push({
            id: d.id,
            email: data.email ?? d.id,
            subscribedAt: data.subscribedAt?.toDate?.()?.toLocaleDateString("en-NG") ?? "",
            source: "newsletter",
          });
        });
      }

      const ticketEmails: TicketEmailRow[] = [];
      const seen = new Set<string>();
      ticketSnap.forEach((d) => {
        const data = d.data();
        if (data.status !== "paid" && data.status !== "confirmed") return;
        if (!data.email || seen.has(data.email.toLowerCase())) return;
        seen.add(data.email.toLowerCase());
        ticketEmails.push({ email: data.email, name: data.name ?? "", eventTitle: data.eventTitle ?? "", source: "ticket" });
      });

      setRows([...subs, ...ticketEmails]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = rows.filter((r) => {
    if (tab === "newsletter") return r.source === "newsletter";
    if (tab === "tickets") return r.source === "ticket";
    return true;
  });

  const uniqueEmails = Array.from(new Set(filtered.map((r) => r.email)));
  const newsletterRows = rows.filter((r): r is SubscriberRow => r.source === "newsletter");
  const newsletterCount = newsletterRows.length;
  const ticketCount = new Set(rows.filter((r) => r.source === "ticket").map((r) => r.email)).size;

  const handleCopy = () => {
    navigator.clipboard.writeText(uniqueEmails.join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const data = filtered.map((r) => ({
      Email: r.email,
      Source: r.source === "newsletter" ? "Newsletter" : "Ticket Buyer",
      Name: r.source === "ticket" ? r.name : "",
      Event: r.source === "ticket" ? r.eventTitle : "",
      "Subscribed At": r.source === "newsletter" ? r.subscribedAt : "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Emails");
    XLSX.writeFile(wb, `dan-emails-${tab}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleDelete = async (row: SubscriberRow) => {
    setDeleting(row.id);
    try {
      await deleteDoc(doc(db, "subscribers", row.id));
      setRows((prev) => prev.filter((r) => !(r.source === "newsletter" && (r as SubscriberRow).id === row.id)));
    } finally {
      setDeleting(null);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      const batch = writeBatch(db);
      newsletterRows.forEach((r) => batch.delete(doc(db, "subscribers", r.id)));
      await batch.commit();
      setRows((prev) => prev.filter((r) => r.source !== "newsletter"));
      setClearConfirm(false);
    } finally {
      setClearing(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: uniqueEmails, subject: subject.trim(), body: body.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult({ ok: true, msg: `Sent to ${data.sent} recipient${data.sent !== 1 ? "s" : ""}.` });
        setSubject("");
        setBody("");
      } else {
        setSendResult({ ok: false, msg: data.error ?? "Failed to send." });
      }
    } catch {
      setSendResult({ ok: false, msg: "Network error. Try again." });
    } finally {
      setSending(false);
    }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "all", label: "All Emails" },
    { key: "newsletter", label: "Newsletter" },
    { key: "tickets", label: "Ticket Buyers" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-widest text-white">Email List</h1>
          <p className="text-gray-600 text-xs mt-1">
            {newsletterCount} newsletter · {ticketCount} ticket buyers
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-gray-400 text-xs font-bold uppercase tracking-widest hover:border-[#FFFF00]/40 hover:text-[#FFFF00] transition-all"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-gray-400 text-xs font-bold uppercase tracking-widest hover:border-[#FFFF00]/40 hover:text-[#FFFF00] transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={() => { setCompose(true); setSendResult(null); }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#FFFF00]/40 text-[#FFFF00] text-xs font-bold uppercase tracking-widest hover:border-[#FFFF00] transition-all"
            style={{ boxShadow: "0 0 12px rgba(255,255,0,0.1)" }}
          >
            <Send className="w-3.5 h-3.5" />
            Send Newsletter
          </button>
        </div>
      </div>

      {/* Compose modal */}
      <AnimatePresence>
        {compose && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setCompose(false)} />
            <motion.div
              className="relative w-full max-w-lg bg-[#050505] border border-[#FFFF00]/25 rounded-2xl p-6 space-y-4"
              style={{ boxShadow: "0 0 60px rgba(255,255,0,0.1)" }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold uppercase tracking-widest" style={{ color: "#FFFF00" }}>
                    Send Newsletter
                  </h2>
                  <p className="text-gray-600 text-xs mt-0.5">
                    Sending to {uniqueEmails.length} recipient{uniqueEmails.length !== 1 ? "s" : ""} ({tab === "all" ? "all sources" : tab})
                  </p>
                </div>
                <button onClick={() => setCompose(false)} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Subject *</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Dine At Night — Edition 3 is here!"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Message *</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                  placeholder="Write your newsletter message here..."
                  className={`${inputCls} resize-none`}
                />
                <p className="text-gray-700 text-xs mt-1">Plain text — will be styled with Dine At Night branding automatically.</p>
              </div>

              {sendResult && (
                <p
                  className="text-sm text-center font-medium py-2 rounded-lg"
                  style={{
                    color: sendResult.ok ? "#00FF41" : "#FF3333",
                    background: sendResult.ok ? "rgba(0,255,65,0.06)" : "rgba(255,51,51,0.06)",
                  }}
                >
                  {sendResult.msg}
                </p>
              )}

              <button
                onClick={handleSend}
                disabled={sending || !subject.trim() || !body.trim()}
                className="w-full py-3 rounded-full font-bold uppercase tracking-widest text-sm transition-all"
                style={{
                  background: sending || !subject.trim() || !body.trim() ? "transparent" : "#FFFF00",
                  color: sending || !subject.trim() || !body.trim() ? "#FFFF00" : "#000",
                  border: "2px solid #FFFF00",
                  opacity: !subject.trim() || !body.trim() ? 0.4 : 1,
                }}
              >
                {sending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
                    Sending…
                  </span>
                ) : (
                  `Send to ${uniqueEmails.length} recipient${uniqueEmails.length !== 1 ? "s" : ""} →`
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs + clear */}
      <div className="flex items-center justify-between border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex gap-1">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest border-b-2 -mb-px transition-colors"
                style={{ borderColor: active ? "#FFFF00" : "transparent", color: active ? "#FFFF00" : "rgba(255,255,255,0.35)" }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        {(tab === "newsletter" || tab === "all") && newsletterCount > 0 && (
          <button
            onClick={() => setClearConfirm(true)}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-gray-700 hover:text-[#FF3333] transition-colors pb-2"
          >
            <Trash2 className="w-3 h-3" />
            Clear Newsletter
          </button>
        )}
      </div>

      {/* Clear confirm */}
      <AnimatePresence>
        {clearConfirm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl border border-[#FF3333]/30 bg-[#FF3333]/05 px-5 py-4 flex items-center justify-between gap-4"
          >
            <p className="text-gray-300 text-sm">Delete all {newsletterCount} newsletter subscribers?</p>
            <div className="flex gap-2">
              <button onClick={() => setClearConfirm(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-white transition-colors">Cancel</button>
              <button
                onClick={handleClearAll}
                disabled={clearing}
                className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border border-[#FF3333] text-[#FF3333] hover:bg-[#FF3333] hover:text-black transition-all"
              >
                {clearing ? "Clearing…" : "Yes, Delete All"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600 text-sm">No emails found.</div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
          <p className="text-gray-600 text-xs mb-3">
            {uniqueEmails.length} unique email{uniqueEmails.length !== 1 ? "s" : ""}
          </p>
          <div className="rounded-xl border border-white/8 overflow-hidden">
            {filtered.map((row, i) => (
              <div
                key={`${row.email}-${i}`}
                className="flex items-center gap-4 px-5 py-3 border-b last:border-b-0 hover:bg-white/[0.02] transition-colors group"
                style={{ borderColor: "rgba(255,255,255,0.05)" }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: row.source === "newsletter" ? "rgba(255,255,0,0.08)" : "rgba(0,255,65,0.08)" }}
                >
                  {row.source === "newsletter"
                    ? <Mail className="w-3.5 h-3.5" style={{ color: "#FFFF00" }} />
                    : <Ticket className="w-3.5 h-3.5" style={{ color: "#00FF41" }} />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-gray-200 text-sm truncate">{row.email}</p>
                  {row.source === "ticket" && (
                    <p className="text-gray-600 text-xs truncate">{row.name}{row.eventTitle ? ` · ${row.eventTitle}` : ""}</p>
                  )}
                  {row.source === "newsletter" && row.subscribedAt && (
                    <p className="text-gray-700 text-xs">{row.subscribedAt}</p>
                  )}
                </div>

                <span className="text-[9px] uppercase tracking-widest font-bold shrink-0" style={{ color: row.source === "newsletter" ? "rgba(255,255,0,0.5)" : "rgba(0,255,65,0.5)" }}>
                  {row.source === "newsletter" ? "Newsletter" : "Ticket"}
                </span>

                {row.source === "newsletter" && (
                  <button
                    onClick={() => handleDelete(row as SubscriberRow)}
                    disabled={deleting === (row as SubscriberRow).id}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-700 hover:text-[#FF3333] transition-all opacity-0 group-hover:opacity-100"
                  >
                    {deleting === (row as SubscriberRow).id
                      ? <span className="w-3 h-3 border border-[#FF3333] border-t-transparent rounded-full animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
