"use client";

import { useEffect, useState } from "react";
import {
  collection, getDocs, orderBy, query,
  doc, deleteDoc, writeBatch, addDoc, setDoc, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, Download, Mail, Ticket, Trash2, Send,
  X, Link2, ChevronDown, ChevronUp, RotateCcw, Clock,
} from "lucide-react";
import * as XLSX from "xlsx";

// ── Types ─────────────────────────────────────────────────────────────────────
interface SubscriberRow { id: string; email: string; subscribedAt?: string; source: "newsletter" }
interface TicketEmailRow { email: string; name: string; eventTitle: string; source: "ticket" }
type EmailRow = SubscriberRow | TicketEmailRow;
type Tab = "all" | "newsletter" | "tickets" | "sent";

interface SentNewsletter {
  id: string;
  subject: string;
  body: string;
  linkUrl?: string;
  linkLabel?: string;
  sentAt: Timestamp;
  recipientCount: number;
  recipients: string[];
}

// ── Site pages the admin can link to ─────────────────────────────────────────
const SITE_LINKS = [
  { label: "Events",  path: "/event" },
  { label: "Vendors", path: "/vendors" },
  { label: "Gallery", path: "/gallery" },
  { label: "Shop",    path: "/shop" },
  { label: "About",   path: "/aboutUs" },
  { label: "Contact", path: "/contact" },
  { label: "Custom URL…", path: "__custom__" },
];

