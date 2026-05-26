"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, Users, DollarSign, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/formatCurrency";
import type { Patungan, RundownItem, BudgetCategory } from "@/types";
import { BUDGET_CATEGORIES as CATEGORIES } from "@/types";

export default function SharePage() {
  const { id } = useParams();
  const [data, setData] = useState<Patungan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const snap = await getDoc(doc(db, "patungan", id as string));
        if (snap.exists()) {
          setData({ id: snap.id, ...snap.data() } as Patungan);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-2xl mb-3">🔗</p>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Link tidak valid</h2>
          <p className="text-sm text-slate-400 mb-4">Project tidak ditemukan atau link sudah kadaluarsa.</p>
          <Link href="/">
            <button className="flex items-center gap-2 mx-auto px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold">
              <ArrowLeft size={16} /> Ke Topahin
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const rundown = data.rundown || [];
  const totalBudget = rundown.reduce((acc, r) => acc + (r.biaya || 0), 0);
  const progress = Math.min(Math.round(((data.terkumpul || 0) / (data.targetDana || 1)) * 100), 100);

  // Group rundown by date
  const groupedByDate = rundown.reduce((acc, item) => {
    const date = item.tanggal || "unknown";
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, RundownItem[]>);

  const sortedDates = Object.keys(groupedByDate).sort();

  return (
    <main className="min-h-screen bg-slate-50 font-sans pb-12">
      {/* Header */}
      <div className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-100">
        <div className="max-w-xl mx-auto p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="text-[10px] font-semibold text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-lg border border-cyan-100 uppercase tracking-wider">
              Shared Itinerary
            </div>
            {data.isTrip && (
              <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                Trip
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-2">{data.namaPatungan}</h1>
          <p className="text-sm text-slate-500 leading-relaxed">{data.deskripsi}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-white p-3 rounded-xl border border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-medium uppercase">Anggota</p>
              <p className="text-lg font-bold text-slate-800">{data.listAnggota?.length || 0}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-medium uppercase">Budget</p>
              <p className="text-lg font-bold text-slate-800">{formatRupiah(totalBudget)}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-medium uppercase">Dana</p>
              <p className="text-lg font-bold text-cyan-600">{progress}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="max-w-xl mx-auto p-6">
        {sortedDates.length > 0 ? (
          <div className="space-y-6">
            {sortedDates.map((date, dayIndex) => {
              const items = groupedByDate[date].sort((a, b) => a.waktu.localeCompare(b.waktu));
              const dayDate = new Date(date + "T00:00:00");
              const dayLabel = dayDate.toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
              });
              const dayBudget = items.reduce((acc, i) => acc + (i.biaya || 0), 0);

              return (
                <motion.div
                  key={date}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: dayIndex * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-800">{dayLabel}</h3>
                    {dayBudget > 0 && (
                      <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                        {formatRupiah(dayBudget)}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 relative">
                    <div className="absolute left-[15px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-cyan-200 via-slate-200 to-transparent rounded-full" />

                    {items.map((item, i) => {
                      const catConfig = CATEGORIES[(item.kategori as BudgetCategory) || "lainnya"];
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: dayIndex * 0.1 + i * 0.05 }}
                          className="grid grid-cols-[32px_1fr] gap-3"
                        >
                          <div className="flex flex-col items-center pt-4">
                            <div className="w-[8px] h-[8px] rounded-full bg-cyan-500 border-2 border-white shadow-sm z-10" />
                          </div>

                          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            {item.foto && (
                              <img src={item.foto} alt="" className="w-full h-28 rounded-xl object-cover mb-3" loading="lazy" />
                            )}

                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="flex items-center gap-1 text-xs font-semibold text-cyan-600 bg-cyan-50 px-2 py-1 rounded-lg">
                                <Clock size={11} /> {item.waktu}
                              </span>
                              {item.biaya > 0 && (
                                <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border ${catConfig?.color || "bg-slate-50 text-slate-600 border-slate-100"}`}>
                                  {catConfig?.icon} {formatRupiah(item.biaya)}
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm font-bold text-slate-800 mb-1">{item.aktivitas}</h4>

                            {item.lokasi && item.lokasi !== "-" && (
                              <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                                <MapPin size={12} className="text-slate-300" /> {item.lokasi}
                              </p>
                            )}

                            {item.catatan && (
                              <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 italic">
                                💡 {item.catatan}
                              </p>
                            )}
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
          <div className="text-center py-12">
            <p className="text-2xl mb-2">📋</p>
            <p className="text-sm text-slate-400 font-medium">Belum ada jadwal</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-[11px] text-slate-300 mb-3">Shared via Topahin</p>
          <Link href="/">
            <button className="text-xs font-semibold text-cyan-500 hover:text-cyan-600 transition-colors">
              Buat trip kamu sendiri →
            </button>
          </Link>
        </div>
      </div>
    </main>
  );
}
