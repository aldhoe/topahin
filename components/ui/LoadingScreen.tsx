"use client";

import { motion } from "framer-motion";

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
      <div className="relative flex items-center justify-center">
        {/* Outer ring spinner */}
        <div className="w-16 h-16 border-2 border-slate-100 border-t-cyan-500 rounded-full animate-spin" />

        {/* Center logo */}
        <div className="absolute flex items-center justify-center">
          <img
            src="/icon-512x512.png"
            alt="Topahin"
            className="w-10 h-10 object-contain rounded-2xl animate-pulse"
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <p className="text-lg font-bold text-slate-800 tracking-tight">
          Topahin<span className="text-cyan-500">.</span>
        </p>
        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest animate-pulse">
          Memuat...
        </p>
      </div>
    </div>
  );
}