const inputCls = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all placeholder:text-gray-700";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://dineatnight.com").replace(/\/$/, "");

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SubscribersPage() {
  const [rows, setRows]               = useState<EmailRow[]>([]);
  const [sent, setSent]               = useState<SentNewsletter[]>([]);
  const [suppressed, setSuppressed]   = useState<Set<string>>(new Set());
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<Tab>("all");
  const [copied, setCopied]           = useState(false);

  // delete
  const [deleting, setDeleting]         = useState<string | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearing, setClearing]         = useState(false);

  // compose
  const [compose, setCompose]     = useState(false);
  const [subject, setSubject]     = useState("");
  const [body, setBody]           = useState("");
  const [linkChoice, setLinkChoice] = useState(""); // path or "__custom__" or ""
  const [customUrl, setCustomUrl] = useState("");
  const [sending, setSending]     = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // resend
  const [resendItem, setResendItem] = useState<SentNewsletter | null>(null);
  const [resending, setResending]   = useState(false);
  const [resendResult, setResendResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // sent history expand
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subSnap, ticketSnap, sentSnap, suppressedSnap] = await Promise.all([
        getDocs(query(collection(db, "subscribers"), orderBy("subscribedAt", "desc"))).catch(() => null),
        getDocs(collection(db, "tickets")),
        getDocs(query(collection(db, "newsletters"), orderBy("sentAt", "desc"))).catch(() => null),
        getDocs(collection(db, "suppressed_emails")).catch(() => null),
      ]);

      const suppressedSet = new Set<string>();
      suppressedSnap?.forEach((d) => suppressedSet.add(d.id.toLowerCase()));
      setSuppressed(suppressedSet);

      const subs: SubscriberRow[] = [];
      subSnap?.forEach((d) => {
        const data = d.data();
        const email = (data.email ?? d.id) as string;
        if (suppressedSet.has(email.toLowerCase())) return;
        subs.push({ id: d.id, email, subscribedAt: data.subscribedAt?.toDate?.()?.toLocaleDateString("en-NG") ?? "", source: "newsletter" });
      });

      const ticketEmails: TicketEmailRow[] = [];
      const seen = new Set<string>();
      ticketSnap.forEach((d) => {
        const data = d.data();
        if (data.status !== "paid" && data.status !== "confirmed") return;
        if (!data.email || seen.has(data.email.toLowerCase())) return;
        if (suppressedSet.has(data.email.toLowerCase())) return;
        seen.add(data.email.toLowerCase());
        ticketEmails.push({ email: data.email, name: data.name ?? "", eventTitle: data.eventTitle ?? "", source: "ticket" });
      });

      const sentList: SentNewsletter[] = [];
      sentSnap?.forEach((d) => {
        const data = d.data();
        sentList.push({ id: d.id, subject: data.subject, body: data.body, linkUrl: data.linkUrl, linkLabel: data.linkLabel, sentAt: data.sentAt, recipientCount: data.recipientCount ?? 0, recipients: data.recipients ?? [] });
      });

      setRows([...subs, ...ticketEmails]);
      setSent(sentList);
    } finally {
      setLoading(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const emailRows = rows.filter((r) => {
    if (tab === "newsletter") return r.source === "newsletter";
    if (tab === "tickets")    return r.source === "ticket";
    return true; // "all"
  });
  const uniqueEmails    = Array.from(new Set(emailRows.map((r) => r.email)));
  const newsletterRows  = rows.filter((r): r is SubscriberRow => r.source === "newsletter");
  const newsletterCount = newsletterRows.length;
  const ticketCount     = new Set(rows.filter((r) => r.source === "ticket").map((r) => r.email)).size;

  const resolvedLink = linkChoice === "__custom__" ? customUrl.trim() : linkChoice ? `${APP_URL}${linkChoice}` : "";
  const resolvedLabel = linkChoice === "__custom__" ? "Visit" : SITE_LINKS.find((l) => l.path === linkChoice)?.label ?? "";

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCopy = () => {
    navigator.clipboard.writeText(uniqueEmails.join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const data = emailRows.map((r) => ({ Email: r.email, Source: r.source === "newsletter" ? "Newsletter" : "Ticket Buyer", Name: r.source === "ticket" ? r.name : "", Event: r.source === "ticket" ? r.eventTitle : "", "Subscribed At": r.source === "newsletter" ? r.subscribedAt : "" }));
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
    } finally { setDeleting(null); }
  };

  const handleSuppress = async (email: string) => {
    setDeleting(email);
    try {
      await setDoc(doc(db, "suppressed_emails", email.toLowerCase()), { suppressedAt: serverTimestamp() });
      setSuppressed((prev) => new Set([...prev, email.toLowerCase()]));
      setRows((prev) => prev.filter((r) => r.email.toLowerCase() !== email.toLowerCase()));
    } finally { setDeleting(null); }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      const batch = writeBatch(db);
      newsletterRows.forEach((r) => batch.delete(doc(db, "subscribers", r.id)));
      await batch.commit();
      setRows((prev) => prev.filter((r) => r.source !== "newsletter"));
      setClearConfirm(false);
    } finally { setClearing(false); }
  };

  const doSend = async (emails: string[], sub: string, msg: string, lUrl: string, lLabel: string) => {
    const res = await fetch("/api/admin/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails, subject: sub, body: msg, linkUrl: lUrl || undefined, linkLabel: lLabel || undefined }),
    });
    return res.json();
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const data = await doSend(uniqueEmails, subject.trim(), body.trim(), resolvedLink, resolvedLabel);
      if (data.ok) {
        // Save to Firestore sent history
        const docRef = await addDoc(collection(db, "newsletters"), {
          subject: subject.trim(),
          body: body.trim(),
          ...(resolvedLink ? { linkUrl: resolvedLink, linkLabel: resolvedLabel } : {}),
          sentAt: serverTimestamp(),
          recipientCount: data.sent,
          recipients: data.recipients ?? uniqueEmails,
        });
        setSent((prev) => [{
          id: docRef.id,
          subject: subject.trim(),
          body: body.trim(),
          linkUrl: resolvedLink || undefined,
          linkLabel: resolvedLabel || undefined,
          sentAt: Timestamp.now(),
          recipientCount: data.sent,
          recipients: data.recipients ?? uniqueEmails,
        }, ...prev]);
        setSendResult({ ok: true, msg: `Sent to ${data.sent} recipient${data.sent !== 1 ? "s" : ""}.` });
        setSubject(""); setBody(""); setLinkChoice(""); setCustomUrl("");
      } else {
        setSendResult({ ok: false, msg: data.error ?? "Failed to send." });
      }
    } catch {
      setSendResult({ ok: false, msg: "Network error. Try again." });
    } finally { setSending(false); }
  };

  const handleResend = async () => {
    if (!resendItem) return;
    setResending(true);
    setResendResult(null);
    // Only send to emails NOT in the original recipients
    const allCurrentEmails = Array.from(new Set(rows.map((r) => r.email)));
    const originalSet = new Set(resendItem.recipients.map((e) => e.toLowerCase()));
    const newEmails = allCurrentEmails.filter((e) => !originalSet.has(e.toLowerCase()));
    if (newEmails.length === 0) {
      setResendResult({ ok: false, msg: "No new recipients since this newsletter was sent." });
      setResending(false);
      return;
    }
    try {
      const data = await doSend(newEmails, resendItem.subject, resendItem.body, resendItem.linkUrl ?? "", resendItem.linkLabel ?? "");
      if (data.ok) {
        // Update saved recipients list
        const updated = [...resendItem.recipients, ...newEmails];
        setSent((prev) => prev.map((n) => n.id === resendItem.id ? { ...n, recipients: updated, recipientCount: updated.length } : n));
        setResendResult({ ok: true, msg: `Resent to ${data.sent} new recipient${data.sent !== 1 ? "s" : ""}.` });
      } else {
        setResendResult({ ok: false, msg: data.error ?? "Failed to resend." });
      }
    } catch {
      setResendResult({ ok: false, msg: "Network error. Try again." });
    } finally { setResending(false); }
  };

  const openResend = (item: SentNewsletter) => {
    const allCurrentEmails = Array.from(new Set(rows.map((r) => r.email)));
    const originalSet = new Set(item.recipients.map((e) => e.toLowerCase()));
    const newCount = allCurrentEmails.filter((e) => !originalSet.has(e.toLowerCase())).length;
    setResendItem(item);
    setResendResult(newCount === 0 ? { ok: false, msg: "No new recipients." } : null);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "all",        label: "All Emails" },
    { key: "newsletter", label: "Newsletter" },
    { key: "tickets",    label: "Ticket Buyers" },
    { key: "sent",       label: `Sent (${sent.length})` },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-widest text-white">Email List</h1>
          <p className="text-gray-600 text-xs mt-1">{newsletterCount} newsletter · {ticketCount} ticket buyers</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {tab !== "sent" && (
            <>
              <button onClick={handleCopy} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-gray-400 text-xs font-bold uppercase tracking-widest hover:border-[#FFFF00]/40 hover:text-[#FFFF00] transition-all">
                <Copy className="w-3.5 h-3.5" />{copied ? "Copied!" : "Copy"}
              </button>
              <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-gray-400 text-xs font-bold uppercase tracking-widest hover:border-[#FFFF00]/40 hover:text-[#FFFF00] transition-all">
                <Download className="w-3.5 h-3.5" />Export
              </button>
            </>
          )}
          <button
            onClick={() => { setCompose(true); setSendResult(null); }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#FFFF00]/40 text-[#FFFF00] text-xs font-bold uppercase tracking-widest hover:border-[#FFFF00] transition-all"
            style={{ boxShadow: "0 0 12px rgba(255,255,0,0.1)" }}
          >
            <Send className="w-3.5 h-3.5" />Send Newsletter
          </button>
        </div>
      </div>

      {/* ── Compose modal ── */}
      <AnimatePresence>
        {compose && (
          <motion.div className="fixed inset-0 z-[300] flex items-center justify-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setCompose(false)} />
            <motion.div
              className="relative w-full max-w-lg bg-[#050505] border border-[#FFFF00]/25 rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto scrollbar-hide"
              style={{ boxShadow: "0 0 60px rgba(255,255,0,0.1)" }}
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold uppercase tracking-widest" style={{ color: "#FFFF00" }}>Send Newsletter</h2>
                  <p className="text-gray-600 text-xs mt-0.5">Sending to {uniqueEmails.length} recipient{uniqueEmails.length !== 1 ? "s" : ""} ({tab === "sent" ? "all" : tab})</p>
                </div>
                <button onClick={() => setCompose(false)} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Subject *</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Dine At Night — Edition 3 is here!" className={inputCls} />
              </div>

              {/* Body */}
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Message *</label>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Write your newsletter message here..." className={`${inputCls} resize-none`} />
                <p className="text-gray-700 text-xs mt-1">Plain text — styled with Dine At Night branding automatically.</p>
              </div>

              {/* Link picker */}
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Link2 className="w-3 h-3" /> Page Link (optional)
                </label>
                <select
                  value={linkChoice}
                  onChange={(e) => { setLinkChoice(e.target.value); setCustomUrl(""); }}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all cursor-pointer"
                >
                  <option value="">No link — just message</option>
                  {SITE_LINKS.map((l) => (
                    <option key={l.path} value={l.path}>{l.label}</option>
                  ))}
                </select>
                {linkChoice === "__custom__" && (
                  <input
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://..."
                    className={`${inputCls} mt-2`}
                  />
                )}
                {resolvedLink && (
                  <p className="text-[#FFFF00]/50 text-xs mt-1.5 flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    Button: &quot;{resolvedLabel} →&quot; → {resolvedLink}
                  </p>
                )}
              </div>

              {sendResult && (
                <p className="text-sm text-center font-medium py-2 rounded-lg" style={{ color: sendResult.ok ? "#00FF41" : "#FF3333", background: sendResult.ok ? "rgba(0,255,65,0.06)" : "rgba(255,51,51,0.06)" }}>
                  {sendResult.msg}
                </p>
              )}

              <button
                onClick={handleSend}
                disabled={sending || !subject.trim() || !body.trim()}
                className="w-full py-3 rounded-full font-bold uppercase tracking-widest text-sm transition-all"
                style={{ background: sending || !subject.trim() || !body.trim() ? "transparent" : "#FFFF00", color: sending || !subject.trim() || !body.trim() ? "#FFFF00" : "#000", border: "2px solid #FFFF00", opacity: !subject.trim() || !body.trim() ? 0.4 : 1 }}
              >
                {sending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />Sending…
                  </span>
                ) : `Send to ${uniqueEmails.length} recipient${uniqueEmails.length !== 1 ? "s" : ""} →`}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Resend modal ── */}
      <AnimatePresence>
        {resendItem && (
          <motion.div className="fixed inset-0 z-[300] flex items-center justify-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setResendItem(null); setResendResult(null); }} />
            <motion.div
              className="relative w-full max-w-md bg-[#050505] border border-[#FFFF00]/25 rounded-2xl p-6 space-y-4"
              style={{ boxShadow: "0 0 60px rgba(255,255,0,0.1)" }}
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold uppercase tracking-widest" style={{ color: "#FFFF00" }}>Resend to New Users</h2>
                <button onClick={() => { setResendItem(null); setResendResult(null); }} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-xl border border-white/8 bg-white/2 p-4 space-y-2">
                <p className="text-white text-sm font-medium">{resendItem.subject}</p>
                <p className="text-gray-500 text-xs leading-relaxed line-clamp-3">{resendItem.body}</p>
                {resendItem.linkUrl && (
                  <p className="text-[#FFFF00]/50 text-xs flex items-center gap-1">
                    <Link2 className="w-3 h-3" />{resendItem.linkLabel} → {resendItem.linkUrl}
                  </p>
                )}
              </div>

              {(() => {
                const allCurrentEmails = Array.from(new Set(rows.map((r) => r.email)));
                const originalSet = new Set(resendItem.recipients.map((e) => e.toLowerCase()));
                const newCount = allCurrentEmails.filter((e) => !originalSet.has(e.toLowerCase())).length;
                return (
                  <div className="rounded-xl border border-white/8 px-4 py-3 flex items-center justify-between">
                    <span className="text-gray-400 text-sm">New recipients since sent</span>
                    <span className="font-bold text-sm" style={{ color: newCount > 0 ? "#00FF41" : "#666" }}>{newCount}</span>
                  </div>
                );
              })()}

              {resendResult && (
                <p className="text-sm text-center font-medium py-2 rounded-lg" style={{ color: resendResult.ok ? "#00FF41" : "#FF3333", background: resendResult.ok ? "rgba(0,255,65,0.06)" : "rgba(255,51,51,0.06)" }}>
                  {resendResult.msg}
                </p>
              )}

              <button
                onClick={handleResend}
                disabled={resending}
                className="w-full py-3 rounded-full font-bold uppercase tracking-widest text-sm transition-all"
                style={{ background: resending ? "transparent" : "#FFFF00", color: resending ? "#FFFF00" : "#000", border: "2px solid #FFFF00" }}
              >
                {resending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />Sending…
                  </span>
                ) : "Resend to New Users →"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tabs ── */}
      <div className="flex items-center justify-between border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest border-b-2 -mb-px transition-colors whitespace-nowrap"
                style={{ borderColor: active ? "#FFFF00" : "transparent", color: active ? "#FFFF00" : "rgba(255,255,255,0.35)" }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        {(tab === "newsletter" || tab === "all") && newsletterCount > 0 && (
          <button onClick={() => setClearConfirm(true)} className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-gray-700 hover:text-[#FF3333] transition-colors pb-2 whitespace-nowrap shrink-0">
            <Trash2 className="w-3 h-3" />Clear Newsletter
          </button>
        )}
      </div>

      {/* Clear confirm */}
      <AnimatePresence>
        {clearConfirm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-xl border border-[#FF3333]/30 px-5 py-4 flex items-center justify-between gap-4"
            style={{ background: "rgba(255,51,51,0.04)" }}
          >
            <p className="text-gray-300 text-sm">Delete all {newsletterCount} newsletter subscribers?</p>
            <div className="flex gap-2">
              <button onClick={() => setClearConfirm(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-white transition-colors">Cancel</button>
              <button onClick={handleClearAll} disabled={clearing}
                className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border border-[#FF3333] text-[#FF3333] hover:bg-[#FF3333] hover:text-black transition-all">
                {clearing ? "Clearing…" : "Yes, Delete All"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
        </div>

      ) : tab === "sent" ? (
        /* ── Sent history ── */
        sent.length === 0 ? (
          <div className="text-center py-16 text-gray-600 text-sm">No newsletters sent yet.</div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            {sent.map((item) => {
              const isExpanded = expanded === item.id;
              const allCurrentEmails = Array.from(new Set(rows.map((r) => r.email)));
              const originalSet = new Set(item.recipients.map((e) => e.toLowerCase()));
              const newCount = allCurrentEmails.filter((e) => !originalSet.has(e.toLowerCase())).length;

              return (
                <div key={item.id} className="rounded-xl border border-white/8 overflow-hidden" style={{ background: "#080808" }}>
                  {/* Header row */}
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : item.id)}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,0,0.08)" }}>
                      <Mail className="w-4 h-4" style={{ color: "#FFFF00" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{item.subject}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-gray-600 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.sentAt?.toDate?.()?.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) ?? "—"}
                        </span>
                        <span className="text-gray-600 text-xs">{item.recipientCount} sent</span>
                        {newCount > 0 && (
                          <span className="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full" style={{ color: "#00FF41", background: "rgba(0,255,65,0.1)" }}>
                            +{newCount} new
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); openResend(item); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 text-xs font-bold uppercase tracking-widest hover:border-[#FFFF00]/40 hover:text-[#FFFF00] transition-all"
                      >
                        <RotateCcw className="w-3 h-3" />Resend
                      </button>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
                    </div>
                  </div>

                  {/* Expanded body */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-0 space-y-3 border-t border-white/5">
                          <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-line pt-4">{item.body}</p>
                          {item.linkUrl && (
                            <div className="flex items-center gap-2 text-xs">
                              <Link2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#FFFF00" }} />
                              <span className="text-gray-500">Link:</span>
                              <span style={{ color: "#FFFF00" }}>{item.linkLabel}</span>
                              <span className="text-gray-700">→ {item.linkUrl}</span>
                            </div>
                          )}
                          <div className="pt-1">
                            <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-2">Recipients ({item.recipientCount})</p>
                            <p className="text-gray-700 text-xs leading-relaxed break-all">
                              {item.recipients.slice(0, 20).join(", ")}{item.recipients.length > 20 ? ` … +${item.recipients.length - 20} more` : ""}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        )

      ) : emailRows.length === 0 ? (
        <div className="text-center py-16 text-gray-600 text-sm">No emails found.</div>
      ) : (
        /* ── Email list ── */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
          <p className="text-gray-600 text-xs mb-3">{uniqueEmails.length} unique email{uniqueEmails.length !== 1 ? "s" : ""}</p>
          <div className="rounded-xl border border-white/8 overflow-hidden">
            {emailRows.map((row, i) => (
              <div
                key={`${row.email}-${i}`}
                className="flex items-center gap-4 px-5 py-3 border-b last:border-b-0 hover:bg-white/[0.02] transition-colors group"
                style={{ borderColor: "rgba(255,255,255,0.05)" }}
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: row.source === "newsletter" ? "rgba(255,255,0,0.08)" : "rgba(0,255,65,0.08)" }}>
                  {row.source === "newsletter" ? <Mail className="w-3.5 h-3.5" style={{ color: "#FFFF00" }} /> : <Ticket className="w-3.5 h-3.5" style={{ color: "#00FF41" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-200 text-sm truncate">{row.email}</p>
                  {row.source === "ticket" && <p className="text-gray-600 text-xs truncate">{row.name}{row.eventTitle ? ` · ${row.eventTitle}` : ""}</p>}
                  {row.source === "newsletter" && row.subscribedAt && <p className="text-gray-700 text-xs">{row.subscribedAt}</p>}
                </div>
                <span className="text-[9px] uppercase tracking-widest font-bold shrink-0" style={{ color: row.source === "newsletter" ? "rgba(255,255,0,0.5)" : "rgba(0,255,65,0.5)" }}>
                  {row.source === "newsletter" ? "Newsletter" : "Ticket"}
                </span>
                <button
                  onClick={() =>
                    row.source === "newsletter"
                      ? handleDelete(row as SubscriberRow)
                      : handleSuppress(row.email)
                  }
                  disabled={deleting === (row.source === "newsletter" ? (row as SubscriberRow).id : row.email)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-700 hover:text-[#FF3333] transition-all opacity-0 group-hover:opacity-100"
                  title={row.source === "ticket" ? "Remove from email list" : "Delete subscriber"}
                >
                  {deleting === (row.source === "newsletter" ? (row as SubscriberRow).id : row.email)
                    ? <span className="w-3 h-3 border border-[#FF3333] border-t-transparent rounded-full animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
