"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/providers/ToastProvider";
import { X, Save } from "lucide-react";

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  patunganId: string;
  currentData: {
    namaPatungan: string;
    deskripsi: string;
    tanggalMulai?: any;
    tanggalSelesai?: any;
    paymentDeadline?: any;
  };
}

export default function EditProjectModal({
  isOpen,
  onClose,
  patunganId,
  currentData,
}: EditProjectModalProps) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [nama, setNama] = useState(currentData.namaPatungan);
  const [deskripsi, setDeskripsi] = useState(currentData.deskripsi);
  const [tanggalMulai, setTanggalMulai] = useState(() => {
    if (!currentData.tanggalMulai) return "";
    const d = currentData.tanggalMulai?.toDate?.() || new Date(currentData.tanggalMulai);
    return d.toISOString().split("T")[0];
  });
  const [tanggalSelesai, setTanggalSelesai] = useState(() => {
    if (!currentData.tanggalSelesai) return "";
    const d = currentData.tanggalSelesai?.toDate?.() || new Date(currentData.tanggalSelesai);
    return d.toISOString().split("T")[0];
  });
  const [paymentDeadline, setPaymentDeadline] = useState(() => {
    if (!currentData.paymentDeadline) return "";
    const d = currentData.paymentDeadline?.toDate?.() || new Date(currentData.paymentDeadline);
    return d.toISOString().split("T")[0];
  });

  const handleSave = async () => {
    if (!nama.trim()) return showToast("Nama project wajib diisi.", "error");
    setSaving(true);
    try {
      await updateDoc(doc(db, "patungan", patunganId), {
        namaPatungan: nama.trim(),
        deskripsi: deskripsi.trim(),
        tanggalMulai: tanggalMulai ? new Date(tanggalMulai) : null,
        tanggalSelesai: tanggalSelesai ? new Date(tanggalSelesai) : null,
        paymentDeadline: paymentDeadline ? new Date(paymentDeadline) : null,
      });
      showToast("Project berhasil diupdate!", "success");
      onClose();
    } catch {
      showToast("Gagal update project.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 12 }}
            className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800">Edit Project</h3>
              <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 text-sm">
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1.5 block uppercase tracking-wider">
                  Nama Project
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1.5 block uppercase tracking-wider">
                  Deskripsi
                </label>
                <textarea
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500 transition-colors resize-none h-24"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 mb-1.5 block uppercase tracking-wider">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={tanggalMulai}
                    onChange={(e) => setTanggalMulai(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 mb-1.5 block uppercase tracking-wider">
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    value={tanggalSelesai}
                    onChange={(e) => setTanggalSelesai(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1.5 block uppercase tracking-wider">
                  Deadline Pembayaran
                </label>
                <input
                  type="date"
                  value={paymentDeadline}
                  onChange={(e) => setPaymentDeadline(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500 transition-colors"
                />
                <p className="text-[10px] text-slate-400 mt-1">Opsional. Akan muncul sebagai countdown di dashboard.</p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 border-t border-slate-100 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-semibold rounded-2xl transition-colors text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3.5 bg-cyan-500 text-white font-semibold rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                <Save size={16} />
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
