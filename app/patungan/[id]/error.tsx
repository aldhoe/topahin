"use client";

import { motion } from "framer-motion";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PatunganError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-sm"
      >
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertTriangle size={28} className="text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          Gagal memuat project
        </h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Mungkin ada masalah koneksi atau project tidak tersedia. Coba refresh atau kembali ke dashboard.
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-cyan-500 text-white font-semibold rounded-2xl active:scale-[0.98] transition-all text-sm"
          >
            <RotateCcw size={16} /> Refresh
          </button>
          <Link href="/" className="flex-1">
            <button className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-100 text-slate-600 font-semibold rounded-2xl text-sm">
              <ArrowLeft size={16} /> Kembali
            </button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
