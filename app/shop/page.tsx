"use client";

import { useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { ShoppingCart, X, Plus, Minus, Shirt, ShoppingBag, Star, Flame, HardHat } from "lucide-react";
import Footer from "../_components/Footer";
import Carousel from "../_components/Carousel";

/* ── helpers ── */
const SectionFadeIn = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

type CartItem = { id: string; name: string; price: number; qty: number };
type Category = "all" | "tshirts" | "hoodies" | "caps" | "bags" | "stickers" | "limited";

const products = [
  { id: "tee-1", name: "Night Tee", price: 8500, category: "tshirts" as Category, icon: <Shirt className="w-16 h-16" />, description: "Classic black tee with neon DAN logo. 100% cotton.", limited: false, accent: "#FFFF00", glow: "rgba(255,255,0,0.4)" },
  { id: "hoodie-1", name: "Neon Hoodie", price: 22000, category: "hoodies" as Category, icon: <Shirt className="w-16 h-16" />, description: "Premium heavyweight hoodie with glow-in-dark print.", limited: false, accent: "#FF3333", glow: "rgba(255,51,51,0.4)" },
  { id: "cap-1", name: "Night Cap", price: 7500, category: "caps" as Category, icon: <HardHat className="w-16 h-16" />, description: "Structured 6-panel cap. Embroidered neon logo.", limited: false, accent: "#00FF41", glow: "rgba(0,255,65,0.4)" },
  { id: "tote-1", name: "Neon Tote", price: 5500, category: "bags" as Category, icon: <ShoppingBag className="w-16 h-16" />, description: "Heavy canvas tote with screen-printed neon artwork.", limited: false, accent: "#FFFF00", glow: "rgba(255,255,0,0.4)" },
  { id: "sticker-1", name: "Sticker Pack", price: 2500, category: "stickers" as Category, icon: <Star className="w-16 h-16" />, description: "5 holographic vinyl stickers. Waterproof & durable.", limited: false, accent: "#FF3333", glow: "rgba(255,51,51,0.4)" },
  { id: "ltd-1", name: "Edition 1 Tee", price: 15000, category: "limited" as Category, icon: <Flame className="w-16 h-16" />, description: "Limited edition tee from the first ever Dine At Night. Only 50 remaining.", limited: true, accent: "#FFFF00", glow: "rgba(255,255,0,0.5)" },
];

const categories: { key: Category; label: string }[] = [
  { key: "all", label: "All" },
  { key: "tshirts", label: "T-Shirts" },
  { key: "hoodies", label: "Hoodies" },
  { key: "caps", label: "Caps" },
  { key: "bags", label: "Tote Bags" },
  { key: "stickers", label: "Stickers" },
  { key: "limited", label: "Limited Drops" },
];

const fmt = (n: number) =>
  "₦" + n.toLocaleString("en-NG");

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const filtered =
    activeCategory === "all"
      ? products
      : products.filter((p) => p.category === activeCategory);

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const addToCart = (product: typeof products[number]) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => i.id === id ? { ...i, qty: i.qty + delta } : i)
        .filter((i) => i.qty > 0)
    );
  };

  return (
    <div className="relative w-full min-h-screen bg-black overflow-x-hidden">
      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center pt-28 pb-16 px-6 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,255,65,0.06) 0%, transparent 70%)" }}
        />
        <motion.p
          className="text-xs tracking-[0.7em] uppercase mb-3"
          style={{ color: "#00FF41", textShadow: "0 0 12px rgba(0,255,65,0.7)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          Official Merch
        </motion.p>
        <motion.h1
          className="text-5xl sm:text-7xl uppercase tracking-tight"
          style={{
            color: "transparent",
            WebkitTextStroke: "2px #00FF41",
            textShadow: "0 0 40px rgba(0,255,65,0.3)",
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          The Shop
        </motion.h1>
        <motion.p
          className="mt-4 text-gray-400 text-base sm:text-lg max-w-md"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
        >
          Wear the night. Exclusive Dine At Night pieces for those who dine after dark.
        </motion.p>
      </section>

      {/* ── FLOATING CART BUTTON ── */}
      <motion.button
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
        style={{
          background: "#000",
          border: "2px solid #00FF41",
          boxShadow: "0 0 20px rgba(0,255,65,0.5)",
        }}
        onClick={() => setCartOpen(true)}
        whileHover={{ scale: 1.08, boxShadow: "0 0 35px rgba(0,255,65,0.7)" }}
        whileTap={{ scale: 0.95 }}
        animate={{ boxShadow: ["0 0 20px rgba(0,255,65,0.5)", "0 0 35px rgba(0,255,65,0.8)", "0 0 20px rgba(0,255,65,0.5)"] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <ShoppingCart className="w-5 h-5 text-[#00FF41]" />
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#00FF41] text-black text-[10px] font-bold flex items-center justify-center">
            {cartCount}
          </span>
        )}
      </motion.button>

      {/* ── CART DRAWER ── */}
      <AnimatePresence>
        {cartOpen && (
          <motion.div
            className="fixed inset-0 z-[200] flex justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
            <motion.div
              className="relative w-full max-w-sm h-full bg-[#050505] border-l border-white/10 flex flex-col"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                <h2 className="text-lg font-bold uppercase tracking-widest text-white">
                  Cart{" "}
                  {cartCount > 0 && (
                    <span className="text-[#00FF41] text-sm">({cartCount})</span>
                  )}
                </h2>
                <button onClick={() => setCartOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                    <ShoppingCart className="w-12 h-12 text-gray-700" />
                    <p className="text-gray-600 text-sm">Your cart is empty. Add some merch!</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 rounded-lg border border-white/8 p-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{item.name}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{fmt(item.price)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-full border border-white/15 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/40 transition-all">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-white text-sm">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded-full border border-white/15 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/40 transition-all">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="px-6 py-5 border-t border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm uppercase tracking-widest">Total</span>
                    <span className="text-white font-bold text-xl" style={{ color: "#00FF41", textShadow: "0 0 15px rgba(0,255,65,0.6)" }}>
                      {fmt(cartTotal)}
                    </span>
                  </div>
                  {/* API NEEDED: Connect to payment processor (Paystack / Flutterwave) */}
                  <motion.button
                    className="w-full py-3.5 rounded-full font-bold uppercase tracking-widest text-sm text-black"
                    style={{ background: "#00FF41", boxShadow: "0 0 25px rgba(0,255,65,0.5)" }}
                    whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(0,255,65,0.7)" }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Checkout →
                  </motion.button>
                  <p className="text-gray-700 text-xs text-center">
                    Payment powered by Paystack (coming soon)
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CATEGORY FILTER ── */}
      <SectionFadeIn>
        <section className="relative z-10 px-6 pb-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className="flex-shrink-0 px-5 py-2 rounded-full text-xs sm:text-sm font-bold uppercase tracking-widest transition-all duration-300 border"
                  style={{
                    borderColor: activeCategory === cat.key ? "#00FF41" : "rgba(255,255,255,0.1)",
                    color: activeCategory === cat.key ? "#00FF41" : "rgba(255,255,255,0.4)",
                    boxShadow: activeCategory === cat.key ? "0 0 15px rgba(0,255,65,0.35)" : "none",
                    background: activeCategory === cat.key ? "rgba(0,255,65,0.08)" : "transparent",
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── PRODUCTS GRID ── */}
      <SectionFadeIn>
        <section className="relative z-10 py-10 px-6 md:px-16">
          <div className="max-w-5xl mx-auto">
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <AnimatePresence mode="popLayout">
                {filtered.map((product) => {
                  const inCart = cart.find((i) => i.id === product.id);
                  return (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.35 }}
                      className="relative rounded-2xl border overflow-hidden flex flex-col"
                      style={{
                        borderColor: `${product.accent}25`,
                        background: "linear-gradient(135deg, #0a0a0a, #050505)",
                        boxShadow: `0 0 15px ${product.glow}10`,
                      }}
                      whileHover={{
                        borderColor: product.accent,
                        boxShadow: `0 0 30px ${product.glow}`,
                      }}
                    >
                      {product.limited && (
                        <div
                          className="absolute top-3 right-3 z-10 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                          style={{ background: product.accent, color: "#000" }}
                        >
                          Limited
                        </div>
                      )}

                      {/* Product visual */}
                      <div
                        className="h-48 flex items-center justify-center"
                        style={{ background: `radial-gradient(circle, ${product.glow} 0%, transparent 70%)`, color: product.accent, filter: `drop-shadow(0 0 16px ${product.glow})` }}
                      >
                        {product.icon}
                      </div>

                      <div className="p-5 flex flex-col flex-1">
                        <h3
                          className="text-lg font-bold uppercase tracking-wide"
                          style={{ color: product.accent, textShadow: `0 0 10px ${product.glow}` }}
                        >
                          {product.name}
                        </h3>
                        <p className="text-gray-500 text-sm mt-1 leading-relaxed flex-1">
                          {product.description}
                        </p>
                        <div className="flex items-center justify-between mt-5 gap-3">
                          <span className="text-white font-bold text-lg">{fmt(product.price)}</span>
                          <motion.button
                            onClick={() => addToCart(product)}
                            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all"
                            style={{
                              borderColor: product.accent,
                              color: inCart ? "#000" : product.accent,
                              background: inCart ? product.accent : "transparent",
                              boxShadow: `0 0 10px ${product.glow}30`,
                            }}
                            whileHover={{ scale: 1.05, boxShadow: `0 0 20px ${product.glow}` }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <ShoppingCart className="w-3 h-3" />
                            {inCart ? `In Cart (${inCart.qty})` : "Add to Cart"}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </div>
        </section>
      </SectionFadeIn>

      {/* ── NOTE ── */}
      <SectionFadeIn>
        <section className="py-12 px-6 text-center">
          <p className="text-gray-700 text-xs tracking-widest uppercase max-w-md mx-auto">
            All merch is made to order. Delivery within Lagos takes 5–7 business days.
            {/* API NEEDED: connect checkout to Paystack or Flutterwave */}
          </p>
        </section>
      </SectionFadeIn>

      {/* ── MERCH REVIEWS CAROUSEL ── */}
      <SectionFadeIn>
        <section className="py-16 px-6">
          <Carousel
            title="What the Night Crowd Is Saying"
            accentColor="#00FF41"
            glowColor="rgba(0,255,65,0.35)"
            autoPlay
            autoPlayInterval={4000}
            items={[
              {
                id: "r1",
                content: (
                  <div className="text-center px-4 py-6">
                    <Shirt className="w-8 h-8 mx-auto mb-4 text-gray-500" />
                    <p className="text-gray-300 text-base sm:text-lg italic leading-relaxed max-w-xl mx-auto">
                      &ldquo;The Night Tee is everything. Wore it to Edition 2 and got stopped three times for photos. Worth every naira.&rdquo;
                    </p>
                    <p className="mt-5 text-xs uppercase tracking-widest" style={{ color: "#00FF41" }}>— Adaeze, Lagos Island</p>
                  </div>
                ),
              },
              {
                id: "r2",
                content: (
                  <div className="text-center px-4 py-6">
                    <Shirt className="w-8 h-8 mx-auto mb-4 text-gray-500" />
                    <p className="text-gray-300 text-base sm:text-lg italic leading-relaxed max-w-xl mx-auto">
                      &ldquo;The Neon Hoodie is genuinely premium — heavyweight fabric, the glow-in-dark print is insane under UV lights. Best merch from any Lagos event.&rdquo;
                    </p>
                    <p className="mt-5 text-xs uppercase tracking-widest" style={{ color: "#00FF41" }}>— Kolade, Victoria Island</p>
                  </div>
                ),
              },
              {
                id: "r3",
                content: (
                  <div className="text-center px-4 py-6">
                    <Flame className="w-8 h-8 mx-auto mb-4 text-gray-500" />
                    <p className="text-gray-300 text-base sm:text-lg italic leading-relaxed max-w-xl mx-auto">
                      &ldquo;Grabbed the Edition 1 Tee as a collectible. Only 50 exist — when Dine At Night blows up, this will be vintage. Already framing mine.&rdquo;
                    </p>
                    <p className="mt-5 text-xs uppercase tracking-widest" style={{ color: "#00FF41" }}>— Temi, Surulere</p>
                  </div>
                ),
              },
              {
                id: "r4",
                content: (
                  <div className="text-center px-4 py-6">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-4 text-gray-500" />
                    <p className="text-gray-300 text-base sm:text-lg italic leading-relaxed max-w-xl mx-auto">
                      &ldquo;The Neon Tote is my daily carry. Heavy canvas, holds everything, and the print gets compliments on the street. Dine At Night is a lifestyle now.&rdquo;
                    </p>
                    <p className="mt-5 text-xs uppercase tracking-widest" style={{ color: "#00FF41" }}>— Chioma, Lekki</p>
                  </div>
                ),
              },
            ]}
          />
        </section>
      </SectionFadeIn>

      <Footer />
    </div>
  );
}
