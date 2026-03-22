"use client";

import { useEffect } from "react";

export default function EventError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error("[event]", error); }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-gray-500 text-sm">
        {error.message || "Could not load events. Please try again."}
      </p>
      <button
        onClick={reset}
        className="px-6 py-2 rounded-full border border-white/20 text-white text-xs font-bold uppercase tracking-widest hover:border-white/40 transition-all"
      >
        Try Again
      </button>
    </div>
  );
}
