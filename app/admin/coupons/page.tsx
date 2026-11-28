"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Copy, Download, Pause, Play, Plus, TicketPercent, X } from "lucide-react";
import * as XLSX from "xlsx";
import { getAllEvents, type DanEvent } from "@/lib/firestore";
import { logAdminAction } from "@/lib/adminLog";
import { endOfLagosDay, liveHolds, type CouponCampaign, type CouponCodeDoc } from "@/lib/coupons";

const inputCls =
  "w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all placeholder:text-gray-700";
const labelCls = "block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5";

const dateLabel = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" });
const dateTimeLabel = (ms: number) =>
  new Date(ms).toLocaleString("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
/** ms → "YYYY-MM-DD" in Lagos, for a date input. */
const toDateInput = (ms: number) => new Date(ms + 60 * 60 * 1000).toISOString().slice(0, 10);

function statusOf(c: CouponCampaign): { label: string; color: string } {
  if (!c.active) return { label: "Paused", color: "#888" };
  if (c.expiresAt != null && Date.now() > c.expiresAt) return { label: "Expired", color: "#FF3333" };
  if (c.redeemedCount >= c.maxUsesTotal) return { label: "All used", color: "#FF9F1C" };
  return { label: "Active", color: "#00FF41" };
}

const EMPTY = {
  name: "",
  eventId: "",
  percentOff: "100",
  kind: "unique" as "unique" | "shared",
  codeCount: "40",
  sharedCode: "",
  maxUses: "40",
  tiers: [] as string[],
  noExpiry: true,
  expiryDate: "",
};

/**
 * Coupon campaigns: create codes for a sponsor or promo, see who used which
 * code, export them, pause or change the expiry. All reads and writes go
 * through /api/admin/coupons (server-only collections). Rules: lib/coupons.ts.
 */
export default function AdminCouponsPage() {
  const [campaigns, setCampaigns] = useState<CouponCampaign[]>([]);
  const [events, setEvents] = useState<DanEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [open, setOpen] = useState<{ campaign: CouponCampaign; codes: CouponCodeDoc[] } | null>(null);
  const [openLoading, setOpenLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [res, evs] = await Promise.all([fetch("/api/admin/coupons", { cache: "no-store" }), getAllEvents()]);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      setCampaigns(data.campaigns ?? []);
      setEvents(evs);
    } catch (err) {
      console.error("[admin/coupons] load failed:", err);
      setLoadError("Couldn't load coupon campaigns. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const openCampaign = async (id: string) => {
    setOpenLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/admin/coupons/${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      setOpen(data);
    } catch (err) {
      console.error("[admin/coupons] open failed:", err);
      setActionError("Couldn't open that campaign. Please try again.");
    } finally {
      setOpenLoading(false);
    }
  };

  const selectedEvent = events.find((e) => e.id === form.eventId);
  const eventTiers = selectedEvent?.ticketTypes ?? [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    let expiresAt: number | null = null;
    if (!form.noExpiry) {
      expiresAt = endOfLagosDay(form.expiryDate);
      if (expiresAt === null) return setFormError("Choose an expiry date, or tick No expiry.");
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          eventId: form.eventId,
          percentOff: Number(form.percentOff),
          kind: form.kind,
          ...(form.kind === "unique" ? { codeCount: Number(form.codeCount) } : { sharedCode: form.sharedCode, maxUses: Number(form.maxUses) }),
          tiers: form.tiers,
          expiresAt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error ?? "Couldn't create the campaign. Please try again.");
        return;
      }
      const c = data.campaign as CouponCampaign;
      await logAdminAction(
        "CREATE_COUPON_CAMPAIGN",
        `Created coupon campaign "${c.name}" — ${c.percentOff}% off, ${c.kind === "unique" ? `${c.codeCount} unique codes` : `shared code, ${c.maxUsesTotal} uses`}`,
        { type: "coupon", id: c.id, name: c.name },
      );
      setCreating(false);
      setForm(EMPTY);
      await load();
      if (c.id) openCampaign(c.id);
    } catch (err) {
      console.error("[admin/coupons] create failed:", err);
      setFormError("Network error. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const patch = async (c: CouponCampaign, body: { active?: boolean; expiresAt?: number | null }, logText: string) => {
    setActionError("");
    try {
      const res = await fetch(`/api/admin/coupons/${encodeURIComponent(c.id!)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error ?? "Couldn't save the change. Please try again.");
        return;
      }
      await logAdminAction("UPDATE_COUPON_CAMPAIGN", logText, { type: "coupon", id: c.id, name: c.name });
      await load();
      await openCampaign(c.id!);
    } catch (err) {
      console.error("[admin/coupons] update failed:", err);
      setActionError("Network error. Please check your connection and try again.");
    }
  };

  const exportCodes = (c: CouponCampaign, codes: CouponCodeDoc[]) => {
    const rows = codes.flatMap((code) => {
      const base = { "#": code.number, Code: code.code, "% off": c.percentOff };
      if (!code.redemptions?.length) return [{ ...base, Status: "Unused", "Used by": "", Email: "", "Ticket reference": "", "Used at": "" }];
      return code.redemptions.map((r) => ({
        ...base,
        Status: r.free ? "Used (free ticket)" : "Used (paid)",
        "Used by": r.name,
        Email: r.email,
        "Ticket reference": r.reference,
        "Used at": dateTimeLabel(r.at),
      }));
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Codes");
    XLSX.writeFile(wb, `coupons-${c.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const copyCodes = (codes: CouponCodeDoc[]) => {
    navigator.clipboard.writeText(codes.map((c) => c.code).join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Campaign detail ──────────────────────────────────────────────────────
  if (open) {
    const { campaign: c, codes } = open;
    const st = statusOf(c);
    const now = Date.now();
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <button onClick={() => setOpen(null)} className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 hover:text-white">
          <ArrowLeft className="w-3.5 h-3.5" /> All campaigns
        </button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest text-white">{c.name}</h1>
            <p className="text-gray-500 text-xs mt-1">
              {c.eventTitle} · {c.percentOff}% off one ticket · {c.tiers.length ? c.tiers.join(", ") : "Any ticket type"} ·{" "}
              {c.expiresAt ? `Valid until ${dateLabel(c.expiresAt)}` : "No expiry"}
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ color: st.color, background: `${st.color}15` }}>
            {st.label}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Used", value: c.redeemedCount },
            { label: "Uses allowed", value: c.maxUsesTotal },
            { label: "Left", value: Math.max(0, c.maxUsesTotal - c.redeemedCount) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/8 p-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">{s.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => copyCodes(codes)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-gray-400 text-xs font-bold uppercase tracking-widest hover:border-[#FFFF00]/40 hover:text-[#FFFF00]">
            <Copy className="w-3.5 h-3.5" />
            {copied ? "Copied!" : "Copy codes"}
          </button>
          <button onClick={() => exportCodes(c, codes)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-gray-400 text-xs font-bold uppercase tracking-widest hover:border-[#FFFF00]/40 hover:text-[#FFFF00]">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={() => patch(c, { active: !c.active }, `${c.active ? "Paused" : "Resumed"} coupon campaign "${c.name}"`)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-gray-400 text-xs font-bold uppercase tracking-widest hover:border-[#FFFF00]/40 hover:text-[#FFFF00]"
          >
            {c.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {c.active ? "Pause codes" : "Resume codes"}
          </button>
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 text-xs">
            <span className="font-bold uppercase tracking-widest">Valid until</span>
            <input
              key={c.expiresAt ?? "none"}
              type="date"
              defaultValue={c.expiresAt ? toDateInput(c.expiresAt) : ""}
              onChange={(e) => {
                const ms = endOfLagosDay(e.target.value);
                if (ms) patch(c, { expiresAt: ms }, `Set coupon campaign "${c.name}" to expire ${e.target.value}`);
              }}
              className="bg-transparent text-white text-xs focus:outline-none"
            />
            {c.expiresAt && (
              <button onClick={() => patch(c, { expiresAt: null }, `Removed the expiry from coupon campaign "${c.name}"`)} className="text-gray-500 hover:text-white uppercase tracking-widest text-[10px] font-bold">
                No expiry
              </button>
            )}
          </label>
        </div>
        {actionError && <p className="text-[#FF3333] text-sm">{actionError}</p>}

        <div className="rounded-xl border border-white/8 overflow-hidden">
          <div className="grid grid-cols-[3rem_1fr_1.2fr_1fr] gap-3 px-4 py-2.5 border-b border-white/8 text-[10px] text-gray-500 uppercase tracking-widest">
            <span>#</span>
            <span>Code</span>
            <span>Used by</span>
            <span>Status</span>
          </div>
          {codes.map((code) => {
            const held = Object.keys(liveHolds(code.holds, now)).length;
            const last = code.redemptions?.[code.redemptions.length - 1];
            const used = code.redeemed > 0;
            return (
              <div key={code.code} className="grid grid-cols-[3rem_1fr_1.2fr_1fr] gap-3 px-4 py-3 border-b border-white/5 last:border-0 text-sm items-center">
                <span className="text-gray-600 font-mono text-xs">{code.number}</span>
                <span className="text-white font-mono">{code.code}</span>
                <span className="min-w-0">
                  {last ? (
                    <>
                      <span className="block text-gray-200 truncate">{last.name}</span>
                      <span className="block text-gray-600 text-xs truncate">
                        {last.email} · {last.reference}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-700">—</span>
                  )}
                </span>
                <span className="text-xs">
                  {code.maxUses > 1 ? (
                    <span className="text-gray-300">
                      {code.redeemed} of {code.maxUses} used{held ? ` · ${held} at checkout` : ""}
                    </span>
                  ) : used ? (
                    <span className="text-[#00FF41]">Used {last ? dateTimeLabel(last.at) : ""}</span>
                  ) : held ? (
                    <span className="text-[#FF9F1C]">At checkout now</span>
                  ) : (
                    <span className="text-gray-500">Unused</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
        {codes.some((c) => c.maxUses > 1 && c.redemptions.length > 1) && (
          <p className="text-gray-600 text-xs">A shared code shows its latest use here; Export lists every use.</p>
        )}
      </div>
    );
  }

  // ── Campaign list + create ───────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-widest text-white">Coupon Codes</h1>
          <p className="text-gray-600 text-xs mt-1 max-w-xl">
            Codes take a percentage off one ticket per order. At 100% off a single ticket, it&apos;s issued free without
            Paystack. Every ticket records the code, its number and the discount.
          </p>
        </div>
        <button
          onClick={() => { setCreating(true); setFormError(""); }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#FFFF00]/40 text-[#FFFF00] text-xs font-bold uppercase tracking-widest hover:border-[#FFFF00]"
        >
          <Plus className="w-3.5 h-3.5" /> New campaign
        </button>
      </div>

      {loadError && <p className="text-[#FF3333] text-sm">{loadError}</p>}
      {actionError && <p className="text-[#FF3333] text-sm">{actionError}</p>}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 text-gray-600 text-sm">No coupon campaigns yet.</div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c) => {
            const st = statusOf(c);
            return (
              <button
                key={c.id}
                onClick={() => openCampaign(c.id!)}
                disabled={openLoading}
                className="w-full text-left flex items-center gap-4 px-5 py-4 rounded-xl border border-white/8 hover:bg-white/[0.02] transition-colors"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,0,0.08)" }}>
                  <TicketPercent className="w-4 h-4" style={{ color: "#FFFF00" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{c.name}</p>
                  <p className="text-gray-600 text-xs truncate">
                    {c.eventTitle} · {c.percentOff}% off · {c.kind === "unique" ? `${c.codeCount} codes` : "shared code"} ·{" "}
                    {c.expiresAt ? `until ${dateLabel(c.expiresAt)}` : "no expiry"}
                  </p>
                </div>
                <span className="text-sm text-gray-300 shrink-0">
                  {c.redeemedCount}/{c.maxUsesTotal} used
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0" style={{ color: st.color, background: `${st.color}15` }}>
                  {st.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {creating && (
          <motion.div className="fixed inset-0 z-[300] flex items-center justify-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !saving && setCreating(false)} />
            <motion.form
              onSubmit={handleCreate}
              className="relative w-full max-w-lg bg-[#050505] border border-[#FFFF00]/25 rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold uppercase tracking-widest" style={{ color: "#FFFF00" }}>New coupon campaign</h2>
                <button type="button" onClick={() => setCreating(false)} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className={labelCls}>Campaign name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Naira card — 40 free tickets" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Event *</label>
                <select
                  required
                  value={form.eventId}
                  onChange={(e) => setForm({ ...form, eventId: e.target.value, tiers: [] })}
                  className={`${inputCls} bg-[#0a0a0a] cursor-pointer`}
                >
                  <option value="">Choose an event</option>
                  {events.filter((ev) => !ev.isPast).map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Percentage off one ticket *</label>
                <div className="flex items-center gap-2">
                  <input required type="number" min="1" max="100" step="1" value={form.percentOff} onChange={(e) => setForm({ ...form, percentOff: e.target.value })} className={`${inputCls} w-28`} />
                  <span className="text-gray-400 text-sm">%</span>
                </div>
                <p className="text-gray-600 text-xs mt-1.5">
                  {Number(form.percentOff) === 100
                    ? "100%: a 1-ticket order is free and skips Paystack. Extra tickets in the same order are paid for."
                    : "Taken off one ticket; the buyer pays the rest through Paystack."}{" "}
                  This can&apos;t be changed after the codes are created.
                </p>
              </div>

              {eventTiers.length > 0 && (
                <div>
                  <label className={labelCls}>Works for which ticket types?</label>
                  <div className="flex flex-wrap gap-2">
                    {eventTiers.map((t) => {
                      const on = form.tiers.includes(t.name);
                      return (
                        <button
                          type="button"
                          key={t.name}
                          onClick={() => setForm({ ...form, tiers: on ? form.tiers.filter((x) => x !== t.name) : [...form.tiers, t.name] })}
                          className="px-3 py-1.5 rounded-full border text-xs transition-all"
                          style={{ borderColor: on ? "#FFFF00" : "rgba(255,255,255,0.12)", color: on ? "#FFFF00" : "rgba(255,255,255,0.5)" }}
                        >
                          {t.name} · ₦{t.price.toLocaleString()}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-gray-600 text-xs mt-1.5">
                    {form.tiers.length ? `Only ${form.tiers.join(", ")}.` : "None chosen = works for every ticket type, including VIP."}
                  </p>
                </div>
              )}

              <div>
                <label className={labelCls}>Codes</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["unique", "shared"] as const).map((k) => (
                    <button
                      type="button"
                      key={k}
                      onClick={() => setForm({ ...form, kind: k })}
                      className="px-3 py-2.5 rounded-lg border text-left text-xs"
                      style={{ borderColor: form.kind === k ? "#FFFF00" : "rgba(255,255,255,0.1)", color: form.kind === k ? "#fff" : "rgba(255,255,255,0.5)" }}
                    >
                      <span className="block font-bold uppercase tracking-widest" style={{ color: form.kind === k ? "#FFFF00" : undefined }}>
                        {k === "unique" ? "Unique codes" : "One shared code"}
                      </span>
                      {k === "unique" ? "A different code per person, each works once. Best for sponsors." : "One code for everyone, up to a total number of uses."}
                    </button>
                  ))}
                </div>
              </div>

              {form.kind === "unique" ? (
                <div>
                  <label className={labelCls}>How many codes? *</label>
                  <input required type="number" min="1" max="400" value={form.codeCount} onChange={(e) => setForm({ ...form, codeCount: e.target.value })} className={`${inputCls} w-28`} />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Code *</label>
                    <input required value={form.sharedCode} onChange={(e) => setForm({ ...form, sharedCode: e.target.value.toUpperCase() })} placeholder="e.g. NAIRACARD" className={`${inputCls} font-mono uppercase`} />
                  </div>
                  <div>
                    <label className={labelCls}>Total uses *</label>
                    <input required type="number" min="1" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} className={inputCls} />
                  </div>
                </div>
              )}

              <div>
                <label className={labelCls}>Expiry</label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer mb-2">
                  <input type="checkbox" checked={form.noExpiry} onChange={(e) => setForm({ ...form, noExpiry: e.target.checked })} className="w-4 h-4 accent-[#FFFF00]" />
                  No expiry
                </label>
                {!form.noExpiry && (
                  <>
                    <input type="date" required value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className={`${inputCls} w-48`} />
                    <p className="text-gray-600 text-xs mt-1.5">Codes stop working at the end of this day (Lagos time).</p>
                  </>
                )}
              </div>

              {formError && <p className="text-[#FF3333] text-sm">{formError}</p>}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-full font-bold uppercase tracking-widest text-sm text-black disabled:opacity-40"
                style={{ background: "#FFFF00", boxShadow: "0 0 20px rgba(255,255,0,0.3)" }}
              >
                {saving ? "Creating…" : form.kind === "unique" ? `Create ${form.codeCount || 0} codes` : "Create code"}
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
