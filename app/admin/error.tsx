"use client";

import { motion } from "framer-motion";
import { ShieldAlert, RotateCcw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminError({
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
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <ShieldAlert size={28} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          Error Admin Panel
        </h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Gagal memuat data admin. Pastikan kamu punya akses admin dan koneksi stabil.
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-slate-900 text-white font-semibold rounded-2xl active:scale-[0.98] transition-all text-sm"
          >
            <RotateCcw size={16} /> Coba Lagi
          </button>
          <Link href="/" className="flex-1">
            <button className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-100 text-slate-600 font-semibold rounded-2xl text-sm">
              <ArrowLeft size={16} /> Dashboard
            </button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
