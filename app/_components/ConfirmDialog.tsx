"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ConfirmOptions = {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for destructive actions (log out, revoke…). */
  danger?: boolean;
};

/**
 * Styled replacement for window.confirm():
 *   const { confirm, dialog } = useConfirm();
 *   if (!(await confirm({ title: "Log out?", message: "…" }))) return;
 *   …and render {dialog} once in the component.
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  }, []);

  const dialog = <ConfirmDialog options={options} onClose={close} />;
  return { confirm, dialog };
}

function ConfirmDialog({ options, onClose }: { options: ConfirmOptions | null; onClose: (ok: boolean) => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Esc cancels, Enter confirms; focus the confirm button when it opens
  useEffect(() => {
    if (!options) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [options, onClose]);

  const accent = options?.danger ? "#FF3333" : "#FFFF00";

  return (
    <AnimatePresence>
      {options && (
        <motion.div
          className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => onClose(false)} />
          <motion.div
            className="relative w-full max-w-sm rounded-2xl border p-6 space-y-5"
            style={{ background: "#0a0a0a", borderColor: `${accent}40`, boxShadow: `0 0 40px ${accent}14` }}
            initial={{ scale: 0.94, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 16 }}
          >
            <div className="space-y-2">
              <h2
                id="confirm-dialog-title"
                className="text-sm font-bold uppercase tracking-widest"
                style={{ color: accent }}
              >
                {options.title}
              </h2>
              <div className="text-gray-400 text-sm leading-relaxed">{options.message}</div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => onClose(false)}
                className="flex-1 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/12 text-gray-400 hover:text-white transition-colors"
              >
                {options.cancelLabel ?? "Cancel"}
              </button>
              <button
                ref={confirmRef}
                onClick={() => onClose(true)}
                className="flex-1 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-90"
                style={{ background: accent, color: options.danger ? "#fff" : "#000" }}
              >
                {options.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
