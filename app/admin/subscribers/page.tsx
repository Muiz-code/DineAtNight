"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Copy, Download, Mail, Ticket } from "lucide-react";
import * as XLSX from "xlsx";

interface SubscriberRow {
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

export default function SubscribersPage() {
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [subSnap, ticketSnap] = await Promise.all([
          getDocs(query(collection(db, "subscribers"), orderBy("subscribedAt", "desc"))).catch(() => null),
          getDocs(collection(db, "tickets")),
        ]);

        const subs: SubscriberRow[] = [];
        if (subSnap) {
          subSnap.forEach((doc) => {
            const d = doc.data();
            subs.push({
              email: d.email ?? doc.id,
              subscribedAt: d.subscribedAt?.toDate?.()?.toLocaleDateString("en-NG") ?? "",
              source: "newsletter",
            });
          });
        }

        const ticketEmails: TicketEmailRow[] = [];
        const seen = new Set<string>();
        ticketSnap.forEach((doc) => {
          const d = doc.data();
          if (d.status !== "paid" && d.status !== "confirmed") return;
          if (!d.email || seen.has(d.email.toLowerCase())) return;
          seen.add(d.email.toLowerCase());
          ticketEmails.push({
            email: d.email,
            name: d.name ?? "",
            eventTitle: d.eventTitle ?? "",
            source: "ticket",
          });
        });

        setRows([...subs, ...ticketEmails]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = rows.filter((r) => {
    if (tab === "newsletter") return r.source === "newsletter";
    if (tab === "tickets") return r.source === "ticket";
    return true;
  });

  // Deduplicated email list across all sources
  const uniqueEmails = Array.from(new Set(filtered.map((r) => r.email)));

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

  const TABS: { key: Tab; label: string }[] = [
    { key: "all", label: "All Emails" },
    { key: "newsletter", label: "Newsletter" },
    { key: "tickets", label: "Ticket Buyers" },
  ];

  const newsletterCount = rows.filter((r) => r.source === "newsletter").length;
  const ticketCount = new Set(rows.filter((r) => r.source === "ticket").map((r) => r.email)).size;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-widest text-white">
            Email List
          </h1>
          <p className="text-gray-600 text-xs mt-1">
            {newsletterCount} newsletter · {ticketCount} ticket buyers
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-gray-400 text-xs font-bold uppercase tracking-widest hover:border-[#FFFF00]/40 hover:text-[#FFFF00] transition-all"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? "Copied!" : "Copy All"}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#FFFF00]/30 text-[#FFFF00] text-xs font-bold uppercase tracking-widest hover:border-[#FFFF00] transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest border-b-2 -mb-px transition-colors"
              style={{
                borderColor: active ? "#FFFF00" : "transparent",
                color: active ? "#FFFF00" : "rgba(255,255,255,0.35)",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600 text-sm">No emails found.</div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-1"
        >
          <p className="text-gray-600 text-xs mb-3">
            {uniqueEmails.length} unique email{uniqueEmails.length !== 1 ? "s" : ""}
          </p>
          <div className="rounded-xl border border-white/8 overflow-hidden">
            {filtered.map((row, i) => (
              <div
                key={`${row.email}-${i}`}
                className="flex items-center gap-4 px-5 py-3 border-b last:border-b-0 hover:bg-white/[0.02] transition-colors"
                style={{ borderColor: "rgba(255,255,255,0.05)" }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background:
                      row.source === "newsletter"
                        ? "rgba(255,255,0,0.08)"
                        : "rgba(0,255,65,0.08)",
                  }}
                >
                  {row.source === "newsletter" ? (
                    <Mail
                      className="w-3.5 h-3.5"
                      style={{ color: "#FFFF00" }}
                    />
                  ) : (
                    <Ticket
                      className="w-3.5 h-3.5"
                      style={{ color: "#00FF41" }}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-gray-200 text-sm truncate">{row.email}</p>
                  {row.source === "ticket" && (
                    <p className="text-gray-600 text-xs truncate">
                      {row.name}
                      {row.eventTitle ? ` · ${row.eventTitle}` : ""}
                    </p>
                  )}
                  {row.source === "newsletter" && row.subscribedAt && (
                    <p className="text-gray-700 text-xs">{row.subscribedAt}</p>
                  )}
                </div>

                <span
                  className="text-[9px] uppercase tracking-widest font-bold flex-shrink-0"
                  style={{
                    color:
                      row.source === "newsletter"
                        ? "rgba(255,255,0,0.5)"
                        : "rgba(0,255,65,0.5)",
                  }}
                >
                  {row.source === "newsletter" ? "Newsletter" : "Ticket"}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
