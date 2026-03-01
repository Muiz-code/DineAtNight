"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center px-6 text-center">
      <p className="text-xs tracking-widest uppercase text-red-500 mb-3">
        Admin Error
      </p>
      <h2 className="text-2xl font-bold text-white mb-4 uppercase tracking-wide">
        Something went wrong
      </h2>
      <p className="text-gray-500 text-sm mb-8 max-w-sm">
        {error.message || "An unexpected error occurred in the admin panel."}
      </p>
      <button
        onClick={reset}
        className="px-6 py-2.5 rounded-lg border border-[#00FF41] text-[#00FF41] text-sm font-bold uppercase tracking-widest hover:bg-[#00FF41] hover:text-black transition-all"
      >
        Try Again
      </button>
    </div>
  );
}
