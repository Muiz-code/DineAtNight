"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Package, Flame, ShoppingBag, Eye, EyeOff } from "lucide-react";
import {
  subscribeAllProducts,
  subscribeMerchOrders,
  createProduct,
  updateProduct,
  deleteProduct,
  type DanProduct,
  type DanMerchOrder,
} from "@/lib/firestore";

const ACCENT = "#FFFF00";

const CATEGORIES = [
  { key: "tshirts",  label: "T-Shirts" },
  { key: "hoodies",  label: "Hoodies" },
  { key: "caps",     label: "Caps" },
  { key: "bags",     label: "Tote Bags" },
  { key: "stickers", label: "Stickers" },
  { key: "limited",  label: "Limited" },
];

const ACCENTS = [
  { hex: "#FFFF00", label: "Yellow" },
  { hex: "#00FF41", label: "Green" },
  { hex: "#FF3333", label: "Red" },
];

const EMPTY_FORM: Omit<DanProduct, "id" | "createdAt" | "soldCount"> = {
  name: "",
  price: 0,
  category: "tshirts",
  description: "",
  imageUrl: "",
  accent: "#FFFF00",
  limited: false,
  stock: -1,
};

type TabKey = "all" | string;

const fmt = (n: number) => "₦" + n.toLocaleString("en-NG");

