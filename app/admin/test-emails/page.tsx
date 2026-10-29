"use client";

import { useEffect, useState } from "react";
import { Check, Mail, Send, X } from "lucide-react";
import { getAuthClient } from "@/lib/firebase";
import {
  TEST_EMAIL_TEMPLATES,
  type TestEmailTemplate,
} from "@/lib/testEmailTemplates";

const inputCls =
  "w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all placeholder:text-gray-700";

const GROUPS = Array.from(new Set(TEST_EMAIL_TEMPLATES.map((t) => t.group)));

type Result = { template: TestEmailTemplate; ok: boolean };

export default function AdminTestEmailsPage() {
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<TestEmailTemplate[]>(["vendor-approved"]);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState("");

  // Default the recipient to the signed-in admin
  useEffect(() => {
    const email = getAuthClient()?.currentUser?.email;
    if (email) setTo((prev) => prev || email);
  }, []);

  const allSelected = selected.length === TEST_EMAIL_TEMPLATES.length;
  const toggle = (key: TestEmailTemplate) =>
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");
    setResults(null);
    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, templates: selected }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Failed to send.");
      else setResults(data.results);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSending(false);
    }
  };

  const labelFor = (key: TestEmailTemplate) =>
    TEST_EMAIL_TEMPLATES.find((t) => t.key === key)?.label ?? key;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1
          className="text-xl sm:text-2xl font-bold uppercase tracking-widest"
          style={{ color: "#FFFF00" }}
        >
          Test Emails
        </h1>
        <p className="text-gray-600 text-sm mt-1">
          Send sample versions of the site&apos;s emails to any address to check
          how they look and whether they land in the inbox or spam. Samples use
          placeholder names (e.g. &quot;Sample Suya Spot&quot;) — no real vendor,
          ticket or order is affected.
        </p>
      </div>

      <form
        onSubmit={handleSend}
        className="space-y-5 px-5 py-5 rounded-xl border border-white/8 bg-white/[0.02]"
      >
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
            Send to
          </label>
          <input
            type="email"
            required
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="you@example.com"
            className={inputCls}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">
              Emails ({selected.length}/{TEST_EMAIL_TEMPLATES.length})
            </p>
            <button
              type="button"
              onClick={() =>
                setSelected(allSelected ? [] : TEST_EMAIL_TEMPLATES.map((t) => t.key))
              }
              className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-[#FFFF00] transition-colors"
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>
          </div>
          {GROUPS.map((group) => (
            <div key={group}>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">
                {group}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TEST_EMAIL_TEMPLATES.filter((t) => t.group === group).map((t) => {
                  const on = selected.includes(t.key);
                  return (
                    <label
                      key={t.key}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all text-sm"
                      style={{
                        borderColor: on ? "rgba(255,255,0,0.4)" : "rgba(255,255,255,0.08)",
                        background: on ? "rgba(255,255,0,0.05)" : "transparent",
                        color: on ? "#fff" : "rgba(255,255,255,0.5)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(t.key)}
                        className="w-4 h-4 accent-[#FFFF00] cursor-pointer"
                      />
                      {t.label}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="submit"
            disabled={sending || selected.length === 0 || !to}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm uppercase tracking-widest text-black disabled:opacity-40"
            style={{ background: "#FFFF00", boxShadow: "0 0 20px rgba(255,255,0,0.3)" }}
          >
            {sending ? (
              <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {sending
              ? "Sending…"
              : `Send ${selected.length} test email${selected.length === 1 ? "" : "s"}`}
          </button>
          {error && <p className="text-[#FF3333] text-sm">{error}</p>}
        </div>
      </form>

      {results && (
        <div className="px-5 py-4 rounded-xl border border-white/8 bg-white/[0.02] space-y-2">
          <p className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest">
            <Mail className="w-3 h-3" /> Results — sent to {to}
          </p>
          {results.map((r) => (
            <p key={r.template} className="flex items-center gap-2 text-sm">
              {r.ok ? (
                <Check className="w-4 h-4 text-[#00FF41]" />
              ) : (
                <X className="w-4 h-4 text-[#FF3333]" />
              )}
              <span className={r.ok ? "text-gray-300" : "text-[#FF3333]"}>
                {labelFor(r.template)}
                {r.ok ? "" : " — failed (check the Resend dashboard / server logs)"}
              </span>
            </p>
          ))}
          <p className="text-gray-600 text-xs pt-1">
            Not in your inbox after a minute? Check spam / promotions.
          </p>
        </div>
      )}
    </div>
  );
}
