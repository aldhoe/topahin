"use client";

import { useEffect, useRef } from "react";
import { motion, useSpring, useTransform, useInView } from "framer-motion";
import { formatRupiah, formatNumber } from "@/lib/formatCurrency";

interface ProgressCardProps {
  terkumpul: number;
  targetDana: number;
  jumlahAnggota: number;
  targetPerOrang: number;
}

function AnimatedNumber({ value, prefix = "" }: { value: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const spring = useSpring(0, { stiffness: 50, damping: 20 });
  const display = useTransform(spring, (v) => `${prefix}${Math.round(v).toLocaleString("id-ID")}`);

  useEffect(() => {
    if (isInView) spring.set(value);
  }, [isInView, value, spring]);

  return <motion.span ref={ref}>{display}</motion.span>;
}

export default function ProgressCard({
  terkumpul,
  targetDana,
  jumlahAnggota,
  targetPerOrang,
}: ProgressCardProps) {
  const progress = Math.min(Math.round((terkumpul / targetDana) * 100), 100) || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-3xl border border-slate-100 mb-6 shadow-[var(--shadow-card)]"
    >
      {/* Amount */}
      <div className="flex justify-between items-end mb-4">
        <div>
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
            Dana Terkumpul
          </p>
          <h2 className="text-2xl font-bold text-slate-800">
            <AnimatedNumber value={terkumpul} prefix="Rp " />
          </h2>
        </div>
        <motion.span
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
            progress >= 100
              ? "text-emerald-600 bg-emerald-50"
              : "text-cyan-600 bg-cyan-50"
          }`}
        >
          {progress}%
        </motion.span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
          className={`h-full rounded-full ${
            progress >= 100
              ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
              : "bg-gradient-to-r from-cyan-400 to-blue-500"
          }`}
        />
      </div>

      {/* Stats */}
      <div className="flex justify-between text-[11px] text-slate-400">
        <span>
          Target: {formatRupiah(targetDana)}
        </span>
        <span>
          {jumlahAnggota} anggota · {formatRupiah(targetPerOrang)}/orang
        </span>
      </div>
    </motion.div>
  );
}
