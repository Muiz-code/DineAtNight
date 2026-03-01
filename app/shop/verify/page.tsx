"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

type Status = "loading" | "success" | "error";

interface OrderSummary {
  reference: string;
  name: string;
  email: string;
  items: { productName: string; price: number; qty: number }[];
  total: number;
}

export default function ShopVerifyPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

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

  return (
    <div className="relative min-h-screen bg-black flex items-center justify-center px-6">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,255,65,0.06) 0%, transparent 70%)",
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
              borderColor: "rgba(0,255,65,0.3)",
              boxShadow: "0 0 40px rgba(0,255,65,0.08)",
            }}
          >
            <div className="text-center space-y-3">
              <CheckCircle className="w-14 h-14 mx-auto" style={{ color: "#00FF41" }} />
              <h1
                className="text-2xl font-bold uppercase tracking-widest"
                style={{ color: "#00FF41", textShadow: "0 0 20px rgba(0,255,65,0.5)" }}
              >
                Order Confirmed
              </h1>
              <p className="text-gray-400 text-sm">
                Thanks {order.name.split(" ")[0]}! Your merch is on its way.
              </p>
            </div>

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

            <div
              className="rounded-lg px-4 py-3 text-center"
              style={{ background: "rgba(0,255,65,0.05)", border: "1px solid rgba(0,255,65,0.15)" }}
            >
              <p className="text-[11px] text-gray-500 tracking-widest uppercase">
                Reference
              </p>
              <p className="text-xs font-mono text-gray-300 mt-0.5 break-all">
                {order.reference}
              </p>
            </div>

            <p className="text-[11px] text-gray-600 text-center">
              A confirmation has been sent to{" "}
              <span className="text-gray-400">{order.email}</span>
            </p>

            <Link href="/shop" className="block w-full">
              <motion.button
                className="w-full py-3.5 rounded-full font-bold uppercase tracking-widest text-sm text-black"
                style={{ background: "#00FF41", boxShadow: "0 0 20px rgba(0,255,65,0.4)" }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                Back to Shop
              </motion.button>
            </Link>
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
                <button className="w-full py-3 rounded-full font-bold uppercase tracking-widest text-sm text-black" style={{ background: "#FF3333" }}>
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
