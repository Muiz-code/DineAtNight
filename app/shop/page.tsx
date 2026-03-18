"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import SectionFadeIn from "../_components/SectionFadeIn";
import {
  ShoppingCart,
  X,
  Plus,
  Minus,
  Shirt,
  ShoppingBag,
  Flame,
  Star,
  Loader2,
  Trash2,
} from "lucide-react";
import Footer from "../_components/Footer";
import Carousel from "../_components/Carousel";
import HeroCarousel from "../_components/HeroCarousel";
import { subscribeAllProducts, type DanProduct } from "@/lib/firestore";
import { useScrollLock } from "@/lib/useScrollLock";
import { getCache, setCache } from "@/lib/cache";
import NeonMarquee from "../_components/NeonMarquee";

type CartItem = { id: string; name: string; price: number; qty: number };
type Category =
  | "all"
  | "tshirts"
  | "hoodies"
  | "caps"
  | "bags"
  | "stickers"
  | "limited";

const categories: { key: Category; label: string }[] = [
  { key: "all", label: "All" },
  { key: "tshirts", label: "T-Shirts" },
  { key: "hoodies", label: "Hoodies" },
  { key: "caps", label: "Caps" },
  { key: "bags", label: "Tote Bags" },
  { key: "stickers", label: "Stickers" },
  { key: "limited", label: "Limited Drops" },
];

const glowFrom = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return "rgba(255,255,255,0.2)";
  return `rgba(${r},${g},${b},0.4)`;
};

const fmt = (n: number) => "₦" + n.toLocaleString("en-NG");

const categoryLabel = (key: string) =>
  categories.find((c) => c.key === key)?.label ?? key;

