"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, CheckCircle2, XCircle, Image as ImageIcon } from "lucide-react";
import type { Deposit, DepositStatus } from "@/types";

interface DepositHistoryProps {
  patunganId: string;
}

const STATUS_CONFIG: Record<
  DepositStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Menunggu",
    color: "bg-amber-50 text-amber-600 border-amber-100",
    icon: <Clock size={12} />,
  },
  approved: {
    label: "Disetujui",
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    icon: <CheckCircle2 size={12} />,
  },
  rejected: {
    label: "Ditolak",
    color: "bg-red-50 text-red-600 border-red-100",
    icon: <XCircle size={12} />,
  },
};

export default function DepositHistory({ patunganId }: DepositHistoryProps) {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "patungan", patunganId, "deposits"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDeposits(
        snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Deposit)
        )
      );
    });

    return () => unsubscribe();
  }, [patunganId]);

  if (deposits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-300 mb-3">
          <Clock size={24} />
        </div>
        <p className="text-sm font-medium text-slate-400">
          Belum ada transaksi
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {deposits.map((deposit) => {
          const config = STATUS_CONFIG[deposit.status];
          const date = deposit.createdAt?.toDate
            ? deposit.createdAt.toDate()
            : new Date();

          return (
            <motion.div
              key={deposit.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 text-xs font-bold text-slate-400">
                  {deposit.photoURL ? (
                    <img
                      src={deposit.photoURL}
                      alt={deposit.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    deposit.displayName?.charAt(0)
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {deposit.displayName}
                    </p>
                    {/* Bukti button */}
                    {deposit.buktiUrl && (
                      <button
                        onClick={() => setPreviewImage(deposit.buktiUrl)}
                        className="text-slate-300 hover:text-cyan-500 transition-colors shrink-0"
                        title="Lihat bukti"
                      >
                        <ImageIcon size={14} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">
                      @{deposit.username}
                    </span>
                    <span className="text-[11px] text-slate-300">·</span>
                    <span className="text-[11px] text-slate-400">
                      {date.toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <p className="text-sm font-bold text-slate-800">
                  +Rp {deposit.nominal?.toLocaleString("id-ID")}
                </p>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${config.color}`}
                >
                  {config.icon}
                  {config.label}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewImage(null)}
              className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-sm w-full max-h-[80vh] overflow-hidden rounded-3xl shadow-2xl"
            >
              <img
                src={previewImage}
                alt="Bukti transfer"
                className="w-full h-full object-contain bg-white"
              />
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-slate-900/60 text-white rounded-full flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
