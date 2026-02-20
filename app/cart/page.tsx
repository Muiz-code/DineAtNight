"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import Footer from "../_components/Footer";
import Carousel from "../_components/Carousel";

/*
 * The cart page is a dedicated route for the /cart URL.
 * Actual cart state lives in the Shop page (app/shop/page.tsx)
 * via the floating cart drawer. This page serves as a landing
 * for users who navigate directly to /cart.
 *
 * API NEEDED: Integrate global cart state (React Context / Zustand)
 * so cart items persist across pages and are shown here.
 */

export default function CartPage() {
  return (
    <>
      <div className="relative w-full min-h-screen bg-black overflow-x-hidden flex flex-col items-center justify-center px-6 text-center">
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(0,255,65,0.05) 0%, transparent 70%)",
          }}
        />

        <motion.div
          className="relative z-10 flex flex-col items-center gap-6 max-w-md"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Cart icon */}
          <motion.div
            className="w-24 h-24 rounded-full border-2 flex items-center justify-center"
            style={{
              borderColor: "#00FF41",
              boxShadow:
                "0 0 40px rgba(0,255,65,0.4), inset 0 0 30px rgba(0,255,65,0.1)",
            }}
            animate={{
              boxShadow: [
                "0 0 40px rgba(0,255,65,0.4), inset 0 0 30px rgba(0,255,65,0.1)",
                "0 0 60px rgba(0,255,65,0.7), inset 0 0 40px rgba(0,255,65,0.2)",
                "0 0 40px rgba(0,255,65,0.4), inset 0 0 30px rgba(0,255,65,0.1)",
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <ShoppingCart className="w-10 h-10" style={{ color: "#00FF41" }} />
          </motion.div>

          <h1
            className="text-4xl sm:text-5xl uppercase tracking-wider font-bold"
            style={{
              color: "#00FF41",
              textShadow: "0 0 25px rgba(0,255,65,0.6)",
            }}
          >
            Your Cart
          </h1>

          <p className="text-gray-500 text-base leading-relaxed">
            Your cart is currently empty. Head over to the shop to browse our
            exclusive Dine At Night merch.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-2 w-full">
            <Link href="/shop" className="flex-1">
              <motion.button
                className="w-full py-3.5 rounded-full font-bold uppercase tracking-widest text-sm text-black"
                style={{
                  background: "#00FF41",
                  boxShadow: "0 0 25px rgba(0,255,65,0.5)",
                }}
                whileHover={{
                  scale: 1.03,
                  boxShadow: "0 0 40px rgba(0,255,65,0.7)",
                }}
                whileTap={{ scale: 0.97 }}
              >
                Browse the Shop
              </motion.button>
            </Link>
            <Link href="/home" className="flex-1">
              <motion.button
                className="w-full py-3.5 rounded-full font-bold uppercase tracking-widest text-sm border-2 border-white/20 text-gray-400 flex items-center justify-center gap-2"
                whileHover={{
                  borderColor: "rgba(255,255,255,0.5)",
                  color: "white",
                  scale: 1.02,
                }}
                whileTap={{ scale: 0.97 }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back Home
              </motion.button>
            </Link>
          </div>

          <p className="text-gray-700 text-xs tracking-widest uppercase mt-4">
            {/* API NEEDED: Display cart items when global cart state is implemented */}
            Cart persistence coming soon
          </p>
        </motion.div>

        {/* ── MERCH SPOTLIGHT CAROUSEL ── */}
        <div className="w-full max-w-3xl px-6 mt-16">
          <Carousel
            title="While You're Here — Check These Out"
            accentColor="#FFFF00"
            glowColor="rgba(255,255,0,0.35)"
            autoPlay
            autoPlayInterval={3500}
            items={[
              {
                id: "s1",
                content: (
                  <div className="text-center py-6 px-4">
                    <p className="text-5xl mb-4">👕</p>
                    <h3
                      className="text-xl font-bold uppercase tracking-wide mb-2"
                      style={{ color: "#FFFF00" }}
                    >
                      Night Tee
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Classic black tee with neon DAN logo. 100% cotton.
                    </p>
                    <Link href="/shop">
                      <motion.button
                        className="px-6 py-2.5 rounded-full border font-bold uppercase tracking-widest text-xs"
                        style={{ borderColor: "#FFFF00", color: "#FFFF00" }}
                        whileHover={{ background: "rgba(255,255,0,0.12)" }}
                      >
                        Shop Now — ₦8,500
                      </motion.button>
                    </Link>
                  </div>
                ),
              },
              {
                id: "s2",
                content: (
                  <div className="text-center py-6 px-4">
                    <p className="text-5xl mb-4">🧥</p>
                    <h3
                      className="text-xl font-bold uppercase tracking-wide mb-2"
                      style={{ color: "#FF3333" }}
                    >
                      Neon Hoodie
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Premium heavyweight hoodie with glow-in-dark print.
                    </p>
                    <Link href="/shop">
                      <motion.button
                        className="px-6 py-2.5 rounded-full border font-bold uppercase tracking-widest text-xs"
                        style={{ borderColor: "#FF3333", color: "#FF3333" }}
                        whileHover={{ background: "rgba(255,51,51,0.12)" }}
                      >
                        Shop Now — ₦22,000
                      </motion.button>
                    </Link>
                  </div>
                ),
              },
              {
                id: "s3",
                content: (
                  <div className="text-center py-6 px-4">
                    <p className="text-5xl mb-4">🔥</p>
                    <h3
                      className="text-xl font-bold uppercase tracking-wide mb-2"
                      style={{ color: "#FFFF00" }}
                    >
                      Edition 1 Tee
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Limited edition from the very first Dine At Night. Only 50
                      remaining.
                    </p>
                    <Link href="/shop?category=limited">
                      <motion.button
                        className="px-6 py-2.5 rounded-full font-bold uppercase tracking-widest text-xs text-black"
                        style={{
                          background: "#FFFF00",
                          boxShadow: "0 0 20px rgba(255,255,0,0.4)",
                        }}
                        whileHover={{ scale: 1.04 }}
                      >
                        Limited Drop — ₦15,000
                      </motion.button>
                    </Link>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>

      <Footer />
    </>
  );
}
