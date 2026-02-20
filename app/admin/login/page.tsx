"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const allowed = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "admin@dineatnight.com")
      .split(",")
      .map((s) => s.trim());

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!allowed.includes(cred.user.email ?? "")) {
        await auth.signOut();
        setError("This account is not authorised as an admin.");
        setLoading(false);
        return;
      }
      router.push("/admin");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(255,255,0,0.04) 0%, transparent 70%)" }}
      />

      <motion.div
        className="relative w-full max-w-sm"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <div
          className="relative rounded-2xl border p-8"
          style={{
            borderColor: "rgba(255,255,0,0.2)",
            background: "linear-gradient(135deg, #080808, #030303)",
            boxShadow: "0 0 40px rgba(255,255,0,0.06)",
          }}
        >
          <span className="absolute top-0 left-0 w-8 h-8" style={{ borderTop: "2px solid #FFFF00", borderLeft: "2px solid #FFFF00" }} />
          <span className="absolute bottom-0 right-0 w-8 h-8" style={{ borderBottom: "2px solid #FFFF00", borderRight: "2px solid #FFFF00" }} />

          <h1
            className="text-2xl font-bold uppercase tracking-widest mb-1"
            style={{ color: "#FFFF00", textShadow: "0 0 20px rgba(255,255,0,0.5)" }}
          >
            Admin Login
          </h1>
          <p className="text-gray-600 text-xs mb-8 tracking-wide">Dine At Night — restricted area</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] text-gray-600 uppercase tracking-widest mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@dineatnight.com"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all placeholder:text-gray-700"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-600 uppercase tracking-widest mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#FFFF00] transition-all placeholder:text-gray-700"
              />
            </div>

            {error && (
              <p className="text-[#FF3333] text-xs text-center" style={{ textShadow: "0 0 8px rgba(255,51,51,0.5)" }}>
                {error}
              </p>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full font-bold uppercase tracking-widest text-sm mt-2"
              style={{
                background: loading ? "transparent" : "#FFFF00",
                color: loading ? "#FFFF00" : "#000",
                border: "2px solid #FFFF00",
                boxShadow: loading ? "0 0 15px rgba(255,255,0,0.2)" : "0 0 25px rgba(255,255,0,0.4)",
              }}
              whileHover={!loading ? { scale: 1.02 } : {}}
              whileTap={!loading ? { scale: 0.97 } : {}}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-4 h-4 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : "Sign In"}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
