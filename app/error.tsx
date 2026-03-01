"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-center">
      <p
        className="text-xs tracking-[0.4em] uppercase mb-3"
        style={{ color: "#FF3333", textShadow: "0 0 12px rgba(255,51,51,0.7)" }}
      >
        Something went wrong
      </p>
      <h1
        className="text-4xl sm:text-6xl uppercase tracking-tight mb-6"
        style={{ color: "transparent", WebkitTextStroke: "2px #FF3333" }}
      >
        Unexpected Error
      </h1>
      <p className="text-gray-500 text-sm mb-10 max-w-sm">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <button
        onClick={reset}
        className="px-8 py-3 rounded-full border-2 border-[#00FF41] text-[#00FF41] uppercase tracking-widest text-sm font-bold hover:bg-[#00FF41] hover:text-black transition-all duration-300"
      >
        Try Again
      </button>
    </div>
  );
}
