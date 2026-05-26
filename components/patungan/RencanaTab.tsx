"use client";

import { useState, lazy, Suspense } from "react";
import { db, auth, storage } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/providers/ToastProvider";
import { compressImage } from "@/lib/utils";
import TugasSection from "@/components/patungan/TugasSection";
import PackingSection from "@/components/patungan/PackingSection";
import VotingSection from "@/components/patungan/VotingSection";
import ExpenseSplitting from "@/components/patungan/ExpenseSplitting";
import ExportItinerary from "@/components/patungan/ExportItinerary";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmModal from "@/components/ui/ConfirmModal";
import ReactionBar from "@/components/patungan/ReactionBar";
import { logActivity } from "@/lib/logActivity";
import {
  Plus,
  X,
  Calendar,
  Clock,
  MapPin,
  Car,
  Camera,
  Link as LinkIcon,
  FileText,
  ChevronRight,
  Trash2,
  DollarSign,
  Users,
  TrendingUp,
  Navigation,
  Map as MapIcon,
  Vote,
  Receipt,
  Share2,
  Pencil,
} from "lucide-react";
import type { Task, PackingCategory, RundownItem, ItineraryItem, BudgetCategory, VoteOption } from "@/types";
import { BUDGET_CATEGORIES as CATEGORIES } from "@/types";
import { formatRupiah } from "@/lib/formatCurrency";

// Lazy load MapPicker (#22) — only loaded when user wants to add location
const MapPicker = lazy(() => import("@/components/MapPicker"));

interface RencanaTabProps {
  patunganId: string;
  isTrip: boolean;
  isOwner: boolean;
  rundown: RundownItem[];
  itinerary: ItineraryItem[];
  tasks: Task[];
  packingItems: PackingCategory[];
  listAnggota: string[];
  tanggalMulai?: any;
  tanggalSelesai?: any;
  jumlahAnggota?: number;
  votes?: VoteOption[];
  expenses?: any[];
  currentUsername?: string;
  namaPatungan?: string;
}

