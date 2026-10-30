"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { KeyRound, LogOut, QrCode } from "lucide-react";
import TicketScanner from "@/app/_components/TicketScanner";

type Me = {
  kind: "staff" | "admin";
  name: string;
  scannerId: string | null;
  scanCount: number | null;
  admittedCount: number | null;
};

// Remembered after a staff login so a logged-out device can ask for a new code
const LAST_SCANNER_KEY = "dan_last_scanner";
const readLastScanner = () => {
  try {
    return localStorage.getItem(LAST_SCANNER_KEY);
  } catch {
    return null;
  }
};
const writeLastScanner = (id: string) => {
  try {
    localStorage.setItem(LAST_SCANNER_KEY, id);
  } catch {}
};

const inputCls =
  "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-center text-xl font-mono tracking-[0.25em] uppercase focus:outline-none focus:border-[#FFFF00] transition-all placeholder:text-gray-700 placeholder:tracking-normal placeholder:text-sm";

function LoginScreen({ onLoggedIn, notice }: { onLoggedIn: () => void; notice: string }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [requestState, setRequestState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [lastScanner, setLastScanner] = useState<string | null>(null);

  useEffect(() => setLastScanner(readLastScanner()), []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/scan/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not log in.");
        return;
      }
      writeLastScanner(data.scannerId);
      onLoggedIn();
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async () => {
    if (!lastScanner) return;
    setRequestState("sending");
    try {
      const res = await fetch("/api/scan/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scannerId: lastScanner }),
      });
      setRequestState(res.ok ? "sent" : "failed");
    } catch {
      setRequestState("failed");
    }
  };

  return (
    <div className="max-w-sm mx-auto space-y-6 pt-10">
      <div className="text-center space-y-2">
        <QrCode className="w-8 h-8 text-[#FFFF00] mx-auto" />
        <h1 className="text-2xl font-bold text-white uppercase tracking-widest">Ticket Scanner</h1>
        <p className="text-gray-500 text-sm">Enter the one-time code an admin gave you.</p>
      </div>

      {notice && (
        <p className="rounded-lg border border-[#FFFF00]/25 bg-[#FFFF00]/5 px-4 py-3 text-xs text-[#FFFF00] text-center">
          {notice}
        </p>
      )}

      <form onSubmit={handleLogin} className="space-y-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. K7M2-X9QP"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={12}
          className={inputCls}
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || code.replace(/[^a-z0-9]/gi, "").length < 8}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-bold text-sm uppercase tracking-widest text-black disabled:opacity-40"
          style={{ background: "#FFFF00", boxShadow: "0 0 20px rgba(255,255,0,0.3)" }}
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <KeyRound className="w-4 h-4" />
          )}
          Start scanning
        </button>
        {error && <p className="text-[#FF3333] text-xs text-center">{error}</p>}
      </form>

      <div className="rounded-lg border border-white/8 p-4 text-center space-y-3">
        <p className="text-gray-500 text-xs leading-relaxed">
          Each code works once. If you logged out or your session ended, you&apos;ll need a new code from an admin.
        </p>
        {lastScanner && (
          <button
            onClick={handleRequest}
            disabled={requestState === "sending" || requestState === "sent"}
            className="text-xs font-bold uppercase tracking-widest text-[#FFFF00] disabled:text-gray-500"
          >
            {requestState === "sent"
              ? "✓ Request sent — an admin will give you a new code"
              : requestState === "sending"
                ? "Sending…"
                : requestState === "failed"
                  ? "Couldn't send — ask an admin directly"
                  : "Request a new code"}
          </button>
        )}
      </div>
    </div>
  );
}

function ScanContent() {
  const prefill = useSearchParams().get("ref") ?? "";
  const [me, setMe] = useState<Me | null>(null);
  const [checking, setChecking] = useState(true);
  const [notice, setNotice] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch("/api/scan/me", { cache: "no-store" });
      setMe(res.ok ? await res.json() : null);
    } catch {
      setMe(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const handleLogout = async () => {
    if (!window.confirm("Log out? Your code only works once — you'll need a new one from an admin to scan again.")) return;
    setLoggingOut(true);
    try {
      await fetch("/api/scan/logout", { method: "POST" });
    } finally {
      setLoggingOut(false);
      setMe(null);
      setNotice("You're logged out. Ask an admin for a new code to scan again.");
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!me) {
    return (
      <LoginScreen
        notice={notice}
        onLoggedIn={() => {
          setNotice("");
          setChecking(true);
          loadMe();
        }}
      />
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white uppercase tracking-widest">Scan Tickets</h1>
          <p className="text-gray-500 text-sm mt-0.5 truncate">
            Scanning as <span className="text-white font-bold">{me.name}</span>
            {me.kind === "admin" ? " (admin)" : ""}
          </p>
          {me.scanCount !== null && (
            <p className="text-gray-600 text-xs mt-1">
              You&apos;ve scanned {me.scanCount} ticket{me.scanCount === 1 ? "" : "s"} · {me.admittedCount} people admitted
            </p>
          )}
        </div>
        {me.kind === "staff" && (
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-white/10 text-gray-400 hover:text-white flex-shrink-0 disabled:opacity-40"
          >
            <LogOut className="w-3.5 h-3.5" /> Log out
          </button>
        )}
      </div>

      <TicketScanner
        prefillRef={prefill}
        onAdmitted={() => {
          // Refresh the personal count shown above
          if (me.kind === "staff") loadMe();
        }}
        onSessionEnded={() => {
          setMe(null);
          setNotice("Your session ended (an admin may have issued a new code or revoked access). Enter a new code.");
        }}
      />
    </div>
  );
}

export default function ScanPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-8">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <ScanContent />
      </Suspense>
    </main>
  );
}
