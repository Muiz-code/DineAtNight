"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Mail, RotateCcw, Save } from "lucide-react";
import { logAdminAction } from "@/lib/adminLog";
import { useConfirm } from "@/app/_components/ConfirmDialog";
import {
  DEFAULT_VENDOR_TEMPLATES,
  PACKAGE_LABELS,
  TEMPLATE_FIELDS,
  VENDOR_PACKAGES,
  findPlaceholders,
  type VendorEmailTemplate,
  type VendorPackage,
} from "@/lib/vendorEmailTemplates";

type Stored = VendorEmailTemplate & {
  package: VendorPackage;
  isDefault: boolean;
  updatedAt: number | null;
  updatedBy: string | null;
};

const inputCls =
  "w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all placeholder:text-gray-700";

const same = (a: VendorEmailTemplate, b: VendorEmailTemplate) =>
  a.subject === b.subject && a.preview === b.preview && a.body === b.body;

export default function AdminEmailTemplatesPage() {
  const [stored, setStored] = useState<Record<VendorPackage, Stored> | null>(null);
  const [loadError, setLoadError] = useState("");
  const [pkg, setPkg] = useState<VendorPackage>("standard");
  const [draft, setDraft] = useState<VendorEmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [previewError, setPreviewError] = useState("");
  const { confirm, dialog } = useConfirm();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/email-templates", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const byPkg = Object.fromEntries(data.templates.map((t: Stored) => [t.package, t])) as Record<VendorPackage, Stored>;
      setStored(byPkg);
      return byPkg;
    } catch {
      setLoadError("Could not load the templates.");
      return null;
    }
  }, []);

  useEffect(() => {
    load().then((byPkg) => {
      if (byPkg) setDraft(byPkg.standard);
    });
  }, [load]);

  const current = stored?.[pkg];
  const dirty = !!(current && draft && !same(current, draft));
  const gaps = draft ? findPlaceholders(draft) : [];

  const switchTo = async (next: VendorPackage) => {
    if (next === pkg || !stored) return;
    if (dirty) {
      const ok = await confirm({
        title: "Discard changes?",
        message: `Your unsaved edits to the ${PACKAGE_LABELS[pkg]} email will be lost.`,
        confirmLabel: "Discard",
        danger: true,
      });
      if (!ok) return;
    }
    setPkg(next);
    setDraft(stored[next]);
    setMessage(null);
  };

  // Live preview, debounced while typing
  const reqId = useRef(0);
  useEffect(() => {
    if (!draft) return;
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/email-templates/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ template: draft }),
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
    }, 400);
    return () => clearTimeout(t);
  }, [draft]);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: pkg, ...draft }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ ok: false, text: data.error ?? "Could not save." });
        return;
      }
      await logAdminAction("UPDATE_EMAIL_TEMPLATE", `Updated the ${PACKAGE_LABELS[pkg]} approval email`, {
        type: "email_template",
        id: pkg,
        name: PACKAGE_LABELS[pkg],
      });
      const byPkg = await load();
      if (byPkg) setDraft(byPkg[pkg]);
      setMessage({ ok: true, text: "Saved. New approval emails will use this wording." });
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    const ok = await confirm({
      title: "Reset to the original wording?",
      message: `The ${PACKAGE_LABELS[pkg]} email goes back to the built-in text. Your saved changes are removed.`,
      confirmLabel: "Reset",
      danger: true,
    });
    if (!ok) return;
    setSaving(true);
    try {
      await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: pkg, reset: true }),
      });
      await logAdminAction("RESET_EMAIL_TEMPLATE", `Reset the ${PACKAGE_LABELS[pkg]} approval email to the original wording`, {
        type: "email_template",
        id: pkg,
        name: PACKAGE_LABELS[pkg],
      });
      const byPkg = await load();
      setDraft(byPkg?.[pkg] ?? DEFAULT_VENDOR_TEMPLATES[pkg]);
      setMessage({ ok: true, text: "Reset to the original wording." });
    } finally {
      setSaving(false);
    }
  };

  if (loadError) return <p className="text-[#FF3333] text-sm">{loadError}</p>;
  if (!stored || !draft) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {dialog}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-widest" style={{ color: "#FFFF00" }}>
          Email Templates
        </h1>
        <p className="text-gray-600 text-sm mt-1">
          The emails vendors get when they&apos;re approved. Pick the package when approving on the{" "}
          <Link href="/admin/vendors" className="text-gray-400 underline">Vendors</Link> page.
        </p>
      </div>

      {/* Package tabs */}
      <div className="flex gap-1 p-1 rounded-xl border border-white/8 bg-white/[0.02] w-fit">
        {VENDOR_PACKAGES.map((p) => {
          const hasGaps = findPlaceholders(p === pkg ? draft : stored[p]).length > 0;
          return (
            <button
              key={p}
              onClick={() => switchTo(p)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-widest transition-all"
              style={{
                color: p === pkg ? "#FFFF00" : "rgba(255,255,255,0.35)",
                background: p === pkg ? "rgba(255,255,0,0.08)" : "transparent",
              }}
            >
              {PACKAGE_LABELS[p]}
              {hasGaps && <AlertTriangle className="w-3.5 h-3.5 text-[#FFFF00]" aria-label="Has text to fill in" />}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Editor */}
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Subject</label>
            <input
              value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
              Inbox preview line <span className="normal-case text-gray-700">(shown after the subject in the inbox)</span>
            </label>
            <input
              value={draft.preview}
              onChange={(e) => setDraft({ ...draft, preview: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Email text</label>
            <textarea
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              rows={22}
              className={`${inputCls} font-mono text-xs leading-relaxed resize-y`}
            />
          </div>

          {gaps.length > 0 && (
            <div className="rounded-lg border border-[#FFFF00]/30 bg-[#FFFF00]/5 px-4 py-3 text-xs text-[#FFFF00] space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Still to fill in — this email can&apos;t be sent to vendors yet:
              </p>
              <p className="text-[#FFFF00]/80">{gaps.join(" · ")}</p>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={save}
              disabled={saving || !dirty}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest text-black disabled:opacity-40"
              style={{ background: "#FFFF00" }}
            >
              <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save"}
            </button>
            {dirty && (
              <button
                onClick={() => setDraft(current!)}
                className="px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/12 text-gray-400 hover:text-white"
              >
                Undo changes
              </button>
            )}
            {!current!.isDefault && (
              <button
                onClick={reset}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/12 text-gray-500 hover:text-[#FF3333]"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset to original
              </button>
            )}
            <Link
              href="/admin/test-emails"
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white"
            >
              <Mail className="w-3.5 h-3.5" /> Send a test
            </Link>
          </div>
          {message && (
            <p className={`text-xs flex items-center gap-1.5 ${message.ok ? "text-[#00FF41]" : "text-[#FF3333]"}`}>
              {message.ok && <Check className="w-3.5 h-3.5" />} {message.text}
            </p>
          )}
          <p className="text-gray-700 text-xs">
            {current!.isDefault
              ? "Using the original wording."
              : `Last saved${current!.updatedBy ? ` by ${current!.updatedBy}` : ""}${current!.updatedAt ? ` · ${new Date(current!.updatedAt).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` : ""}.`}
          </p>

          {/* Format help */}
          <div className="rounded-lg border border-white/8 p-4 space-y-3 text-xs text-gray-500">
            <p className="text-[10px] uppercase tracking-widest text-gray-600">How to format</p>
            <ul className="space-y-1 leading-relaxed">
              <li>Leave a <span className="text-gray-300">blank line</span> to start a new paragraph.</li>
              <li>Start a line with <span className="font-mono text-gray-300">## </span> for a section heading.</li>
              <li>Wrap text in <span className="font-mono text-gray-300">**double stars**</span> to make it bold.</li>
              <li>
                Text in <span className="font-mono text-gray-300">[square brackets]</span> marks a gap to fill in — the
                email won&apos;t send until they&apos;re gone.
              </li>
            </ul>
            <p className="text-[10px] uppercase tracking-widest text-gray-600 pt-1">Filled in for each vendor</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {TEMPLATE_FIELDS.map((f) => (
                <li key={f.key}>
                  <span className="font-mono text-gray-300">{`{${f.key}}`}</span> — {f.description}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-16 rounded-xl border border-white/8 bg-[#0a0a0a] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/8">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest">Preview · sample vendor</p>
            <p className="text-white text-sm mt-1 truncate">{preview?.subject ?? "…"}</p>
          </div>
          {previewError ? (
            <p className="p-4 text-[#FF3333] text-xs">{previewError}</p>
          ) : preview ? (
            <iframe title="Email preview" srcDoc={preview.html} sandbox="" className="w-full h-[70vh] bg-black" />
          ) : (
            <div className="h-[70vh] flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