export default function RencanaTab({
  patunganId,
  isTrip,
  isOwner,
  rundown = [],
  itinerary = [],
  tasks = [],
  packingItems = [],
  listAnggota,
  tanggalMulai,
  tanggalSelesai,
  jumlahAnggota = 1,
  votes = [],
  expenses = [],
  currentUsername = "",
  namaPatungan = "",
}: RencanaTabProps) {
  const { showToast } = useToast();
  const [tripTab, setTripTab] = useState<"rundown" | "tugas" | "packing" | "voting" | "expenses">("rundown");
  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RundownItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [editingItem, setEditingItem] = useState<RundownItem | null>(null);
  const [editForm, setEditForm] = useState({
    tanggal: "", waktu: "", aktivitas: "", lokasi: "",
    biaya: "", kategori: "aktivitas" as BudgetCategory,
    transport: "", catatan: "", linkExternal: "",
  });

  // Rundown form state
  const [rTanggal, setRTanggal] = useState("");
  const [rWaktu, setRWaktu] = useState("");
  const [rAktivitas, setRAktivitas] = useState("");
  const [rLokasi, setRLokasi] = useState("");
  const [rBiaya, setRBiaya] = useState("");
  const [rKategori, setRKategori] = useState<BudgetCategory>("aktivitas");
  const [rTransport, setRTransport] = useState("");
  const [rFoto, setRFoto] = useState("");
  const [rLink, setRLink] = useState("");
  const [rCatatan, setRCatatan] = useState("");
  const [rLocation, setRLocation] = useState({ address: "", lat: 0, lng: 0 });
  const [uploading, setUploading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Budget form state (non-trip)
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetName, setBudgetName] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");

  const handleUploadFoto = async (file: File) => {
    setUploading(true);
    try {
      const compressed = await compressImage(file, 1200, 0.8);
      const storageRef = ref(storage, `rundown/${Date.now()}-${compressed.name}`);
      const snapshot = await uploadBytes(storageRef, compressed);
      const url = await getDownloadURL(snapshot.ref);
      return url;
    } catch {
      showToast("Gagal upload foto.", "error");
      return "";
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setRTanggal("");
    setRWaktu("");
    setRAktivitas("");
    setRLokasi("");
    setRBiaya("");
    setRKategori("aktivitas");
    setRTransport("");
    setRFoto("");
    setRLink("");
    setRCatatan("");
    setRLocation({ address: "", lat: 0, lng: 0 });
    setShowForm(false);
    setShowMapPicker(false);
  };

  const handleAddRundown = async () => {
    if (!rWaktu || !rAktivitas || !rTanggal) {
      return showToast("Tanggal, jam, dan aktivitas wajib diisi.", "error");
    }
    try {
      const docRef = doc(db, "patungan", patunganId);
      updateDoc(docRef, {
        rundown: arrayUnion({
          id: Date.now().toString(),
          tanggal: rTanggal,
          waktu: rWaktu,
          aktivitas: rAktivitas,
          lokasi: rLokasi || "-",
          biaya: parseInt(rBiaya) || 0,
          kategori: rKategori,
          transport: rTransport || "-",
          foto: rFoto,
          linkExternal: rLink,
          catatan: rCatatan,
          location: rLocation.lat ? rLocation : null,
          createdAt: new Date(),
        }),
      }).catch(() => showToast("Gagal menyimpan jadwal.", "error"));
      
      resetForm();
      showToast("Jadwal ditambahkan!", "success");

      // Log activity
      logActivity({
        patunganId,
        type: "rundown_added",
        actor: currentUsername || "Anggota",
        description: `menambahkan jadwal: ${rAktivitas}`,
      });
    } catch {
      showToast("Gagal menyimpan jadwal.", "error");
    }
  };

  const startEditing = (item: RundownItem) => {
    setEditingItem(item);
    setEditForm({
      tanggal: item.tanggal || "",
      waktu: item.waktu || "",
      aktivitas: item.aktivitas || "",
      lokasi: item.lokasi || "",
      biaya: String(item.biaya || ""),
      kategori: (item.kategori as BudgetCategory) || "aktivitas",
      transport: item.transport || "",
      catatan: item.catatan || "",
      linkExternal: item.linkExternal || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    if (!editForm.waktu || !editForm.aktivitas || !editForm.tanggal) {
      return showToast("Tanggal, jam, dan aktivitas wajib diisi.", "error");
    }
    try {
      const updated = rundown.map((r) =>
        r.id === editingItem.id
          ? {
              ...r,
              tanggal: editForm.tanggal,
              waktu: editForm.waktu,
              aktivitas: editForm.aktivitas,
              lokasi: editForm.lokasi || "-",
              biaya: parseInt(editForm.biaya) || 0,
              kategori: editForm.kategori,
              transport: editForm.transport || "-",
              catatan: editForm.catatan,
              linkExternal: editForm.linkExternal,
            }
          : r
      );
      updateDoc(doc(db, "patungan", patunganId), { rundown: updated }).catch(() => {
        showToast("Gagal update jadwal.", "error");
      });
      
      setEditingItem(null);
      setSelectedItem(null);
      showToast("Jadwal diperbarui!", "success");

      // Log activity
      logActivity({
        patunganId,
        type: "rundown_edited",
        actor: currentUsername || "Anggota",
        description: `mengubah jadwal: ${editForm.aktivitas}`,
      });
    } catch {
      showToast("Gagal update jadwal.", "error");
    }
  };

  const handleToggleReaction = async (itemId: string, emoji: string) => {
    try {
      const updated = rundown.map((r) => {
        if (r.id !== itemId) return r;
        const reactions = { ...(r.reactions || {}) };

        // Check if user already reacted with this emoji
        const currentUsers = reactions[emoji] ? [...reactions[emoji]] : [];
        const alreadyReacted = currentUsers.includes(currentUsername);

        // Remove user from ALL emojis first (exclusive: 1 reaction per person)
        for (const key of Object.keys(reactions)) {
          reactions[key] = (reactions[key] || []).filter((u: string) => u !== currentUsername);
        }

        // If they clicked the same emoji, it's a toggle-off (already removed above)
        // If they clicked a different emoji, add them to the new one
        if (!alreadyReacted) {
          reactions[emoji] = [...(reactions[emoji] || []), currentUsername];
        }

        return { ...r, reactions };
      });
      updateDoc(doc(db, "patungan", patunganId), { rundown: updated }).catch(() => {
        showToast("Gagal update reaksi.", "error");
      });
    } catch {
      showToast("Terjadi kesalahan.", "error");
    }
  };

  const handleDeleteRundown = async () => {
    if (!deleteTarget) return;
    try {
      const item = rundown.find((r) => r.id === deleteTarget);
      if (item?.foto?.includes("firebasestorage")) {
        try {
          await deleteObject(ref(storage, item.foto));
        } catch { /* ignore */ }
      }
      const updated = rundown.filter((r) => r.id !== deleteTarget);
      updateDoc(doc(db, "patungan", patunganId), { rundown: updated }).catch(() => {
        showToast("Gagal hapus jadwal.", "error");
      });
      
      setDeleteTarget(null);
      setSelectedItem(null);
      showToast("Jadwal dihapus!", "success");

      // Log activity
      if (item) {
        logActivity({
          patunganId,
          type: "rundown_deleted",
          actor: currentUsername || "Anggota",
          description: `menghapus jadwal: ${item.aktivitas}`,
        });
      }
    } catch {
      showToast("Gagal hapus jadwal.", "error");
    }
  };

  const handleAddBudget = async () => {
    if (!budgetName || !budgetAmount) return showToast("Isi nama dan biayanya.", "error");
    try {
      await updateDoc(doc(db, "patungan", patunganId), {
        itinerary: arrayUnion({
          kegiatan: budgetName,
          estimasiBiaya: parseInt(budgetAmount.replace(/\D/g, "")),
          waktu: new Date(),
        }),
      });
      setBudgetName("");
      setBudgetAmount("");
      setShowBudgetForm(false);
      showToast("Budget ditambahkan!", "success");
    } catch {
      showToast("Gagal menyimpan.", "error");
    }
  };

  const handleDeleteBudget = async (index: number) => {
    try {
      const updated = itinerary.filter((_, i) => i !== index);
      await updateDoc(doc(db, "patungan", patunganId), { itinerary: updated });
      showToast("Item dihapus.", "success");
    } catch {
      showToast("Gagal hapus item.", "error");
    }
  };

  // Group rundown by date
  const groupedRundown = rundown.reduce((acc: Record<string, RundownItem[]>, item) => {
    const key = item.tanggal || "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedRundown).sort();

  // Budget calculations — biaya yang diinput sudah per-item (bukan per-orang)
  const totalBudget = rundown.reduce((acc, item) => acc + (item.biaya || 0), 0);

  // Compute cumulative running total for each item across all days (#7)
  const allItemsSorted = [...rundown].sort((a, b) => {
    const dateCmp = (a.tanggal || "").localeCompare(b.tanggal || "");
    if (dateCmp !== 0) return dateCmp;
    return (a.waktu || "").localeCompare(b.waktu || "");
  });
  const runningTotalMap = new Map<string, number>();
  let runningSum = 0;
  for (const item of allItemsSorted) {
    runningSum += item.biaya || 0;
    runningTotalMap.set(item.id, runningSum);
  }

  // Budget by category
  const budgetByCategory = rundown.reduce((acc: Record<string, number>, item) => {
    const cat = item.kategori || "lainnya";
    acc[cat] = (acc[cat] || 0) + (item.biaya || 0);
    return acc;
  }, {});

  // ===================== TRIP MODE =====================
  if (isTrip) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Sub-nav */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {[
            { id: "rundown" as const, label: "Rundown", icon: <Calendar size={14} /> },
            { id: "tugas" as const, label: "Tugas", icon: <FileText size={14} /> },
            { id: "packing" as const, label: "Packing", icon: <span className="text-sm">🎒</span> },
            { id: "voting" as const, label: "Voting", icon: <Vote size={14} /> },
            { id: "expenses" as const, label: "Expenses", icon: <Receipt size={14} /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTripTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                tripTab === t.id
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-400 border border-slate-200"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ===== RUNDOWN TAB ===== */}
          {tripTab === "rundown" && (
            <motion.div key="rundown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* ===== BUDGET SUMMARY CARD ===== */}
              {totalBudget > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-5 rounded-2xl text-white relative overflow-hidden"
                >
                  {/* Decorative gradient orb */}
                  <div className="absolute -top-8 -right-8 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl" />
                  <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />

                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp size={14} className="text-cyan-400" />
                      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Budget Trip</span>
                    </div>
                    <p className="text-2xl font-bold mb-1">
                      Rp {totalBudget.toLocaleString("id-ID")}
                    </p>
                    <p className="text-xs text-slate-400">
                      {rundown.length} aktivitas · {sortedDates.length} hari
                    </p>

                    {/* Category breakdown */}
                    {Object.keys(budgetByCategory).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {Object.entries(budgetByCategory).map(([cat, amount]) => {
                          const config = CATEGORIES[cat as BudgetCategory] || CATEGORIES.lainnya;
                          return (
                            <span key={cat} className="flex items-center gap-1.5 text-[10px] font-medium bg-white/10 text-slate-300 px-2.5 py-1.5 rounded-lg backdrop-blur-sm">
                              <span>{config.icon}</span>
                              <span>{config.label}</span>
                              <span className="text-white font-semibold">Rp {amount.toLocaleString("id-ID")}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Add button */}
              <button
                onClick={() => setShowForm(!showForm)}
                className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 mb-6 ${
                  showForm
                    ? "bg-slate-200 text-slate-500"
                    : "bg-slate-900 text-white active:scale-[0.98]"
                }`}
              >
                {showForm ? <><X size={16} /> Tutup Form</> : <><Plus size={16} /> Tambah Jadwal</>}
              </button>

              {/* Form */}
              <AnimatePresence>
                {showForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white p-5 rounded-2xl border border-slate-200 mb-6 space-y-4 overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Tanggal</label>
                        <input type="date" value={rTanggal} onChange={(e) => setRTanggal(e.target.value)}
                          className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500" />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Waktu</label>
                        <input type="time" value={rWaktu} onChange={(e) => setRWaktu(e.target.value)}
                          className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Aktivitas</label>
                      <input type="text" value={rAktivitas} onChange={(e) => setRAktivitas(e.target.value)}
                        placeholder="Snorkeling & Lunch" className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Lokasi</label>
                        <input type="text" value={rLokasi} onChange={(e) => setRLokasi(e.target.value)}
                          placeholder="Coral Island" className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500" />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Biaya (Rp)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={rBiaya ? parseInt(rBiaya).toLocaleString("id-ID") : ""}
                          onChange={(e) => setRBiaya(e.target.value.replace(/\D/g, ""))}
                          placeholder="0"
                          className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    {/* Budget Category */}
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Kategori Budget</label>
                      <div className="flex flex-wrap gap-2">
                        {(Object.entries(CATEGORIES) as [BudgetCategory, typeof CATEGORIES[BudgetCategory]][]).map(([key, config]) => (
                          <button
                            key={key}
                            onClick={() => setRKategori(key)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                              rKategori === key
                                ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                                : "border-slate-200 bg-white text-slate-500"
                            }`}
                          >
                            <span>{config.icon}</span> {config.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Transport</label>
                      <input type="text" value={rTransport} onChange={(e) => setRTransport(e.target.value)}
                        placeholder="Speedboat" className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500" />
                    </div>

                    {/* Photo upload */}
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Foto</label>
                      <label className={`flex items-center justify-center w-full py-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                        rFoto ? "border-cyan-400 bg-cyan-50/30" : "border-slate-200 hover:border-slate-300"
                      }`}>
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) { const url = await handleUploadFoto(file); setRFoto(url); }
                        }} />
                        {uploading ? (
                          <span className="text-xs font-medium text-cyan-600">Uploading...</span>
                        ) : rFoto ? (
                          <img src={rFoto} alt="Preview" className="max-h-24 rounded-lg object-cover" />
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400">
                            <Camera size={18} /> <span className="text-xs font-medium">Pilih foto</span>
                          </div>
                        )}
                      </label>
                    </div>

                    {/* Map Picker — Lazy Loaded (#22) */}
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Lokasi Maps</label>
                      {showMapPicker ? (
                        <Suspense fallback={
                          <div className="w-full h-[200px] bg-slate-100 rounded-2xl animate-pulse flex items-center justify-center">
                            <span className="text-xs text-slate-400">Memuat peta...</span>
                          </div>
                        }>
                          <MapPicker
                            currentLocation={rLocation}
                            onLocationChange={(loc) => {
                              setRLocation(loc);
                              if (loc.address) setRLokasi(loc.address);
                            }}
                            variant="light"
                          />
                        </Suspense>
                      ) : (
                        <button
                          onClick={() => setShowMapPicker(true)}
                          className="w-full py-3 border border-dashed border-slate-200 rounded-xl text-xs font-medium text-slate-400 hover:border-cyan-400 hover:text-cyan-500 transition-all flex items-center justify-center gap-2"
                        >
                          <MapIcon size={14} /> Tambah Lokasi Maps
                        </button>
                      )}
                    </div>

                    {/* Link */}
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Link Info</label>
                      <input type="text" value={rLink} onChange={(e) => setRLink(e.target.value)}
                        placeholder="Link review TikTok / Menu" className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500" />
                    </div>

                    {/* Catatan */}
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Catatan</label>
                      <textarea value={rCatatan} onChange={(e) => setRCatatan(e.target.value)}
                        placeholder="Tips: Bawa sunscreen" className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500 resize-none h-20" />
                    </div>

                    <button onClick={handleAddRundown}
                      className="w-full py-3.5 bg-cyan-500 text-white font-semibold rounded-2xl active:scale-[0.98] transition-all">
                      Simpan Jadwal
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ===== TIMELINE ===== */}
              {sortedDates.length > 0 ? (
                <div className="space-y-8">
                  {sortedDates.map((dateKey, dayIndex) => {
                    const items = groupedRundown[dateKey].sort((a, b) =>
                      (a.waktu || "").localeCompare(b.waktu || "")
                    );
                    const dateObj = new Date(dateKey + "T00:00:00");
                    const dateLabel = dateObj.toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    });
                    const dayBudget = items.reduce((acc, item) => acc + (item.biaya || 0), 0);

                    return (
                      <motion.div
                        key={dateKey}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: dayIndex * 0.1 }}
                      >
                        {/* Day Header — Redesigned */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                              <span className="text-sm font-bold text-white">D{dayIndex + 1}</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{dateLabel.split(",")[0]}</p>
                              <p className="text-[11px] text-slate-400">{dateLabel.split(",").slice(1).join(",").trim()}</p>
                            </div>
                          </div>
                          {dayBudget > 0 && (
                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                              Rp {dayBudget.toLocaleString("id-ID")}
                            </span>
                          )}
                        </div>

                        {/* Timeline Items — CSS Grid based (#21) */}
                        <div className="space-y-3 relative">
                          {/* Timeline line */}
                          <div className="absolute left-[19px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-cyan-200 via-slate-200 to-transparent rounded-full" />

                          {items.map((item, itemIndex) => {
                            const catConfig = CATEGORIES[(item.kategori as BudgetCategory) || "lainnya"];
                            const cumulativeTotal = runningTotalMap.get(item.id) || 0;
                            return (
                              <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: itemIndex * 0.05 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedItem(item)}
                                className="grid grid-cols-[40px_1fr] gap-3 cursor-pointer group"
                              >
                                {/* Timeline dot */}
                                <div className="flex flex-col items-center pt-4">
                                  <div className="w-[10px] h-[10px] rounded-full bg-cyan-500 border-2 border-white shadow-sm z-10 group-hover:scale-125 transition-transform" />
                                </div>

                                {/* Card */}
                                <div className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
                                  {/* Photo */}
                                  {item.foto && (
                                    <img
                                      src={item.foto}
                                      alt=""
                                      className="w-full h-32 rounded-xl object-cover mb-3"
                                      loading="lazy"
                                    />
                                  )}

                                  {/* Time + Category */}
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="flex items-center gap-1 text-xs font-semibold text-cyan-600 bg-cyan-50 px-2 py-1 rounded-lg">
                                      <Clock size={11} /> {item.waktu}
                                    </span>
                                    {item.biaya > 0 && (
                                      <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border ${catConfig?.color || "bg-slate-50 text-slate-600 border-slate-100"}`}>
                                        {catConfig?.icon} Rp {item.biaya.toLocaleString("id-ID")}
                                      </span>
                                    )}
                                    {item.transport && item.transport !== "-" && (
                                      <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                                        <Car size={11} /> {item.transport}
                                      </span>
                                    )}
                                  </div>

                                  {/* Title */}
                                  <h4 className="text-sm font-bold text-slate-800 mb-1">
                                    {item.aktivitas}
                                  </h4>

                                  {/* Location */}
                                  {item.lokasi && item.lokasi !== "-" && (
                                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                                      <MapPin size={12} className="text-slate-300" /> {item.lokasi}
                                    </p>
                                  )}

                                  {/* Running total badge (#7) */}
                                  {cumulativeTotal > 0 && (
                                    <div className="flex items-center justify-end mt-2 pt-2 border-t border-slate-50">
                                      <span className="text-[10px] font-semibold text-slate-400">
                                        Total: <span className="text-slate-600">Rp {cumulativeTotal.toLocaleString("id-ID")}</span>
                                      </span>
                                    </div>
                                  )}

                                  {/* Notes preview */}
                                  {item.catatan && (
                                    <p className="text-[11px] text-slate-400 mt-2 line-clamp-1 italic">
                                      💡 {item.catatan}
                                    </p>
                                  )}

                                  {/* Reactions */}
                                  <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                    <ReactionBar
                                      reactions={item.reactions || {}}
                                      currentUsername={currentUsername}
                                      onToggleReaction={(emoji) => handleToggleReaction(item.id, emoji)}
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title="Belum ada jadwal"
                  description="Tambahkan rencana perjalanan pertama. Lengkap dengan budget & lokasi biar gampang dishare ke temen!"
                />
              )}
            </motion.div>
          )}

          {/* ===== TUGAS TAB ===== */}
          {tripTab === "tugas" && (
            <motion.div key="tugas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TugasSection patunganId={patunganId} tasks={tasks} isOwner={isOwner} listAnggota={listAnggota} />
            </motion.div>
          )}

          {/* ===== PACKING TAB ===== */}
          {tripTab === "packing" && (
            <motion.div key="packing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PackingSection patunganId={patunganId} packingItems={packingItems} isOwner={isOwner} listAnggota={listAnggota} />
            </motion.div>
          )}

          {/* ===== VOTING TAB ===== */}
          {tripTab === "voting" && (
            <motion.div key="voting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <VotingSection
                patunganId={patunganId}
                votes={votes}
                currentUsername={currentUsername}
                listAnggota={listAnggota}
              />
            </motion.div>
          )}

          {/* ===== EXPENSES TAB ===== */}
          {tripTab === "expenses" && (
            <motion.div key="expenses" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ExpenseSplitting
                patunganId={patunganId}
                expenses={expenses}
                listAnggota={listAnggota}
                currentUsername={currentUsername}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Export Button — only when there are rundown items */}
        {rundown.length > 0 && (
          <button
            onClick={() => setShowExport(true)}
            className="w-full py-3 mt-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-cyan-500/20"
          >
            <Share2 size={16} /> Export & Share Itinerary
          </button>
        )}

        {/* Export Itinerary Modal */}
        <ExportItinerary
          isOpen={showExport}
          onClose={() => setShowExport(false)}
          namaPatungan={namaPatungan}
          rundown={rundown}
          tanggalMulai={tanggalMulai}
          tanggalSelesai={tanggalSelesai}
          jumlahAnggota={jumlahAnggota}
        />

        {/* Detail Modal — Redesigned */}
        <AnimatePresence>
          {selectedItem && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSelectedItem(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              >
                {/* Drag handle (mobile) */}
                <div className="sm:hidden flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 bg-slate-200 rounded-full" />
                </div>

                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex items-center gap-1 text-xs font-semibold text-cyan-600 bg-cyan-50 px-2 py-1 rounded-lg">
                        <Clock size={11} /> {selectedItem.waktu}
                      </span>
                      <span className="text-xs text-slate-400">{selectedItem.tanggal}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">{selectedItem.aktivitas}</h3>
                  </div>
                  <button onClick={() => setSelectedItem(null)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 text-sm hover:bg-slate-200 transition-colors">✕</button>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto custom-scrollbar space-y-4">
                  {selectedItem.foto && (
                    <img src={selectedItem.foto} alt="" className="w-full h-48 rounded-2xl object-cover" />
                  )}

                  {selectedItem.lokasi && selectedItem.lokasi !== "-" && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <MapPin size={16} className="text-cyan-500 shrink-0" />
                      <p className="text-sm text-slate-700">{selectedItem.location?.address || selectedItem.lokasi}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {selectedItem.biaya > 0 && (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                        <p className="text-[10px] font-medium text-amber-500 mb-0.5">Biaya</p>
                        <p className="text-sm font-bold text-amber-700">Rp {selectedItem.biaya.toLocaleString("id-ID")}</p>
                        {runningTotalMap.get(selectedItem.id) && (
                          <p className="text-[10px] text-amber-500 mt-0.5">
                            Kumulatif: Rp {runningTotalMap.get(selectedItem.id)?.toLocaleString("id-ID")}
                          </p>
                        )}
                      </div>
                    )}
                    {selectedItem.transport && selectedItem.transport !== "-" && (
                      <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                        <p className="text-[10px] font-medium text-purple-500 mb-0.5">Transport</p>
                        <p className="text-sm font-bold text-purple-700">{selectedItem.transport}</p>
                      </div>
                    )}
                  </div>

                  {selectedItem.linkExternal && (
                    <a href={selectedItem.linkExternal} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl text-sm font-medium text-indigo-600 hover:bg-indigo-100 transition-colors border border-indigo-100">
                      <LinkIcon size={14} /> Lihat Info / Review
                    </a>
                  )}

                  {selectedItem.catatan && (
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-[10px] font-medium text-slate-400 mb-1">Catatan</p>
                      <p className="text-sm text-slate-700 whitespace-pre-line">{selectedItem.catatan}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {isOwner && (
                  <div className="p-4 border-t border-slate-100 flex gap-2">
                    <button onClick={() => startEditing(selectedItem)}
                      className="flex-1 py-3 bg-cyan-50 text-cyan-600 font-semibold rounded-xl hover:bg-cyan-100 transition-colors flex items-center justify-center gap-2 text-sm">
                      <Pencil size={16} /> Edit
                    </button>
                    <button onClick={() => setDeleteTarget(selectedItem.id)}
                      className="flex-1 py-3 bg-red-50 text-red-500 font-semibold rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2 text-sm">
                      <Trash2 size={16} /> Hapus
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Modal */}
        <AnimatePresence>
          {editingItem && (
            <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setEditingItem(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              >
                <div className="sm:hidden flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 bg-slate-200 rounded-full" />
                </div>

                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Pencil size={18} className="text-cyan-500" />
                    <h3 className="text-base font-bold text-slate-800">Edit Jadwal</h3>
                  </div>
                  <button onClick={() => setEditingItem(null)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 text-sm">✕</button>
                </div>

                <div className="p-5 overflow-y-auto custom-scrollbar space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Tanggal</label>
                      <input type="date" value={editForm.tanggal} onChange={(e) => setEditForm({ ...editForm, tanggal: e.target.value })}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500" />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Waktu</label>
                      <input type="time" value={editForm.waktu} onChange={(e) => setEditForm({ ...editForm, waktu: e.target.value })}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Aktivitas</label>
                    <input type="text" value={editForm.aktivitas} onChange={(e) => setEditForm({ ...editForm, aktivitas: e.target.value })}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Lokasi</label>
                      <input type="text" value={editForm.lokasi === "-" ? "" : editForm.lokasi} onChange={(e) => setEditForm({ ...editForm, lokasi: e.target.value })}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500" />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Biaya (Rp)</label>
                      <input type="text" inputMode="numeric"
                        value={editForm.biaya ? parseInt(editForm.biaya).toLocaleString("id-ID") : ""}
                        onChange={(e) => setEditForm({ ...editForm, biaya: e.target.value.replace(/\D/g, "") })}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Kategori</label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.entries(CATEGORIES) as [BudgetCategory, typeof CATEGORIES[BudgetCategory]][]).map(([key, config]) => (
                        <button key={key} onClick={() => setEditForm({ ...editForm, kategori: key })}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                            editForm.kategori === key
                              ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                              : "border-slate-200 bg-white text-slate-500"
                          }`}>
                          <span>{config.icon}</span> {config.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Transport</label>
                    <input type="text" value={editForm.transport === "-" ? "" : editForm.transport}
                      onChange={(e) => setEditForm({ ...editForm, transport: e.target.value })}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500" />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Link Info</label>
                    <input type="text" value={editForm.linkExternal}
                      onChange={(e) => setEditForm({ ...editForm, linkExternal: e.target.value })}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500" />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Catatan</label>
                    <textarea value={editForm.catatan}
                      onChange={(e) => setEditForm({ ...editForm, catatan: e.target.value })}
                      rows={2}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500 resize-none" />
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 flex gap-2">
                  <button onClick={() => setEditingItem(null)}
                    className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-semibold rounded-2xl text-sm">Batal</button>
                  <button onClick={handleSaveEdit}
                    className="flex-1 py-3.5 bg-cyan-500 text-white font-semibold rounded-2xl active:scale-[0.98] transition-all text-sm">Simpan</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <ConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteRundown}
          title="Hapus Jadwal?"
          description="Jadwal ini akan dihapus permanen dari timeline."
          confirmText="Hapus"
          variant="danger"
        />
      </motion.div>
    );
  }

  // ===================== BUDGET MODE (non-trip) =====================
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-slate-800">Rincian Budget</h3>
        {isOwner && (
          <button onClick={() => setShowBudgetForm(!showBudgetForm)}
            className="text-xs font-medium text-cyan-600 bg-cyan-50 px-3 py-1.5 rounded-lg">
            {showBudgetForm ? "Batal" : "+ Tambah"}
          </button>
        )}
      </div>

      <AnimatePresence>
        {showBudgetForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 overflow-hidden">
            <input type="text" value={budgetName} onChange={(e) => setBudgetName(e.target.value)}
              placeholder="Nama pengeluaran" className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-cyan-500" />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={budgetAmount ? parseInt(budgetAmount).toLocaleString("id-ID") : ""}
                onChange={(e) => setBudgetAmount(e.target.value.replace(/\D/g, ""))}
                placeholder="500.000"
                className="w-full p-3 pl-10 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-cyan-500"
              />
            </div>
            <button onClick={handleAddBudget} className="w-full py-3 bg-cyan-500 text-white font-semibold rounded-xl active:scale-[0.98] transition-all text-sm">
              Simpan
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {itinerary.length > 0 ? (
        <>
          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-4 rounded-xl flex justify-between items-center text-white">
            <div>
              <span className="text-[11px] font-medium text-cyan-100">Total Estimasi</span>
              <p className="text-lg font-bold">
                Rp {itinerary.reduce((acc, c) => acc + (c.estimasiBiaya || 0), 0).toLocaleString("id-ID")}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-medium text-cyan-100">Per Orang</span>
              <p className="text-sm font-bold">
                Rp {Math.ceil(itinerary.reduce((acc, c) => acc + (c.estimasiBiaya || 0), 0) / jumlahAnggota).toLocaleString("id-ID")}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {itinerary.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center group"
              >
                <p className="text-sm font-medium text-slate-800">{item.kegiatan}</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-700">Rp {item.estimasiBiaya?.toLocaleString("id-ID")}</p>
                  {isOwner && (
                    <button
                      onClick={() => handleDeleteBudget(i)}
                      className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState title="Belum ada budget" description="Tambah rincian pengeluaran project." />
      )}
    </motion.div>
  );
}