/* ── 3D Tilt card wrapper (DOM-direct, no re-renders) ── */
function TiltCard({
  children,
  className,
  style,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const rx = ((e.clientY - r.top) / r.height - 0.5) * 14;
    const ry = ((e.clientX - r.left) / r.width - 0.5) * -14;
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.03,1.03,1.03)`;
  };

  const onLeave = () => {
    if (ref.current)
      ref.current.style.transform =
        "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        transition: "transform 0.15s ease-out",
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

type CheckoutState = "idle" | "loading" | "error";

export default function ShopPage() {
  const router = useRouter();
  const [products, setProducts] = useState<DanProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("dan_cart");
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("idle");
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutForm, setCheckoutForm] = useState({
    name: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    state: "",
  });
  const [selectedProduct, setSelectedProduct] = useState<DanProduct | null>(
    null,
  );
  const [modalTilt, setModalTilt] = useState({ x: 0, y: 0 });
  const [tooltipProductId, setTooltipProductId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const resolvedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  const showOutOfStockTooltip = (id: string) => {
    setTooltipProductId(id);
    setTimeout(() => setTooltipProductId(null), 1500);
  };

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("dan_cart", JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart]);

  // Auto-remove sold-out items from cart whenever live product data updates
  useEffect(() => {
    if (!products.length) return;
    setCart((prev) =>
      prev.filter((item) => {
        const product = products.find((p) => p.id === item.id);
        if (!product || product.active === false) return false;
        return (
          product.stock === -1 || product.stock - (product.soldCount ?? 0) > 0
        );
      }),
    );
  }, [products]);

  useEffect(() => {
    resolvedRef.current = false;
    const cached = getCache<DanProduct[]>("dan_products");
    if (cached) {
      setProducts(cached);
      setLoadingProducts(false);
      resolvedRef.current = true;
    }
    return subscribeAllProducts((products) => {
      setProducts(products);
      setCache("dan_products", products);
      if (!resolvedRef.current) {
        setLoadingProducts(false);
        resolvedRef.current = true;
      }
    });
  }, []);

  useScrollLock(!!selectedProduct);

  // Exclude off-shelf products from public view
  const visibleProducts = products.filter((p) => p.active !== false);

  const hotPickId = visibleProducts.reduce<string | null>((best, p) => {
    if (!p.id || p.soldCount === 0) return best;
    if (!best) return p.id;
    return p.soldCount >
      (visibleProducts.find((x) => x.id === best)?.soldCount ?? 0)
      ? p.id
      : best;
  }, null);

  const filtered =
    activeCategory === "all"
      ? visibleProducts
      : visibleProducts.filter(
          (p) => p.category === (activeCategory as string),
        );

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  /** Returns how many units are available to buy for a product. */
  const availableStock = (product: DanProduct): number => {
    if (product.stock === -1) return Infinity;
    return Math.max(0, product.stock - (product.soldCount ?? 0));
  };

  const addToCart = (product: DanProduct, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const maxStock = availableStock(product);
    if (maxStock <= 0) return; // out of stock — silently block
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        if (existing.qty >= maxStock) return prev; // already at stock limit
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [
        ...prev,
        { id: product.id!, name: product.name, price: product.price, qty: 1 },
      ];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    try {
      localStorage.removeItem("dan_cart");
    } catch {
      /* ignore */
    }
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => {
      const product = products.find((p) => p.id === id);
      const maxStock = product ? availableStock(product) : Infinity;
      return prev
        .map((i) => {
          if (i.id !== id) return i;
          const newQty = i.qty + delta;
          return { ...i, qty: Math.min(newQty, maxStock) };
        })
        .filter((i) => i.qty > 0);
    });
  };

  // Suggestions: same category first, then others, exclude selected + out-of-stock, max 3
  const suggestions = selectedProduct
    ? [
        ...products.filter(
          (p) =>
            p.id !== selectedProduct.id &&
            p.category === selectedProduct.category &&
            !(p.stock !== -1 && p.soldCount >= p.stock),
        ),
        ...products.filter(
          (p) =>
            p.id !== selectedProduct.id &&
            p.category !== selectedProduct.category &&
            !(p.stock !== -1 && p.soldCount >= p.stock),
        ),
      ].slice(0, 3)
    : [];

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutState("loading");
    setCheckoutError("");
    try {
      const res = await fetch("/api/paystack/merch/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: checkoutForm.name,
          email: checkoutForm.email,
          phone: checkoutForm.phone,
          address: {
            street: checkoutForm.street,
            city: checkoutForm.city,
            state: checkoutForm.state,
          },
          items: cart.map((i) => ({
            productId: i.id,
            productName: i.name,
            price: i.price,
            qty: i.qty,
          })),
          total: cartTotal,
        }),
      });
      const data = await res.json();
      if (data.authorization_url) {
        router.push(data.authorization_url);
      } else {
        setCheckoutError(data.error ?? "Could not initiate payment.");
        setCheckoutState("error");
      }
    } catch {
      setCheckoutError("Network error. Please try again.");
      setCheckoutState("error");
    }
  };

  const handleModalImageMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setModalTilt({
      x: ((e.clientY - r.top) / r.height - 0.5) * 22,
      y: ((e.clientX - r.left) / r.width - 0.5) * -22,
    });
  };

  return (
    <div className="relative w-full min-h-screen bg-black overflow-x-hidden">
      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center pt-28 pb-16 px-6 text-center overflow-hidden">
        <HeroCarousel accent="#00FF41" />

        <div
          className="absolute inset-0 pointer-events-none z-1"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,255,65,0.06) 0%, transparent 70%)",
          }}
        />
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
          Wear the night. Exclusive Dine At Night pieces for those who dine
          after dark.
        </motion.p>
      </section>

      <NeonMarquee />

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
        animate={{
          boxShadow: [
            "0 0 20px rgba(0,255,65,0.5)",
            "0 0 35px rgba(0,255,65,0.8)",
            "0 0 20px rgba(0,255,65,0.5)",
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <ShoppingCart className="w-5 h-5 text-[#00FF41]" />
        {mounted && cartCount > 0 && (
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
            <div
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => setCartOpen(false)}
            />
            <motion.div
              className="relative w-full max-w-sm h-full bg-[#050505] border-l border-white/10 flex flex-col"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                <h2 className="text-lg font-bold uppercase tracking-widest text-white">
                  Cart
                  {cartCount > 0 && (
                    <span className="text-[#00FF41] text-sm ml-1">
                      ({cartCount})
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-3">
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#FF3333] transition-colors uppercase tracking-widest"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => setCartOpen(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                    <ShoppingCart className="w-12 h-12 text-gray-700" />
                    <p className="text-gray-600 text-sm">
                      Your cart is empty. Add some merch!
                    </p>
                  </div>
                ) : (
                  cart.map((item) => {
                    const product = products.find((p) => p.id === item.id);
                    const maxStock = product
                      ? availableStock(product)
                      : Infinity;
                    const atMax = item.qty >= maxStock;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 rounded-lg border border-white/8 p-4"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {item.name}
                          </p>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {fmt(item.price)}
                          </p>
                          {atMax && maxStock !== Infinity && (
                            <p className="text-[10px] text-[#FF3333] mt-0.5">
                              Max available: {maxStock}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="w-7 h-7 rounded-full border border-white/15 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/40 transition-all"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-white text-sm">
                            {item.qty}
                          </span>
                          <button
                            onClick={() => updateQty(item.id, 1)}
                            disabled={atMax}
                            className="w-7 h-7 rounded-full border flex items-center justify-center transition-all"
                            style={{
                              borderColor: atMax
                                ? "rgba(255,255,255,0.05)"
                                : "rgba(255,255,255,0.15)",
                              color: atMax
                                ? "rgba(255,255,255,0.15)"
                                : "rgba(156,163,175,1)",
                              cursor: atMax ? "not-allowed" : "pointer",
                            }}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-600 hover:text-[#FF3333] transition-colors ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {cart.length > 0 && (
                <div className="px-6 py-5 border-t border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm uppercase tracking-widest">
                      Total
                    </span>
                    <span
                      className="font-bold text-xl"
                      style={{
                        color: "#00FF41",
                        textShadow: "0 0 15px rgba(0,255,65,0.6)",
                      }}
                    >
                      {fmt(cartTotal)}
                    </span>
                  </div>
                  <motion.button
                    onClick={() => {
                      setCartOpen(false);
                      setCheckoutOpen(true);
                    }}
                    className="w-full py-3.5 rounded-full font-bold uppercase tracking-widest text-sm text-black"
                    style={{
                      background: "#00FF41",
                      boxShadow: "0 0 25px rgba(0,255,65,0.5)",
                    }}
                    whileHover={{
                      scale: 1.02,
                      boxShadow: "0 0 40px rgba(0,255,65,0.7)",
                    }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Checkout →
                  </motion.button>
                  <p className="text-gray-700 text-xs text-center">
                    Secured by Paystack
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CHECKOUT MODAL ── */}
      <AnimatePresence>
        {checkoutOpen && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => {
                setCheckoutOpen(false);
                setCheckoutState("idle");
                setCheckoutError("");
              }}
            />
            <motion.div
              className="relative w-full max-w-md rounded-2xl border p-6 space-y-5"
              style={{
                background: "#060606",
                borderColor: "rgba(0,255,65,0.25)",
                boxShadow: "0 0 60px rgba(0,255,65,0.06)",
              }}
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold uppercase tracking-widest text-white">
                  Checkout
                </h2>
                <button
                  onClick={() => {
                    setCheckoutOpen(false);
                    setCheckoutState("idle");
                    setCheckoutError("");
                  }}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Order summary */}
              <div className="rounded-lg border border-white/8 px-4 py-3 space-y-2">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-400">
                      {item.name}{" "}
                      <span className="text-gray-600">×{item.qty}</span>
                    </span>
                    <span className="text-white">
                      ₦{(item.price * item.qty).toLocaleString("en-NG")}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t border-white/8 pt-2 mt-1">
                  <span className="text-gray-500 text-xs uppercase tracking-widest pt-0.5">
                    Total
                  </span>
                  <span style={{ color: "#00FF41" }}>
                    ₦{cartTotal.toLocaleString("en-NG")}
                  </span>
                </div>
              </div>

              {/* Contact form */}
              <form onSubmit={handleCheckout} className="space-y-3">
                {[
                  {
                    name: "name",
                    label: "Full Name",
                    type: "text",
                    placeholder: "John Doe",
                  },
                  {
                    name: "email",
                    label: "Email",
                    type: "email",
                    placeholder: "you@email.com",
                  },
                  {
                    name: "phone",
                    label: "Phone",
                    type: "tel",
                    placeholder: "+234 800 000 0000",
                  },
                ].map((field) => (
                  <div key={field.name}>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-1">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      required
                      placeholder={field.placeholder}
                      value={
                        checkoutForm[field.name as keyof typeof checkoutForm]
                      }
                      onChange={(e) =>
                        setCheckoutForm((p) => ({
                          ...p,
                          [field.name]: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-700 focus:outline-none focus:border-[#00FF41] transition-colors"
                    />
                  </div>
                ))}

                {/* Delivery address */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2">
                    Delivery Address
                  </p>
                  <div className="space-y-2">
                    <input
                      type="text"
                      required
                      placeholder="Street address"
                      value={checkoutForm.street}
                      onChange={(e) =>
                        setCheckoutForm((p) => ({
                          ...p,
                          street: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-700 focus:outline-none focus:border-[#00FF41] transition-colors"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="City / Area"
                        value={checkoutForm.city}
                        onChange={(e) =>
                          setCheckoutForm((p) => ({
                            ...p,
                            city: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-700 focus:outline-none focus:border-[#00FF41] transition-colors"
                      />
                      <input
                        type="text"
                        required
                        placeholder="State / LGA"
                        value={checkoutForm.state}
                        onChange={(e) =>
                          setCheckoutForm((p) => ({
                            ...p,
                            state: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-700 focus:outline-none focus:border-[#00FF41] transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {checkoutError && (
                  <p className="text-[#FF3333] text-xs">{checkoutError}</p>
                )}

                <motion.button
                  type="submit"
                  disabled={checkoutState === "loading"}
                  className="w-full py-3.5 rounded-full font-bold uppercase tracking-widest text-sm text-black flex items-center justify-center gap-2"
                  style={{
                    background: "#00FF41",
                    opacity: checkoutState === "loading" ? 0.8 : 1,
                    boxShadow: "0 0 25px rgba(0,255,65,0.4)",
                  }}
                  whileHover={{ scale: checkoutState === "loading" ? 1 : 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {checkoutState === "loading" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Redirecting
                      to Paystack…
                    </>
                  ) : (
                    `Pay ₦${cartTotal.toLocaleString("en-NG")} via Paystack →`
                  )}
                </motion.button>
                <p className="text-gray-700 text-xs text-center">
                  Secured by Paystack. You&apos;ll be redirected to complete
                  payment.
                </p>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CATEGORY FILTER ── */}
      <SectionFadeIn>
        <section className="relative z-10 px-6 pb-4 pt-5">
          <div className="max-w-5xl mx-auto">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className="flex-shrink-0 px-5 py-2 rounded-full text-xs sm:text-sm font-bold uppercase tracking-widest transition-all duration-300 border"
                  style={{
                    borderColor:
                      activeCategory === cat.key
                        ? "#00FF41"
                        : "rgba(255,255,255,0.1)",
                    color:
                      activeCategory === cat.key
                        ? "#00FF41"
                        : "rgba(255,255,255,0.4)",
                    boxShadow:
                      activeCategory === cat.key
                        ? "0 0 15px rgba(0,255,65,0.35)"
                        : "none",
                    background:
                      activeCategory === cat.key
                        ? "rgba(0,255,65,0.08)"
                        : "transparent",
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
            {loadingProducts ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-80 rounded-2xl animate-pulse"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <ShoppingBag className="w-10 h-10 mb-3 text-gray-700" />
                <p className="text-gray-600 text-sm">
                  No products in this category yet.
                </p>
              </div>
            ) : (
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                <AnimatePresence mode="popLayout">
                  {filtered.map((product, pi) => {
                    const inCart = cart.find((i) => i.id === product.id);
                    const glow = glowFrom(product.accent);
                    const isHot = product.id === hotPickId;
                    const isOutOfStock =
                      product.stock !== -1 &&
                      product.soldCount >= product.stock;
                    return (
                      <motion.div
                        key={product.id}
                        layout
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: pi * 0.05, duration: 0.4 }}
                      >
                        <TiltCard
                          className="relative rounded-2xl border overflow-hidden flex flex-col cursor-pointer h-full"
                          style={{
                            borderColor: isHot
                              ? `${product.accent}60`
                              : `${product.accent}25`,
                            background:
                              "linear-gradient(135deg, #0d0d0d, #050505)",
                            boxShadow: isHot
                              ? `0 0 30px ${glow}`
                              : `0 0 15px ${glow}10`,
                            cursor: isOutOfStock ? "default" : "pointer",
                          }}
                          onClick={() =>
                            !isOutOfStock && setSelectedProduct(product)
                          }
                        >
                          {/* Hot Pick badge */}
                          {isHot && (
                            <div
                              className="absolute top-3 left-3 z-10 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                              style={{
                                background: product.accent,
                                color: "#000",
                              }}
                            >
                              <Flame className="w-3 h-3" />
                              Hot Pick
                            </div>
                          )}
                          {product.limited && !isOutOfStock && (
                            <div
                              className="absolute top-3 right-3 z-10 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                              style={{
                                background: product.accent,
                                color: "#000",
                              }}
                            >
                              Limited
                            </div>
                          )}
                          {isOutOfStock && (
                            <div
                              className="absolute top-3 right-3 z-10 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                              style={{ background: "#FF3333", color: "#fff" }}
                            >
                              Sold Out
                            </div>
                          )}

                          {/* Product image */}
                          <div
                            className="h-52 flex items-center justify-center overflow-hidden relative"
                            style={{
                              background: `radial-gradient(circle at 50% 60%, ${glow} 0%, transparent 70%)`,
                            }}
                          >
                            {product.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover transition-transform duration-500"
                                style={{
                                  transformStyle: "preserve-3d",
                                  transform: "translateZ(10px)",
                                }}
                              />
                            ) : (
                              <ShoppingBag
                                className="w-16 h-16 opacity-40"
                                style={{
                                  color: product.accent,
                                  filter: `drop-shadow(0 0 16px ${glow})`,
                                }}
                              />
                            )}
                            {/* Tap hint */}
                            <div
                              className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300"
                              style={{ background: "rgba(0,0,0,0.5)" }}
                            >
                              <span
                                className="text-[10px] uppercase tracking-widest font-bold px-4 py-2 rounded-full border"
                                style={{
                                  borderColor: isOutOfStock
                                    ? "#FF3333"
                                    : product.accent,
                                  color: isOutOfStock
                                    ? "#FF3333"
                                    : product.accent,
                                }}
                              >
                                {isOutOfStock ? "Out of Stock" : "View Details"}
                              </span>
                            </div>
                          </div>

                          <div className="p-5 flex flex-col flex-1">
                            {/* Name + category */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3
                                className="text-base font-bold uppercase tracking-wide leading-tight"
                                style={{
                                  color: product.accent,
                                  textShadow: `0 0 10px ${glow}`,
                                }}
                              >
                                {product.name}
                              </h3>
                              <span
                                className="text-[9px] uppercase tracking-widest flex-shrink-0 px-2 py-0.5 rounded-full border mt-0.5"
                                style={{
                                  borderColor: `${product.accent}40`,
                                  color: `${product.accent}80`,
                                }}
                              >
                                {categoryLabel(product.category)}
                              </span>
                            </div>

                            {/* Description */}
                            <p className="text-gray-500 text-xs leading-relaxed line-clamp-3 flex-1">
                              {product.description}
                            </p>

                            {/* Divider */}
                            <div
                              className="my-3 border-t"
                              style={{ borderColor: `${product.accent}15` }}
                            />

                            {/* Detail stats */}
                            <div className="flex gap-5">
                              <div>
                                <p className="text-[9px] uppercase tracking-widest text-gray-700 mb-0.5">
                                  Stock
                                </p>
                                <p
                                  className="text-[11px] font-bold uppercase tracking-wide"
                                  style={{
                                    color:
                                      product.stock === 0
                                        ? "#FF3333"
                                        : product.stock !== -1 &&
                                            product.stock <= 5
                                          ? "#FFFF00"
                                          : `${product.accent}cc`,
                                  }}
                                >
                                  {product.stock === -1
                                    ? "Available"
                                    : product.stock === 0
                                      ? "Sold Out"
                                      : `${product.stock} left`}
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] uppercase tracking-widest text-gray-700 mb-0.5">
                                  Type
                                </p>
                                <p
                                  className="text-[11px] font-bold uppercase tracking-wide"
                                  style={{ color: `${product.accent}cc` }}
                                >
                                  {product.limited ? "Limited" : "Open"}
                                </p>
                              </div>
                            </div>

                            {/* Price + cart icon */}
                            <div className="flex items-center justify-between mt-4">
                              <span className="text-white font-bold text-xl">
                                {fmt(product.price)}
                              </span>
                              {isOutOfStock ? (
                                <div className="relative">
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      showOutOfStockTooltip(product.id!);
                                    }}
                                    className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full cursor-default"
                                    style={{
                                      background: "rgba(255,51,51,0.1)",
                                      color: "#FF3333",
                                      border: "1px solid rgba(255,51,51,0.2)",
                                    }}
                                  >
                                    Sold Out
                                  </span>
                                  {tooltipProductId === product.id && (
                                    <div
                                      className="absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap pointer-events-none"
                                      style={{
                                        background: "#FF3333",
                                        color: "#fff",
                                        boxShadow:
                                          "0 0 12px rgba(255,51,51,0.5)",
                                      }}
                                    >
                                      Out of Stock
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <motion.button
                                  onClick={(e) => addToCart(product, e)}
                                  className="relative w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0"
                                  style={{
                                    borderColor: product.accent,
                                    color: inCart ? "#000" : product.accent,
                                    background: inCart
                                      ? product.accent
                                      : "transparent",
                                    boxShadow: `0 0 12px ${glow}40`,
                                  }}
                                  whileHover={{
                                    scale: 1.12,
                                    boxShadow: `0 0 22px ${glow}`,
                                  }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <ShoppingCart className="w-4 h-4" />
                                  {inCart && (
                                    <span
                                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                                      style={{
                                        background: "#000",
                                        color: product.accent,
                                        border: `1.5px solid ${product.accent}`,
                                      }}
                                    >
                                      {inCart.qty}
                                    </span>
                                  )}
                                </motion.button>
                              )}
                            </div>
                          </div>
                        </TiltCard>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </section>
      </SectionFadeIn>

      {/* ── PRODUCT DETAIL MODAL ── */}
      <AnimatePresence>
        {selectedProduct &&
          (() => {
            const p = selectedProduct;
            const glow = glowFrom(p.accent);
            const isHot = p.id === hotPickId;
            const inCart = cart.find((i) => i.id === p.id);
            return (
              <motion.div
                className="fixed inset-0 z-[250] flex items-center justify-center px-4 py-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div
                  className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                  onClick={() => setSelectedProduct(null)}
                />
                <motion.div
                  className="relative w-full max-w-3xl rounded-2xl border overflow-hidden flex flex-col"
                  style={{
                    background: "linear-gradient(145deg, #0d0d0d, #060606)",
                    borderColor: `${p.accent}40`,
                    boxShadow: `0 0 60px ${glow}, 0 0 120px ${glow}30`,
                    maxHeight: "90vh",
                  }}
                  initial={{ scale: 0.92, y: 30 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.92, y: 30 }}
                  transition={{ type: "spring", damping: 26, stiffness: 280 }}
                >
                  {/* Close */}
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full border flex items-center justify-center transition-all hover:border-white/40 hover:text-white"
                    style={{
                      borderColor: "rgba(255,255,255,0.15)",
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="overflow-y-auto flex-1">
                    {/* Top: image + details */}
                    <div className="flex flex-col md:flex-row">
                      {/* 3D image panel */}
                      <div
                        className="md:w-[45%] flex-shrink-0 flex items-center justify-center p-8 relative overflow-hidden"
                        style={{
                          background: `radial-gradient(circle at 50% 50%, ${glow} 0%, transparent 65%)`,
                          minHeight: "280px",
                          perspective: "800px",
                        }}
                        onMouseMove={handleModalImageMove}
                        onMouseLeave={() => setModalTilt({ x: 0, y: 0 })}
                      >
                        <motion.div
                          className="w-full h-full flex items-center justify-center relative"
                          animate={{
                            rotateX: modalTilt.x,
                            rotateY: modalTilt.y,
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 200,
                            damping: 20,
                          }}
                          style={{ transformStyle: "preserve-3d" }}
                        >
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-full max-h-[260px] object-contain rounded-xl"
                              style={{
                                filter: `drop-shadow(0 0 30px ${glow})`,
                              }}
                            />
                          ) : (
                            <ShoppingBag
                              className="w-24 h-24 opacity-30"
                              style={{
                                color: p.accent,
                                filter: `drop-shadow(0 0 20px ${glow})`,
                              }}
                            />
                          )}
                          {/* Floating shine layer */}
                          <div
                            className="absolute inset-0 rounded-xl pointer-events-none"
                            style={{
                              background: `linear-gradient(135deg, ${p.accent}15 0%, transparent 50%)`,
                              transform: "translateZ(20px)",
                            }}
                          />
                        </motion.div>

                        {/* Decorative neon corner lines */}
                        <div
                          className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 rounded-tl-lg"
                          style={{ borderColor: p.accent, opacity: 0.5 }}
                        />
                        <div
                          className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 rounded-br-lg"
                          style={{ borderColor: p.accent, opacity: 0.5 }}
                        />
                      </div>

                      {/* Details panel */}
                      <div
                        className="flex-1 p-6 md:p-8 flex flex-col justify-between border-t md:border-t-0 md:border-l"
                        style={{ borderColor: `${p.accent}20` }}
                      >
                        {/* Badges */}
                        <div className="flex gap-2 flex-wrap mb-4">
                          <span
                            className="text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full border"
                            style={{
                              borderColor: `${p.accent}40`,
                              color: `${p.accent}90`,
                            }}
                          >
                            {categoryLabel(p.category)}
                          </span>
                          {isHot && (
                            <span
                              className="text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1"
                              style={{ background: p.accent, color: "#000" }}
                            >
                              <Flame className="w-2.5 h-2.5" />
                              Hot Pick
                            </span>
                          )}
                          {p.limited && (
                            <span
                              className="text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full"
                              style={{ background: p.accent, color: "#000" }}
                            >
                              Limited
                            </span>
                          )}
                        </div>

                        <h2
                          className="text-2xl sm:text-3xl font-bold uppercase tracking-wide leading-tight"
                          style={{
                            color: p.accent,
                            textShadow: `0 0 20px ${glow}`,
                          }}
                        >
                          {p.name}
                        </h2>

                        <p className="text-gray-400 text-sm leading-relaxed mt-3 flex-1">
                          {p.description}
                        </p>

                        {/* Stats row */}
                        <div className="flex gap-5 mt-4">
                          {p.soldCount > 0 && (
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-gray-600">
                                Sold
                              </p>
                              <p className="text-white text-sm font-bold">
                                {p.soldCount}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-gray-600">
                              Stock
                            </p>
                            <p className="text-white text-sm font-bold">
                              {p.stock === -1
                                ? "Unlimited"
                                : p.stock > 0
                                  ? `${p.stock} left`
                                  : "Out of stock"}
                            </p>
                          </div>
                        </div>

                        {/* Price + CTA */}
                        <div className="flex items-center justify-between mt-6">
                          <span
                            className="text-3xl font-bold"
                            style={{
                              color: p.accent,
                              textShadow: `0 0 15px ${glow}`,
                            }}
                          >
                            {fmt(p.price)}
                          </span>

                          <div className="flex items-center gap-3">
                            {/* Qty stepper when in cart */}
                            {inCart && (
                              <div
                                className="flex items-center gap-1 rounded-full border px-1 py-1"
                                style={{ borderColor: `${p.accent}40` }}
                              >
                                <motion.button
                                  onClick={() =>
                                    updateQty(p.id!, inCart.qty - 1)
                                  }
                                  className="w-7 h-7 rounded-full flex items-center justify-center"
                                  style={{ color: p.accent }}
                                  whileHover={{ scale: 1.15 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <Minus className="w-3 h-3" />
                                </motion.button>
                                <span
                                  className="text-xs font-bold min-w-[20px] text-center"
                                  style={{ color: p.accent }}
                                >
                                  {inCart.qty}
                                </span>
                                <motion.button
                                  onClick={(e) => addToCart(p, e)}
                                  className="w-7 h-7 rounded-full flex items-center justify-center"
                                  style={{ color: p.accent }}
                                  whileHover={{ scale: 1.15 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <Plus className="w-3 h-3" />
                                </motion.button>
                              </div>
                            )}

                            {/* Cart icon button */}
                            <motion.button
                              onClick={(e) => addToCart(p, e)}
                              className="relative w-12 h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                              style={{
                                borderColor: p.accent,
                                color: inCart ? "#000" : p.accent,
                                background: inCart ? p.accent : "transparent",
                                boxShadow: `0 0 20px ${glow}`,
                              }}
                              whileHover={{
                                scale: 1.1,
                                boxShadow: `0 0 35px ${glow}`,
                              }}
                              whileTap={{ scale: 0.93 }}
                            >
                              <ShoppingCart className="w-5 h-5" />
                              {inCart && (
                                <span
                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                                  style={{
                                    background: "#000",
                                    color: p.accent,
                                    border: `1.5px solid ${p.accent}`,
                                  }}
                                >
                                  {inCart.qty}
                                </span>
                              )}
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Suggestions */}
                    {suggestions.length > 0 && (
                      <div
                        className="px-6 md:px-8 py-6 border-t"
                        style={{ borderColor: `${p.accent}15` }}
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <Star
                            className="w-3.5 h-3.5"
                            style={{ color: p.accent }}
                          />
                          <p
                            className="text-[10px] uppercase tracking-widest font-bold"
                            style={{ color: p.accent }}
                          >
                            You Might Also Like
                          </p>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                          {suggestions.map((s) => {
                            const sg = glowFrom(s.accent);
                            return (
                              <button
                                key={s.id}
                                onClick={() => setSelectedProduct(s)}
                                className="flex-shrink-0 w-36 rounded-xl border overflow-hidden text-left transition-all hover:scale-105"
                                style={{
                                  borderColor: `${s.accent}30`,
                                  background: "#0a0a0a",
                                  boxShadow: `0 0 10px ${sg}10`,
                                }}
                              >
                                <div
                                  className="h-24 flex items-center justify-center overflow-hidden"
                                  style={{
                                    background: `radial-gradient(circle, ${sg} 0%, transparent 70%)`,
                                  }}
                                >
                                  {s.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={s.imageUrl}
                                      alt={s.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <ShoppingBag
                                      className="w-8 h-8 opacity-30"
                                      style={{ color: s.accent }}
                                    />
                                  )}
                                </div>
                                <div className="p-2.5">
                                  <p className="text-white text-[11px] font-bold line-clamp-1">
                                    {s.name}
                                  </p>
                                  <p
                                    className="text-[10px] mt-0.5"
                                    style={{ color: s.accent }}
                                  >
                                    {fmt(s.price)}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
      </AnimatePresence>

      {/* ── NOTE ── */}
      <SectionFadeIn>
        <section className="py-12 px-6 text-center">
          <p className="text-gray-700 text-xs tracking-widest uppercase max-w-md mx-auto">
            All merch is made to order. Delivery within Lagos takes 5–7 business
            days.
          </p>
        </section>
      </SectionFadeIn>
      <NeonMarquee />
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
                      &ldquo;The Night Tee is everything. Wore it to Edition 2
                      and got stopped three times for photos. Worth every
                      naira.&rdquo;
                    </p>
                    <p
                      className="mt-5 text-xs uppercase tracking-widest"
                      style={{ color: "#00FF41" }}
                    >
                      — Adaeze, Lagos Island
                    </p>
                  </div>
                ),
              },
              {
                id: "r2",
                content: (
                  <div className="text-center px-4 py-6">
                    <Shirt className="w-8 h-8 mx-auto mb-4 text-gray-500" />
                    <p className="text-gray-300 text-base sm:text-lg italic leading-relaxed max-w-xl mx-auto">
                      &ldquo;The Neon Hoodie is genuinely premium — heavyweight
                      fabric, the glow-in-dark print is insane under UV lights.
                      Best merch from any Lagos event.&rdquo;
                    </p>
                    <p
                      className="mt-5 text-xs uppercase tracking-widest"
                      style={{ color: "#00FF41" }}
                    >
                      — Kolade, Victoria Island
                    </p>
                  </div>
                ),
              },
              {
                id: "r3",
                content: (
                  <div className="text-center px-4 py-6">
                    <Flame className="w-8 h-8 mx-auto mb-4 text-gray-500" />
                    <p className="text-gray-300 text-base sm:text-lg italic leading-relaxed max-w-xl mx-auto">
                      &ldquo;Grabbed the Edition 1 Tee as a collectible. Only 50
                      exist — when Dine At Night blows up, this will be vintage.
                      Already framing mine.&rdquo;
                    </p>
                    <p
                      className="mt-5 text-xs uppercase tracking-widest"
                      style={{ color: "#00FF41" }}
                    >
                      — Temi, Surulere
                    </p>
                  </div>
                ),
              },
              {
                id: "r4",
                content: (
                  <div className="text-center px-4 py-6">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-4 text-gray-500" />
                    <p className="text-gray-300 text-base sm:text-lg italic leading-relaxed max-w-xl mx-auto">
                      &ldquo;The Neon Tote is my daily carry. Heavy canvas,
                      holds everything, and the print gets compliments on the
                      street. Dine At Night is a lifestyle now.&rdquo;
                    </p>
                    <p
                      className="mt-5 text-xs uppercase tracking-widest"
                      style={{ color: "#00FF41" }}
                    >
                      — Chioma, Lekki
                    </p>
                  </div>
                ),
              },
            ]}
          />
        </section>
      </SectionFadeIn>
      <NeonMarquee />
      <Footer />
    </div>
  );
}
