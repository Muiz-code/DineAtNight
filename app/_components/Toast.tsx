"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { X, Info, CheckCircle2, AlertCircle } from "lucide-react";

interface ToastProps {
  message: string;
  type?: "info" | "success" | "error";
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type = "info",
  onClose,
  duration = 4000,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const colors = {
    info: "#FFFF00",
    success: "#00FF41",
    error: "#FF3333",
  };

  const Icon =
    type === "success" ? CheckCircle2 : type === "error" ? AlertCircle : Info;

  return (
    <motion.div
      layout
      className="fixed top-24 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 px-6 py-3.5 rounded-full border bg-[#050505]/90 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
      style={{ borderColor: `${colors[type]}40` }}
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
    >
      <Icon className="w-4 h-4" style={{ color: colors[type] }} />
      <span className="text-sm font-medium text-white tracking-wide whitespace-nowrap">
        {message}
      </span>
      <button
        onClick={onClose}
        className="ml-2 p-0.5 rounded-full hover:bg-white/10 transition-colors"
      >
        <X className="w-3.5 h-3.5 text-gray-500 hover:text-gray-300" />
      </button>
    </motion.div>
  );
}
