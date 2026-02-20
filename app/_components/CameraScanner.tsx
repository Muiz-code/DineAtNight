"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera } from "lucide-react";

interface CameraScannerProps {
  onScan: (value: string) => void;
  onClose: () => void;
}

export default function CameraScanner({ onScan, onClose }: CameraScannerProps) {
  const scannerRef = useRef<InstanceType<typeof import("html5-qrcode")["Html5Qrcode"]> | null>(null);
  const isRunningRef = useRef(false);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const containerId = "camera-scanner-container";

  useEffect(() => {
    let unmounted = false;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        const cameras = await Html5Qrcode.getCameras();
        if (unmounted) return;
        if (!cameras || cameras.length === 0) {
          setError("No camera found on this device.");
          return;
        }

        // Prefer back camera on mobile, else use first available
        const cam =
          cameras.find((c) => /back|rear|environment/i.test(c.label)) ??
          cameras[cameras.length - 1];

        await scanner.start(
          cam.id,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (unmounted) return;
            // Extract reference from URL if the QR encodes the full confirm URL
            // e.g. https://dineatnight.com/admin/confirm?ref=PAYSTACK_REF
            let ref = decodedText.trim();
            try {
              const url = new URL(decodedText);
              const urlRef = url.searchParams.get("ref");
              if (urlRef) ref = urlRef;
            } catch {
              // Not a URL — use raw text as the reference
            }
            isRunningRef.current = false;
            scanner.stop().catch(() => {});
            onScan(ref);
          },
          () => {
            // QR not detected in frame — ignore
          }
        );

        if (unmounted) {
          // Component closed while camera was starting — stop immediately
          scanner.stop().catch(() => {});
          return;
        }

        isRunningRef.current = true;
        setStarted(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!unmounted) setError(`Camera error: ${msg}`);
      }
    }

    startScanner();

    return () => {
      unmounted = true;
      if (scannerRef.current && isRunningRef.current) {
        isRunningRef.current = false;
        scannerRef.current.stop().catch(() => {});
      }
      scannerRef.current = null;
    };
  }, [onScan]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative w-full max-w-sm rounded-2xl overflow-hidden border"
          style={{ borderColor: "rgba(255,255,0,0.2)", background: "#0a0a0a" }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 text-[#FFFF00]">
              <Camera className="w-4 h-4" />
              <span className="text-sm font-bold uppercase tracking-widest">Scan QR Code</span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scanner viewport */}
          <div className="relative bg-black" style={{ minHeight: 300 }}>
            {/* html5-qrcode mounts the video element here */}
            <div id={containerId} className="w-full" />

            {/* Overlay frame when started */}
            {started && !error && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Corner brackets */}
                <div className="relative w-56 h-56">
                  {["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map((cls, i) => (
                    <div key={i} className={`absolute w-8 h-8 ${cls} rounded-sm`} style={{ borderColor: "#FFFF00" }} />
                  ))}
                  {/* Scan line */}
                  <motion.div
                    className="absolute left-2 right-2 h-0.5 rounded-full"
                    style={{ background: "linear-gradient(90deg, transparent, #FFFF00, transparent)" }}
                    animate={{ top: ["10%", "90%", "10%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              </div>
            )}

            {/* Loading state */}
            {!started && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
                <div className="w-8 h-8 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 text-xs uppercase tracking-widest">Starting camera…</p>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black px-6 text-center">
                <div className="text-4xl">📷</div>
                <p className="text-[#FF3333] text-sm font-bold uppercase tracking-wide">Camera Error</p>
                <p className="text-gray-500 text-xs leading-relaxed">{error}</p>
                <p className="text-gray-600 text-xs">
                  Make sure you&apos;ve granted camera permission in your browser settings.
                </p>
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-5 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-gray-600 text-xs text-center leading-relaxed">
              Point the camera at the ticket&apos;s QR code. It will be confirmed automatically when detected.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
