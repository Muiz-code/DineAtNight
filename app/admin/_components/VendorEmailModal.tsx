"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Check, Mail, X } from "lucide-react";
import type { DanVendor } from "@/lib/firestore";
import {
  PACKAGE_LABELS,
  VENDOR_PACKAGES,
  findPlaceholders,
  type VendorEmailTemplate,
  type VendorPackage,
} from "@/lib/vendorEmailTemplates";

export type VendorEmailChoice = {
  pkg: VendorPackage;
  emailType: "package" | "custom" | "none";
  custom?: VendorEmailTemplate;
};

export type VendorEmailResult = { vendor: DanVendor; ok: boolean; error?: string };

type EventInfo = { eventTitle?: string; eventDate?: string; venue?: string };

const inputCls =
  "w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all placeholder:text-gray-700";

/**
 * Approve vendors and/or send their approval email: pick the package
 * (Standard / Mini Market), then the email — the package's template, a
 * one-off custom email, or none — with a live preview of what they'll get.
 * `onRun` does the work and reports progress; this only collects the choice.
 */
export default function VendorEmailModal({
  mode,
  vendors,
  eventFor,
  onRun,
  onClose,
}: {
  mode: "approve" | "email";
  vendors: DanVendor[];
  eventFor: (v: DanVendor) => EventInfo;
  onRun: (choice: VendorEmailChoice, onProgress: (done: number) => void) => Promise<VendorEmailResult[]>;
  onClose: () => void;
}) {
  const first = vendors[0];
  const bulk = vendors.length > 1;
  const [templates, setTemplates] = useState<Record<VendorPackage, VendorEmailTemplate> | null>(null);
  const [loadError, setLoadError] = useState("");
  const [pkg, setPkg] = useState<VendorPackage>(first?.package ?? "standard");
  const [emailType, setEmailType] = useState<VendorEmailChoice["emailType"]>("package");
  const [custom, setCustom] = useState<VendorEmailTemplate | null>(null);
  const [preview, setPreview] = useState<{ subject: string; html: string; placeholders: string[] } | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [results, setResults] = useState<VendorEmailResult[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/email-templates", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.templates) throw new Error();
        setTemplates(
          Object.fromEntries(
            d.templates.map((t: VendorEmailTemplate & { package: VendorPackage }) => [
              t.package,
              { subject: t.subject, preview: t.preview, body: t.body },
            ]),
          ) as Record<VendorPackage, VendorEmailTemplate>,
        );
      })
      .catch(() => setLoadError("Could not load the email templates."));
  }, []);

  // The template being sent: the package's, or the custom one (seeded from the package's)
  const active: VendorEmailTemplate | null =
    emailType === "custom" ? custom ?? templates?.[pkg] ?? null : emailType === "package" ? templates?.[pkg] ?? null : null;
  const gaps = useMemo(() => (active ? findPlaceholders(active) : []), [active]);

  // Live preview for the first vendor, debounced while typing
  const [event] = useState<EventInfo>(() => (first ? eventFor(first) : {}));
  const reqId = useRef(0);
  useEffect(() => {
    // No email chosen → the preview pane isn't shown, so there's nothing to fetch
    if (!active || !first) return;
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/email-templates/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ template: active, ownerName: first.ownerName, brandName: first.brandName, ...event }),
        });
        const data = await res.json();
        if (id !== reqId.current) return;
        if (!res.ok) {
          setPreviewError(data.error ?? "Preview failed.");
          return;
        }
        setPreviewError("");
        setPreview(data);
      } catch {
        if (id === reqId.current) setPreviewError("Preview failed.");
      }
    }, 350);
    return () => clearTimeout(t);
  }, [active, first, event]);

  const blocked = emailType !== "none" && (!active || gaps.length > 0);
  const run = async () => {
    setRunning(true);
    setDone(0);
    const res = await onRun({ pkg, emailType, ...(emailType === "custom" && active ? { custom: active } : {}) }, setDone);
    setResults(res);
    setRunning(false);
  };

  const title =
    mode === "approve"
      ? bulk
        ? `Approve ${vendors.length} vendors`
        : `Approve ${first?.brandName}`
      : bulk
        ? `Email ${vendors.length} vendors`
        : `Email ${first?.brandName}`;
  const confirmLabel =
    emailType === "none"
      ? "Approve without email"
      : mode === "approve"
        ? bulk ? `Approve & email ${vendors.length}` : "Approve & send"
        : bulk ? `Send to ${vendors.length}` : "Send email";
  const failed = results?.filter((r) => !r.ok) ?? [];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
      >
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={running ? undefined : onClose} />
        <motion.div
          className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-[#00FF41]/25 bg-[#0a0a0a] overflow-hidden"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
            <div className="min-w-0">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#00FF41] truncate">{title}</h2>
              <p className="text-gray-600 text-xs mt-0.5 truncate">
                {bulk ? vendors.map((v) => v.brandName).join(", ") : `${first?.ownerName} · ${first?.email}`}
              </p>
            </div>
            <button onClick={onClose} disabled={running} className="text-gray-600 hover:text-white disabled:opacity-30" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          {results ? (
            /* ── Results ── */
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="flex items-center gap-2">
                {failed.length ? <AlertTriangle className="w-5 h-5 text-[#FF3333]" /> : <Check className="w-5 h-5 text-[#00FF41]" />}
                <p className="text-white text-sm font-bold">
                  {emailType === "none"
                    ? `Approved ${results.length} vendor${results.length === 1 ? "" : "s"} — no email sent.`
                    : failed.length
                      ? `${results.length - failed.length} sent, ${failed.length} failed`
                      : `Sent to ${results.length} vendor${results.length === 1 ? "" : "s"}.`}
                </p>
              </div>
              {failed.length > 0 && (
                <ul className="space-y-1 text-xs">
                  {failed.map((r) => (
                    <li key={r.vendor.id} className="text-[#FF3333]">
                      {r.vendor.brandName}: {r.error ?? "failed"}
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest bg-[#00FF41] text-black"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
              {/* ── Choices ── */}
              <div className="p-5 space-y-5 lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-white/8">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Package</p>
                  <div className="grid grid-cols-2 gap-2">
                    {VENDOR_PACKAGES.map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setPkg(p);
                          setCustom(null); // re-seed a custom email from the new package
                        }}
                        className="px-3 py-3 rounded-lg border text-sm font-bold text-left transition-all"
                        style={{
                          borderColor: pkg === p ? "#00FF41" : "rgba(255,255,255,0.1)",
                          color: pkg === p ? "#00FF41" : "rgba(255,255,255,0.5)",
                          background: pkg === p ? "rgba(0,255,65,0.06)" : "transparent",
                        }}
                      >
                        {PACKAGE_LABELS[p]}
                      </button>
                    ))}
                  </div>
                  {bulk && <p className="text-gray-600 text-[11px] mt-1.5">Applies to all {vendors.length} vendors.</p>}
                </div>

                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Email</p>
                  <div className="space-y-2">
                    {(
                      [
                        ["package", `Send the ${PACKAGE_LABELS[pkg]} email`],
                        ["custom", "Write a custom email"],
                        ...(mode === "approve" ? [["none", "Don’t send an email now"]] : []),
                      ] as [VendorEmailChoice["emailType"], string][]
                    ).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-3 text-sm cursor-pointer text-gray-300">
                        <input
                          type="radio"
                          name="emailType"
                          checked={emailType === key}
                          onChange={() => setEmailType(key)}
                          className="accent-[#00FF41]"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {emailType === "custom" && active && (
                  <div className="space-y-2">
                    <input
                      value={active.subject}
                      onChange={(e) => setCustom({ ...active, subject: e.target.value })}
                      placeholder="Subject"
                      className={inputCls}
                    />
                    <input
                      value={active.preview}
                      onChange={(e) => setCustom({ ...active, preview: e.target.value })}
                      placeholder="Inbox preview line (optional)"
                      className={inputCls}
                    />
                    <textarea
                      value={active.body}
                      onChange={(e) => setCustom({ ...active, body: e.target.value })}
                      rows={12}
                      className={`${inputCls} font-mono text-xs leading-relaxed resize-y`}
                    />
                    <p className="text-gray-600 text-[11px] leading-relaxed">
                      Blank line = new paragraph · <span className="font-mono">## </span>heading ·{" "}
                      <span className="font-mono">**bold**</span> · fields like{" "}
                      <span className="font-mono">{"{ownerName}"}</span> fill in for each vendor. Only this send is affected.
                    </p>
                  </div>
                )}

                {loadError && <p className="text-[#FF3333] text-xs">{loadError}</p>}
                {emailType !== "none" && gaps.length > 0 && (
                  <div className="rounded-lg border border-[#FFFF00]/30 bg-[#FFFF00]/5 px-3 py-2.5 text-xs text-[#FFFF00] space-y-1">
                    <p className="font-bold">This email still has text to fill in:</p>
                    <p className="text-[#FFFF00]/80">{gaps.join(" · ")}</p>
                    {emailType === "package" && (
                      <Link href="/admin/email-templates" className="underline">
                        Edit it in Email Templates →
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* ── Preview ── */}
              <div className="flex flex-col min-h-[420px] lg:min-h-0">
                {emailType === "none" ? (
                  <div className="flex-1 flex items-center justify-center text-gray-600 text-sm p-6 text-center">
                    {bulk ? "These vendors" : "The vendor"} will be approved without an email. You can send it later with “Resend email”.
                  </div>
                ) : (
                  <>
                    <div className="px-5 py-3 border-b border-white/8 flex-shrink-0">
                      <p className="text-[10px] text-gray-600 uppercase tracking-widest">
                        Preview{bulk ? ` — as ${first?.brandName} sees it` : ""}
                      </p>
                      <p className="text-white text-sm mt-1 truncate">
                        <Mail className="w-3.5 h-3.5 inline mr-1.5 text-gray-500" />
                        {preview?.subject ?? "…"}
                      </p>
                    </div>
                    {previewError ? (
                      <p className="p-5 text-[#FF3333] text-xs">{previewError}</p>
                    ) : preview ? (
                      <iframe
                        title="Email preview"
                        srcDoc={preview.html}
                        sandbox=""
                        className="flex-1 w-full bg-black min-h-[400px]"
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-[#00FF41] border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          {!results && (
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/8 flex-shrink-0">
              {running && (
                <p className="text-gray-500 text-xs mr-auto">
                  {emailType === "none" ? "Approving" : "Sending"} {Math.min(done + 1, vendors.length)} of {vendors.length}…
                </p>
              )}
              <button
                onClick={onClose}
                disabled={running}
                className="px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/12 text-gray-400 hover:text-white disabled:opacity-30"
              >
                Cancel
              </button>
              <button
                onClick={run}
                disabled={running || blocked || (emailType !== "none" && !templates)}
                className="px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest bg-[#00FF41] text-black disabled:opacity-30 flex items-center gap-2"
              >
                {running && <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />}
                {confirmLabel}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
