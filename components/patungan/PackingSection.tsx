"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/components/providers/ToastProvider";
import EmptyState from "@/components/ui/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronDown, CheckCircle2, Circle, Trash2, Sparkles } from "lucide-react";
import type { PackingCategory, PackingItem } from "@/types";

interface PackingSectionProps {
  patunganId: string;
  packingItems: PackingCategory[];
  isOwner: boolean;
  listAnggota: string[];
}

const DEFAULT_CATEGORIES = ["Pakaian", "Perlengkapan Mandi", "Elektronik", "Dokumen", "Obat-obatan"];

// Default suggestions per category (#17)
const CATEGORY_SUGGESTIONS: Record<string, string[]> = {
  "Pakaian": ["Baju ganti", "Celana", "Jaket", "Pakaian dalam", "Sandal", "Sepatu", "Topi"],
  "Perlengkapan Mandi": ["Sikat gigi", "Pasta gigi", "Sabun", "Sampo", "Sunscreen", "Handuk"],
  "Elektronik": ["Charger HP", "Power bank", "Kamera", "Earphone"],
  "Dokumen": ["KTP/SIM", "Tiket pesawat", "Voucher hotel", "Paspor"],
  "Obat-obatan": ["Obat maag", "Obat flu", "P3K", "Minyak angin", "Masker"],
};

export default function PackingSection({
  patunganId,
  packingItems,
  isOwner,
  listAnggota,
}: PackingSectionProps) {
  const { showToast } = useToast();
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});
  const [newItemPic, setNewItemPic] = useState<Record<string, string>>({});

  // Ensure default categories exist
  const categories: PackingCategory[] = DEFAULT_CATEGORIES.map((cat) => {
    const existing = packingItems.find((p) => p.category === cat);
    return existing || { category: cat, items: [] };
  });

  const handleAddItem = async (category: string) => {
    const name = newItemInputs[category]?.trim();
    if (!name) return showToast("Tulis nama barangnya.", "error");

    try {
      const updated = categories.map((cat) => {
        if (cat.category === category) {
          return {
            ...cat,
            items: [
              ...cat.items,
              {
                id: Date.now(),
                name,
                pic: newItemPic[category] || "Semua Orang",
                isDone: false,
              },
            ],
          };
        }
        return cat;
      });
      updateDoc(doc(db, "patungan", patunganId), { packingItems: updated }).catch(() => {
        showToast("Gagal menambah item.", "error");
      });
      setNewItemInputs((prev) => ({ ...prev, [category]: "" }));
      showToast("Item ditambahkan!", "success");
    } catch {
      showToast("Gagal menambah item.", "error");
    }
  };

  const handleToggleItem = async (categoryName: string, itemId: number) => {
    try {
      const updated = categories.map((cat) => {
        if (cat.category === categoryName) {
          return {
            ...cat,
            items: cat.items.map((item) =>
              item.id === itemId ? { ...item, isDone: !item.isDone } : item
            ),
          };
        }
        return cat;
      });
      updateDoc(doc(db, "patungan", patunganId), { packingItems: updated }).catch(() => {
        showToast("Gagal update.", "error");
      });
    } catch {
      showToast("Terjadi kesalahan.", "error");
    }
  };

  // Delete packing item (#8)
  const handleDeleteItem = async (categoryName: string, itemId: number) => {
    try {
      const updated = categories.map((cat) => {
        if (cat.category === categoryName) {
          return {
            ...cat,
            items: cat.items.filter((item) => item.id !== itemId),
          };
        }
        return cat;
      });
      updateDoc(doc(db, "patungan", patunganId), { packingItems: updated }).catch(() => {
        showToast("Gagal hapus item.", "error");
      });
      showToast("Item dihapus.", "success");
    } catch {
      showToast("Terjadi kesalahan.", "error");
    }
  };

  // Add all suggestions for a category (#17)
  const handleAddSuggestions = async (category: string) => {
    const suggestions = CATEGORY_SUGGESTIONS[category];
    if (!suggestions) return;

    try {
      const existingItems = categories.find((c) => c.category === category)?.items || [];
      const existingNames = existingItems.map((i) => i.name.toLowerCase());
      const newItems = suggestions
        .filter((s) => !existingNames.includes(s.toLowerCase()))
        .map((s) => ({
          id: Date.now() + Math.random() * 1000,
          name: s,
          pic: "Semua Orang",
          isDone: false,
        }));

      if (newItems.length === 0) {
        showToast("Semua saran sudah ditambahkan.", "info");
        return;
      }

      const updated = categories.map((cat) => {
        if (cat.category === category) {
          return { ...cat, items: [...cat.items, ...newItems] };
        }
        return cat;
      });

      updateDoc(doc(db, "patungan", patunganId), { packingItems: updated }).catch(() => {
        showToast("Gagal menambah saran.", "error");
      });
      showToast(`${newItems.length} item ditambahkan!`, "success");
    } catch {
      showToast("Gagal menambah saran.", "error");
    }
  };

  const totalItems = categories.reduce((acc, c) => acc + c.items.length, 0);
  const doneItems = categories.reduce(
    (acc, c) => acc + c.items.filter((i) => i.isDone).length,
    0
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Packing List</h3>
          {totalItems > 0 && (
            <p className="text-[11px] text-slate-400">{doneItems}/{totalItems} siap</p>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        {categories.map((cat) => {
          const isOpen = openCategory === cat.category;
          const catDone = cat.items.filter((i) => i.isDone).length;
          const hasSuggestions = CATEGORY_SUGGESTIONS[cat.category] && cat.items.length === 0;

          return (
            <div key={cat.category} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => setOpenCategory(isOpen ? null : cat.category)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-800">{cat.category}</span>
                  {cat.items.length > 0 && (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                      catDone === cat.items.length && cat.items.length > 0
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-slate-50 text-slate-400"
                    }`}>
                      {catDone}/{cat.items.length}
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Category Content */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2">
                      {/* Suggestions banner (#17) */}
                      {hasSuggestions && (
                        <button
                          onClick={() => handleAddSuggestions(cat.category)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-100 rounded-xl text-xs font-medium text-cyan-600 hover:from-cyan-100 hover:to-blue-100 transition-all"
                        >
                          <Sparkles size={14} /> Tambah saran otomatis
                        </button>
                      )}

                      {/* Items */}
                      {cat.items.map((item) => (
                        <div
                          key={item.id}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group ${
                            item.isDone ? "bg-emerald-50" : "bg-slate-50"
                          }`}
                        >
                          <button onClick={() => handleToggleItem(cat.category, item.id)} className="shrink-0">
                            {item.isDone ? (
                              <CheckCircle2 size={16} className="text-emerald-500" />
                            ) : (
                              <Circle size={16} className="text-slate-300 hover:text-cyan-400 transition-colors" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${item.isDone ? "text-slate-400 line-through" : "text-slate-700"}`}>
                              {item.name}
                            </p>
                            <p className="text-[10px] text-slate-400">{item.pic}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteItem(cat.category, item.id)}
                            className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}

                      {/* Add Item */}
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={newItemInputs[cat.category] || ""}
                          onChange={(e) =>
                            setNewItemInputs((prev) => ({
                              ...prev,
                              [cat.category]: e.target.value,
                            }))
                          }
                          placeholder="Tambah item..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddItem(cat.category);
                          }}
                          className="flex-1 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-cyan-500"
                        />
                        <button
                          onClick={() => handleAddItem(cat.category)}
                          className="p-2.5 bg-cyan-500 text-white rounded-xl active:scale-95 transition-all"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
