"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import DepositFlow from "@/components/patungan/DepositFlow";
import DepositHistory from "@/components/patungan/DepositHistory";
import ProgressCard from "@/components/patungan/ProgressCard";
import { Wallet, ChevronDown, ChevronUp, Archive, Users } from "lucide-react";
import { formatRupiah } from "@/lib/formatCurrency";
import type { UserProfile, BankSettings, Deposit } from "@/types";

interface DanaTabProps {
  patunganId: string;
  targetDana: number;
  targetPerOrang: number;
  listAnggota: string[];
  profile: UserProfile | null;
  isArchived?: boolean;
}

export default function DanaTab({
  patunganId,
  targetDana,
  targetPerOrang,
  listAnggota,
  profile,
  isArchived = false,
}: DanaTabProps) {
  const [showDepositFlow, setShowDepositFlow] = useState(false);
  const [bankSettings, setBankSettings] = useState<BankSettings>({
    bankName: "BNI",
    accountNumber: "",
    accountHolder: "",
  });
  const [terkumpul, setTerkumpul] = useState(0);
  const [sudahDibayar, setSudahDibayar] = useState(0);
  const [allDeposits, setAllDeposits] = useState<Deposit[]>([]);

  // Fetch bank settings
  useEffect(() => {
    const fetchBank = async () => {
      const snap = await getDoc(doc(db, "settings", "bank"));
      if (snap.exists()) setBankSettings(snap.data() as BankSettings);
    };
    fetchBank();
  }, []);

  // Listen to deposits to calculate terkumpul
  useEffect(() => {
    const q = query(
      collection(db, "patungan", patunganId, "deposits"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const deposits = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Deposit[];
      setAllDeposits(deposits);
      const approved = deposits.filter((d) => d.status === "approved");
      const total = approved.reduce((acc, d) => acc + (d.nominal || 0), 0);
      setTerkumpul(total);

      // Calculate how much current user has paid
      if (profile?.username) {
        const myDeposits = approved.filter(
          (d) => d.username?.toLowerCase() === profile.username.toLowerCase()
        );
        const myTotal = myDeposits.reduce((acc, d) => acc + (d.nominal || 0), 0);
        setSudahDibayar(myTotal);
      }
    });

    return () => unsub();
  }, [patunganId, profile]);

  // Per-member breakdown
  const memberBreakdown = useMemo(() => {
    const approved = allDeposits.filter((d) => d.status === "approved");
    return listAnggota.map((username) => {
      const deposits = approved.filter(
        (d) => d.username?.toLowerCase() === username.toLowerCase()
      );
      const paid = deposits.reduce((acc, d) => acc + (d.nominal || 0), 0);
      const progress = Math.min(Math.round((paid / targetPerOrang) * 100), 100);
      const status: "lunas" | "sebagian" | "belum" =
        paid >= targetPerOrang ? "lunas" : paid > 0 ? "sebagian" : "belum";
      return { username, paid, progress, status };
    });
  }, [allDeposits, listAnggota, targetPerOrang]);

  const sisaTagihan = Math.max(targetPerOrang - sudahDibayar, 0);
  const isLunas = sudahDibayar >= targetPerOrang;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {/* Progress Card */}
      <ProgressCard
        terkumpul={terkumpul}
        targetDana={targetDana}
        jumlahAnggota={listAnggota.length}
        targetPerOrang={targetPerOrang}
      />

      {/* Payment Status / Deposit Button */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 mb-6 shadow-[var(--shadow-card)]">
        {isArchived ? (
          <div className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
              <Archive size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-700">
                Project Diarsipkan
              </p>
              <p className="text-xs text-slate-400">
                Deposit tidak bisa dilakukan saat ini.
              </p>
            </div>
          </div>
        ) : isLunas ? (
          <div className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                Kamu sudah lunas!
              </p>
              <p className="text-xs text-slate-400">
                Total kontribusi: {formatRupiah(sudahDibayar)}
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Sisa tagihan kamu
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {formatRupiah(sisaTagihan)}
                </p>
              </div>
              {sudahDibayar > 0 && (
                <span className="text-xs font-medium text-slate-400">
                  Sudah: {formatRupiah(sudahDibayar)}
                </span>
              )}
            </div>

            <button
              onClick={() => setShowDepositFlow(!showDepositFlow)}
              className="w-full py-3.5 bg-slate-900 text-white font-semibold rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {showDepositFlow ? (
                <>
                  Tutup <ChevronUp size={16} />
                </>
              ) : (
                <>
                  Setor Dana <ChevronDown size={16} />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Deposit Flow (expandable) — only when not archived */}
      {showDepositFlow && !isLunas && !isArchived && (
        <div className="mb-6">
          <DepositFlow
            patunganId={patunganId}
            targetPerOrang={targetPerOrang}
            sudahDibayar={sudahDibayar}
            profile={profile}
            bankSettings={bankSettings}
            onClose={() => setShowDepositFlow(false)}
          />
        </div>
      )}

      {/* Member Breakdown (#9) */}
      <div className="bg-white rounded-2xl border border-slate-100 mb-6 overflow-hidden shadow-[var(--shadow-card)]">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <Users size={16} className="text-cyan-500" />
          <h3 className="text-sm font-semibold text-slate-800">Breakdown Per Anggota</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {memberBreakdown.map((member, i) => (
            <motion.div
              key={member.username}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="p-4 flex items-center gap-3"
            >
              {/* Avatar placeholder */}
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-400 shrink-0 uppercase">
                {member.username.charAt(0)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-700 truncate">
                    @{member.username}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    member.status === "lunas"
                      ? "bg-emerald-50 text-emerald-600"
                      : member.status === "sebagian"
                      ? "bg-amber-50 text-amber-600"
                      : "bg-red-50 text-red-500"
                  }`}>
                    {member.progress === 100 ? "Lunas" : `${member.progress}%`}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${member.progress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.05 }}
                    className={`h-full rounded-full ${
                      member.status === "lunas"
                        ? "bg-emerald-500"
                        : member.status === "sebagian"
                        ? "bg-amber-500"
                        : "bg-slate-200"
                    }`}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>{formatRupiah(member.paid)}</span>
                  <span>/ {formatRupiah(targetPerOrang)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Deposit History */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-4 pl-1">
          Riwayat Deposit
        </h3>
        <DepositHistory patunganId={patunganId} />
      </div>
    </motion.div>
  );
}
