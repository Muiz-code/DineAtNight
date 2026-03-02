"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Truck,
  CheckCircle2,
  PackageX,
} from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Status = "loading" | "success" | "error";
type DeliveryStatus = "pending" | "dispatched" | "delivered" | "returned";

interface OrderSummary {
  reference: string;
  name: string;
  email: string;
  items: { productName: string; price: number; qty: number }[];
  total: number;
}

const STEPS: { key: DeliveryStatus; label: string; icon: React.ElementType }[] = [
  { key: "pending",    label: "Order Placed",  icon: Clock       },
  { key: "dispatched", label: "Dispatched",    icon: Truck       },
  { key: "delivered",  label: "Delivered",     icon: CheckCircle2 },
];

const STEP_ORDER: DeliveryStatus[] = ["pending", "dispatched", "delivered"];

const STATUS_COLOR: Record<DeliveryStatus, string> = {
  pending:    "#FFFF00",
  dispatched: "#FFFF00",
  delivered:  "#00FF41",
  returned:   "#FF8C00",
};

export default function ShopVerifyPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>("pending");

  // 1. Verify payment via API
  useEffect(() => {
    const reference = params.get("reference");
    if (!reference) {
      setErrorMsg("No payment reference found.");
      setStatus("error");
      return;
    }

    const verify = async () => {
      try {
        const url = new URL("/api/paystack/merch/verify", window.location.origin);
        url.searchParams.set("reference", reference);
        const res = await fetch(url.toString());
        const data = await res.json();
        if (data.ok && data.order) {
          setOrder(data.order);
          setDeliveryStatus(data.order.deliveryStatus ?? "pending");
          setStatus("success");
        } else {
          setErrorMsg(data.error ?? "Payment could not be verified.");
          setStatus("error");
        }
      } catch {
        setErrorMsg("Network error. Please contact support.");
        setStatus("error");
      }
    };

    verify();
  }, [params]);

  // 2. Subscribe to real-time delivery status once verified
  useEffect(() => {
    if (status !== "success" || !order?.reference) return;
    const unsub = onSnapshot(
      doc(db, "merch_orders", order.reference),
      (snap) => {
        if (snap.exists()) {
          setDeliveryStatus(snap.data().deliveryStatus ?? "pending");
        }
      },
    );
    return unsub;
  }, [status, order?.reference]);

  const isReturned = deliveryStatus === "returned";
  const currentStepIdx = STEP_ORDER.indexOf(deliveryStatus);
  const accentColor = STATUS_COLOR[deliveryStatus];

  return (
    <div className="relative min-h-screen bg-black flex items-center justify-center px-6 py-12">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 0%, ${accentColor}0f 0%, transparent 70%)`,
          transition: "background 0.5s ease",
        }}
      />

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        {status === "loading" && (
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-[#00FF41]" />
            <p className="text-gray-400 tracking-widest text-sm uppercase">
              Verifying payment…
            </p>
          </div>
        )}

        {status === "success" && order && (
          <div
            className="rounded-2xl border p-8 space-y-6"
            style={{
              background: "linear-gradient(135deg, #080808, #030303)",
              borderColor: `${accentColor}4d`,
              boxShadow: `0 0 40px ${accentColor}14`,
              transition: "border-color 0.5s ease, box-shadow 0.5s ease",
            }}
          >
            {/* Header */}
            <div className="text-center space-y-3">
              {isReturned ? (
                <PackageX className="w-14 h-14 mx-auto" style={{ color: "#FF8C00" }} />
              ) : (
                <CheckCircle className="w-14 h-14 mx-auto" style={{ color: "#00FF41" }} />
              )}
              <h1
                className="text-2xl font-bold uppercase tracking-widest"
                style={{ color: accentColor, textShadow: `0 0 20px ${accentColor}80` }}
              >
                {isReturned ? "Order Returned" : "Order Confirmed"}
              </h1>
              <p className="text-gray-400 text-sm">
                {isReturned
                  ? "Your order has been returned. Contact us if you have questions."
                  : `Thanks ${order.name.split(" ")[0]}! Your merch is on its way.`}
              </p>
            </div>

            {/* Delivery Status Tracker */}
            {isReturned ? (
              <div
                className="rounded-xl px-5 py-4 flex items-center gap-3"
                style={{ background: "rgba(255,140,0,0.07)", border: "1px solid rgba(255,140,0,0.25)" }}
              >
                <PackageX className="w-5 h-5 shrink-0" style={{ color: "#FF8C00" }} />
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-0.5">Delivery Status</p>
                  <p className="text-sm font-bold" style={{ color: "#FF8C00" }}>
                    Returned
                  </p>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    This order was returned. Reach out via the Contact page for assistance.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-gray-600">Delivery Progress</p>
                <div className="flex items-center gap-0">
                  {STEPS.map((step, i) => {
                    const done = currentStepIdx >= i;
                    const active = currentStepIdx === i;
                    const Icon = step.icon;
                    return (
                      <div key={step.key} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500"
                            style={{
                              borderColor: done ? accentColor : "rgba(255,255,255,0.1)",
                              background: done ? `${accentColor}20` : "transparent",
                              boxShadow: active ? `0 0 12px ${accentColor}60` : "none",
                            }}
                          >
                            <Icon
                              className="w-3.5 h-3.5"
                              style={{ color: done ? accentColor : "rgba(255,255,255,0.2)" }}
                            />
                          </div>
                          <span
                            className="text-[9px] uppercase tracking-widest text-center leading-tight"
                            style={{ color: done ? accentColor : "rgba(255,255,255,0.2)" }}
                          >
                            {step.label}
                          </span>
                        </div>
                        {i < STEPS.length - 1 && (
                          <div
                            className="flex-1 h-px mb-5 mx-1 transition-all duration-500"
                            style={{ background: currentStepIdx > i ? accentColor : "rgba(255,255,255,0.08)" }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Order items */}
            <div className="border-t border-white/10 pt-5 space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-300">
                    {item.productName}
                    <span className="text-gray-600 ml-1">×{item.qty}</span>
                  </span>
                  <span className="text-white">
                    ₦{(item.price * item.qty).toLocaleString("en-NG")}
                  </span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-base border-t border-white/10 pt-3 mt-1">
                <span className="text-gray-400 uppercase tracking-widest text-xs pt-0.5">
                  Total
                </span>
                <span style={{ color: "#00FF41" }}>
                  ₦{order.total.toLocaleString("en-NG")}
                </span>
              </div>
            </div>

            {/* Reference */}
            <div
              className="rounded-lg px-4 py-3 text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <p className="text-[11px] text-gray-500 tracking-widest uppercase">Reference</p>
              <p className="text-xs font-mono text-gray-300 mt-0.5 break-all">{order.reference}</p>
            </div>

            <p className="text-[11px] text-gray-600 text-center">
              A confirmation has been sent to{" "}
              <span className="text-gray-400">{order.email}</span>
            </p>

            <div className="flex gap-3">
              <Link href="/shop" className="flex-1">
                <motion.button
                  className="w-full py-3.5 rounded-full font-bold uppercase tracking-widest text-sm text-black"
                  style={{ background: "#00FF41", boxShadow: "0 0 20px rgba(0,255,65,0.4)" }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Back to Shop
                </motion.button>
              </Link>
              {isReturned && (
                <Link href="/contact" className="flex-1">
                  <motion.button
                    className="w-full py-3.5 rounded-full font-bold uppercase tracking-widest text-sm border"
                    style={{ borderColor: "rgba(255,140,0,0.4)", color: "#FF8C00" }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Contact Us
                  </motion.button>
                </Link>
              )}
            </div>
          </div>
        )}

        {status === "error" && (
          <div
            className="rounded-2xl border p-8 space-y-6 text-center"
            style={{
              background: "linear-gradient(135deg, #080808, #030303)",
              borderColor: "rgba(255,51,51,0.3)",
            }}
          >
            <XCircle className="w-14 h-14 mx-auto" style={{ color: "#FF3333" }} />
            <h1
              className="text-2xl font-bold uppercase tracking-widest"
              style={{ color: "#FF3333" }}
            >
              Verification Failed
            </h1>
            <p className="text-gray-400 text-sm">{errorMsg}</p>
            <div className="flex gap-3">
              <button
                onClick={() => router.back()}
                className="flex-1 py-3 rounded-full font-bold uppercase tracking-widest text-sm border border-white/15 text-white"
              >
                Go Back
              </button>
              <Link href="/shop" className="flex-1">
                <button
                  className="w-full py-3 rounded-full font-bold uppercase tracking-widest text-sm text-black"
                  style={{ background: "#FF3333" }}
                >
                  Shop
                </button>
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