export default function AdminShopPage() {
  const [products, setProducts] = useState<DanProduct[]>([]);
  const [orders, setOrders] = useState<DanMerchOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("all");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<DanProduct | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    return subscribeAllProducts((prods) => {
      setProducts(prods);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    return subscribeMerchOrders((ords) => setOrders(ords));
  }, []);

  // Sold count derived from live orders — excludes returned orders
  const soldMap = useMemo(() => {
    const map: Record<string, number> = {};
    orders
      .filter((o) => o.status === "paid" && o.deliveryStatus !== "returned")
      .forEach((o) => {
        o.items.forEach((item) => {
          map[item.productId] = (map[item.productId] ?? 0) + item.qty;
        });
      });
    return map;
  }, [orders]);

  const hotPickId = useMemo(
    () =>
      products.reduce<string | null>((best, p) => {
        const sold = soldMap[p.id ?? ""] ?? 0;
        if (!p.id || sold === 0) return best;
        if (!best) return p.id;
        return sold > (soldMap[best] ?? 0) ? p.id : best;
      }, null),
    [products, soldMap]
  );

  const filtered =
    tab === "all" ? products : products.filter((p) => p.category === tab);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const openEdit = (p: DanProduct) => {
    setEditTarget(p);
    setForm({
      name:        p.name,
      price:       p.price,
      category:    p.category,
      description: p.description,
      imageUrl:    p.imageUrl,
      accent:      p.accent,
      limited:     p.limited,
      stock:       p.stock,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (saving) return;
    if (!form.name || !form.description || form.price <= 0) return;
    setSaving(true);
    try {
      if (editTarget?.id) {
        await updateProduct(editTarget.id, form);
      } else {
        await createProduct({ ...form, soldCount: 0 });
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await deleteProduct(id);
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (p: DanProduct) => {
    if (!p.id) return;
    await updateProduct(p.id, { active: !(p.active ?? true) });
  };

  const f = (key: keyof typeof form, val: unknown) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold uppercase tracking-widest"
            style={{ color: ACCENT, textShadow: `0 0 20px ${ACCENT}60` }}
          >
            Shop
          </h1>
          <p className="text-gray-600 text-xs mt-0.5">{products.length} products · {products.reduce((s, p) => s + p.soldCount, 0)} total sold</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all"
          style={{ borderColor: ACCENT, color: ACCENT, background: `${ACCENT}10`, boxShadow: `0 0 14px ${ACCENT}30` }}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Product
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 flex-wrap">
        {[{ key: "all", label: "All" }, ...CATEGORIES].map(({ key, label }) => {
          const count = key === "all" ? products.length : products.filter((p) => p.category === key).length;
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border transition-all"
              style={{
                borderColor: active ? ACCENT : "rgba(255,255,255,0.1)",
                color: active ? ACCENT : "rgba(255,255,255,0.4)",
                background: active ? `${ACCENT}12` : "transparent",
                boxShadow: active ? `0 0 10px ${ACCENT}25` : "none",
              }}
            >
              {label}
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: active ? `${ACCENT}25` : "rgba(255,255,255,0.08)", color: active ? ACCENT : "rgba(255,255,255,0.3)" }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl border"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
        >
          <Package className="w-10 h-10 mb-3" style={{ color: "rgba(255,255,255,0.15)" }} />
          <p className="text-gray-600 text-sm">No products yet — add the first one</p>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((p) => {
              const isHot      = p.id === hotPickId;
              const isOff      = p.active === false;
              const catLabel   = CATEGORIES.find((c) => c.key === p.category)?.label ?? p.category;
              const sold       = soldMap[p.id ?? ""] ?? 0;
              const remaining  = p.stock === -1 ? null : Math.max(0, p.stock - sold);
              const isOutOfStock = p.stock !== -1 && remaining !== null && remaining <= 0;
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative rounded-2xl border overflow-hidden"
                  style={{
                    borderColor: isOff ? "rgba(255,255,255,0.04)" : isHot ? `${ACCENT}40` : "rgba(255,255,255,0.07)",
                    boxShadow: isHot && !isOff ? `0 0 24px ${ACCENT}20` : "none",
                    background: "#0a0a0a",
                    opacity: isOff ? 0.55 : 1,
                  }}
                >
                  {/* Top badges */}
                  <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
                    {isHot && !isOff && (
                      <div
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                        style={{ background: ACCENT, color: "#000" }}
                      >
                        <Flame className="w-3 h-3" />
                        Hot Pick
                      </div>
                    )}
                    {isOff && (
                      <div
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                        style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
                      >
                        <EyeOff className="w-3 h-3" />
                        Off Shelf
                      </div>
                    )}
                    {isOutOfStock && !isOff && (
                      <div
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                        style={{ background: "rgba(255,51,51,0.15)", color: "#FF3333", border: "1px solid #FF333330" }}
                      >
                        Out of Stock
                      </div>
                    )}
                  </div>

                  {/* Image */}
                  <div className="aspect-video relative" style={{ background: "rgba(255,255,255,0.03)" }}>
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ color: p.accent }}>
                        <ShoppingBag className="w-12 h-12 opacity-30" />
                      </div>
                    )}
                    {/* Quick-action hover buttons */}
                    <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => openEdit(p)}
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.15)" }}
                      >
                        <Pencil className="w-3.5 h-3.5 text-white" />
                      </button>
                      <button
                        onClick={() => setDeleteId(p.id!)}
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,51,51,0.8)" }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-white text-sm font-bold leading-tight">{p.name}</p>
                      <p className="text-sm font-bold flex-shrink-0" style={{ color: p.accent }}>{fmt(p.price)}</p>
                    </div>
                    <p className="text-gray-600 text-xs line-clamp-2">{p.description}</p>

                    {/* Category + Limited badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
                        style={{ background: `${p.accent}15`, color: p.accent, border: `1px solid ${p.accent}30` }}
                      >
                        {catLabel}
                      </span>
                      {p.limited && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest" style={{ background: "#FF333315", color: "#FF3333", border: "1px solid #FF333330" }}>
                          Limited
                        </span>
                      )}
                    </div>

                    {/* Stock info row */}
                    <div
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-widest"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <span style={{ color: sold > 0 ? ACCENT : "rgba(255,255,255,0.3)" }}>
                        {sold} sold
                      </span>
                      <span className="text-gray-700">·</span>
                      <span style={{ color: "rgba(255,255,255,0.4)" }}>
                        Stock: {p.stock === -1 ? "∞" : p.stock}
                      </span>
                      <span className="text-gray-700">·</span>
                      <span style={{
                        color: isOutOfStock ? "#FF3333" : remaining !== null && remaining <= 5 ? "#FFFF00" : "#00FF41",
                      }}>
                        {remaining === null ? "∞ left" : isOutOfStock ? "None left" : `${remaining} left`}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all"
                        style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(p)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all"
                        style={{
                          borderColor: isOff ? "rgba(0,255,65,0.25)" : "rgba(255,255,255,0.1)",
                          color: isOff ? "#00FF41" : "rgba(255,255,255,0.4)",
                        }}
                      >
                        {isOff ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {isOff ? "Put On" : "Take Off"}
                      </button>
                      <button
                        onClick={() => setDeleteId(p.id!)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all"
                        style={{ borderColor: "rgba(255,51,51,0.2)", color: "#FF3333" }}
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Add / Edit Modal ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div
              className="relative w-full max-w-lg rounded-2xl border p-6 space-y-4 overflow-y-auto max-h-[90vh]"
              style={{ background: "#0d0d0d", borderColor: `${ACCENT}30` }}
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 16 }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: ACCENT }}>
                  {editTarget ? "Edit Product" : "Add Product"}
                </h2>
                <button onClick={() => setShowModal(false)}>
                  <X className="w-4 h-4 text-gray-600 hover:text-white transition-colors" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Name */}
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-gray-600">Name *</label>
                  <input
                    type="text"
                    placeholder="Night Tee"
                    value={form.name}
                    onChange={(e) => f("name", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-white border outline-none placeholder-gray-700"
                    style={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,0.1)" }}
                  />
                </div>

                {/* Price */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-gray-600">Price (₦) *</label>
                  <input
                    type="number"
                    placeholder="8500"
                    value={form.price || ""}
                    onChange={(e) => f("price", Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-white border outline-none placeholder-gray-700"
                    style={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,0.1)" }}
                  />
                </div>

                {/* Stock */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-gray-600">Stock (-1 = ∞)</label>
                  <input
                    type="number"
                    placeholder="-1"
                    value={form.stock}
                    onChange={(e) => f("stock", Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-white border outline-none placeholder-gray-700"
                    style={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,0.1)" }}
                  />
                </div>

                {/* Category */}
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-gray-600">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => f("category", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-white border outline-none"
                    style={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,0.1)" }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-gray-600">Description *</label>
                  <textarea
                    placeholder="Classic black tee with neon DAN logo. 100% cotton."
                    value={form.description}
                    onChange={(e) => f("description", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-white border outline-none placeholder-gray-700 resize-none"
                    style={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,0.1)" }}
                  />
                </div>

                {/* Image URL */}
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-gray-600">Image URL</label>
                  <input
                    type="url"
                    placeholder="https://…/product.jpg"
                    value={form.imageUrl}
                    onChange={(e) => f("imageUrl", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-white border outline-none placeholder-gray-700"
                    style={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,0.1)" }}
                  />
                  {form.imageUrl && (
                    <div className="mt-1.5 h-24 rounded-lg overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Accent color */}
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-gray-600">Accent Color</label>
                  <div className="flex gap-2">
                    {ACCENTS.map(({ hex, label }) => (
                      <button
                        key={hex}
                        onClick={() => f("accent", hex)}
                        className="flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all"
                        style={{
                          borderColor: form.accent === hex ? hex : "rgba(255,255,255,0.1)",
                          color: form.accent === hex ? hex : "rgba(255,255,255,0.4)",
                          background: form.accent === hex ? `${hex}15` : "transparent",
                          boxShadow: form.accent === hex ? `0 0 10px ${hex}30` : "none",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Limited toggle */}
                <div className="col-span-2 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-gray-600">Limited Edition</span>
                  <button
                    onClick={() => f("limited", !form.limited)}
                    className="w-11 h-6 rounded-full relative transition-all"
                    style={{ background: form.limited ? "#FF3333" : "rgba(255,255,255,0.1)" }}
                  >
                    <div
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                      style={{ left: form.limited ? "calc(100% - 22px)" : "2px" }}
                    />
                  </button>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.description || form.price <= 0}
                className="w-full py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-40"
                style={{ background: ACCENT, color: "#000" }}
              >
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Add Product"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirm ── */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
            <motion.div
              className="relative w-full max-w-xs rounded-2xl border p-6 text-center space-y-4"
              style={{ background: "#0d0d0d", borderColor: "rgba(255,51,51,0.3)" }}
              initial={{ scale: 0.94 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.94 }}
            >
              <p className="text-white text-sm font-semibold">Delete this product?</p>
              <p className="text-gray-600 text-xs">This cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border"
                  style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                  style={{ background: "#FF3333", color: "#fff" }}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
