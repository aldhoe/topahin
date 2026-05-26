"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Share2, X, MapPin, Clock, Plane, Printer, CalendarPlus } from "lucide-react";
import type { RundownItem, BudgetCategory } from "@/types";
import { BUDGET_CATEGORIES as CATEGORIES } from "@/types";

interface ExportItineraryProps {
  isOpen: boolean;
  onClose: () => void;
  namaPatungan: string;
  rundown: RundownItem[];
  tanggalMulai?: string;
  tanggalSelesai?: string;
  jumlahAnggota: number;
}

export default function ExportItinerary({
  isOpen,
  onClose,
  namaPatungan,
  rundown,
  tanggalMulai,
  tanggalSelesai,
  jumlahAnggota,
}: ExportItineraryProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  // Group by date
  const grouped = rundown.reduce((acc: Record<string, RundownItem[]>, item) => {
    const key = item.tanggal || "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort();
  const totalBudget = rundown.reduce((acc, item) => acc + (item.biaya || 0), 0);

  const handleExportICS = () => {
    let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Topahin//Itinerary//ID\n";
    rundown.forEach((item) => {
      const date = item.tanggal.replace(/-/g, "");
      const time = item.waktu.replace(":", "") + "00";
      const endTime = String(parseInt(item.waktu.split(":")[0]) + 1).padStart(2, "0") + item.waktu.split(":")[1] + "00";
      ics += `BEGIN:VEVENT\n`;
      ics += `DTSTART:${date}T${time}\n`;
      ics += `DTEND:${date}T${endTime.replace(":", "")}\n`;
      ics += `SUMMARY:${item.aktivitas}\n`;
      ics += `LOCATION:${item.lokasi !== "-" ? item.lokasi : ""}\n`;
      ics += `DESCRIPTION:${item.catatan || ""}${item.biaya > 0 ? ` | Budget: Rp ${item.biaya.toLocaleString("id-ID")}` : ""}\n`;
      ics += `END:VEVENT\n`;
    });
    ics += "END:VCALENDAR";
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${namaPatungan}-itinerary.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPDF = () => {
    const printContent = cardRef.current;
    if (!printContent) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>${namaPatungan} - Itinerary</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;color:#1e293b;max-width:600px;margin:0 auto}
      .day{margin-bottom:16px}.day h3{font-size:14px;font-weight:700;margin-bottom:8px;color:#0891b2}
      .item{padding:8px 12px;margin:4px 0;background:#f8fafc;border-radius:8px;font-size:13px}
      .item .time{color:#06b6d4;font-weight:600}.item .cost{color:#d97706;font-size:11px}
      .total{margin-top:16px;padding:12px;background:#f0f9ff;border-radius:8px;font-weight:700;text-align:right}
      </style></head><body>
      <h1 style="font-size:20px;margin-bottom:4px">${namaPatungan}</h1>
      <p style="color:#94a3b8;font-size:12px;margin-bottom:16px">${jumlahAnggota} anggota</p>
    `);
    sortedDates.forEach((date) => {
      const dayDate = new Date(date + "T00:00:00");
      const dayLabel = dayDate.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
      win.document.write(`<div class="day"><h3>${dayLabel}</h3>`);
      grouped[date].sort((a, b) => a.waktu.localeCompare(b.waktu)).forEach((item) => {
        win.document.write(`<div class="item"><span class="time">${item.waktu}</span> ${item.aktivitas}`);
        if (item.lokasi && item.lokasi !== "-") win.document.write(` <span style="color:#94a3b8">📍 ${item.lokasi}</span>`);
        if (item.biaya > 0) win.document.write(` <span class="cost">Rp ${item.biaya.toLocaleString("id-ID")}</span>`);
        win.document.write(`</div>`);
      });
      win.document.write(`</div>`);
    });
    win.document.write(`<div class="total">Total Budget: Rp ${totalBudget.toLocaleString("id-ID")}</div>`);
    win.document.write(`<p style="text-align:center;color:#cbd5e1;font-size:11px;margin-top:16px">Made with Topahin.</p>`);
    win.document.write(`</body></html>`);
    win.document.close();
    win.print();
  };

  const handleExport = async () => {
    if (!cardRef.current) return;
    setExporting(true);

    try {
      // Use html2canvas dynamically
      const html2canvas = (await import("html2canvas-pro")).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), "image/png", 1);
      });

      // Try Web Share API first (mobile friendly)
      if (navigator.share && navigator.canShare?.({ files: [new File([blob], "itinerary.png")] })) {
        const file = new File([blob], `${namaPatungan}-itinerary.png`, { type: "image/png" });
        await navigator.share({
          title: `Itinerary ${namaPatungan}`,
          text: `Check out our trip plan for ${namaPatungan}!`,
          files: [file],
        });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${namaPatungan}-itinerary.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Export failed:", error);
      // Fallback download
      try {
        const html2canvas = (await import("html2canvas-pro")).default;
        const canvas = await html2canvas(cardRef.current!, { scale: 2, useCORS: true });
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = `${namaPatungan}-itinerary.png`;
        a.click();
      } catch {
        // ignore
      }
    } finally {
      setExporting(false);
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
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 12 }}
            className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Share2 size={18} className="text-cyan-500" />
                <h3 className="text-base font-bold text-slate-800">Export Itinerary</h3>
              </div>
              <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <X size={16} />
              </button>
            </div>

            {/* Preview Card */}
            <div className="flex-1 overflow-y-auto p-5">
              <div
                ref={cardRef}
                className="bg-white rounded-2xl overflow-hidden"
                style={{ minWidth: "320px" }}
              >
                {/* Card Header */}
                <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-6 text-white relative overflow-hidden">
                  <div className="absolute -top-6 -right-6 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <Plane size={14} className="text-cyan-400" />
                      <span className="text-[11px] font-medium text-cyan-400 uppercase tracking-wider">Trip Plan</span>
                    </div>
                    <h2 className="text-xl font-bold mb-1">{namaPatungan}</h2>
                    {(tanggalMulai || tanggalSelesai) && (
                      <p className="text-xs text-slate-400">
                        {tanggalMulai && new Date(tanggalMulai).toLocaleDateString("id-ID", { day: "numeric", month: "long" })}
                        {tanggalSelesai && ` — ${new Date(tanggalSelesai).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`}
                      </p>
                    )}
                    <div className="flex gap-3 mt-3">
                      <span className="text-[10px] font-medium bg-white/10 px-2.5 py-1 rounded-lg">
                        {jumlahAnggota} Anggota
                      </span>
                      {totalBudget > 0 && (
                        <span className="text-[10px] font-medium bg-cyan-500/20 text-cyan-300 px-2.5 py-1 rounded-lg">
                          Rp {totalBudget.toLocaleString("id-ID")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Days */}
                <div className="p-5 space-y-5">
                  {sortedDates.map((dateKey, dayIndex) => {
                    const items = grouped[dateKey].sort((a, b) => (a.waktu || "").localeCompare(b.waktu || ""));
                    const dayBudget = items.reduce((acc, item) => acc + (item.biaya || 0), 0);
                    const dateObj = new Date(dateKey + "T00:00:00");

                    return (
                      <div key={dateKey}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white">D{dayIndex + 1}</span>
                            </div>
                            <span className="text-xs font-semibold text-slate-700">
                              {dateObj.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}
                            </span>
                          </div>
                          {dayBudget > 0 && (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              Rp {dayBudget.toLocaleString("id-ID")}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5 pl-3 border-l-2 border-slate-100 ml-3.5">
                          {items.map((item) => (
                            <div key={item.id} className="flex items-start gap-2 py-1.5">
                              <span className="text-[10px] font-semibold text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                                {item.waktu}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-slate-800">{item.aktivitas}</p>
                                {item.lokasi && item.lokasi !== "-" && (
                                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <MapPin size={8} /> {item.lokasi}
                                  </p>
                                )}
                              </div>
                              {item.biaya > 0 && (
                                <span className="text-[10px] font-medium text-slate-500 shrink-0">
                                  Rp {item.biaya.toLocaleString("id-ID")}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="px-5 pb-5">
                  <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-400">Made with</span>
                    <span className="text-xs font-bold text-slate-700">
                      Topahin<span className="text-cyan-500">.</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 space-y-2 shrink-0">
              <button onClick={handleExport} disabled={exporting}
                className="w-full py-3 bg-cyan-500 text-white font-semibold rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                <Download size={16} />
                {exporting ? "Exporting..." : "Export as Image"}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handlePrintPDF}
                  className="py-3 bg-slate-100 text-slate-600 font-semibold rounded-2xl text-sm flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors">
                  <Printer size={14} /> Print / PDF
                </button>
                <button onClick={handleExportICS}
                  className="py-3 bg-slate-100 text-slate-600 font-semibold rounded-2xl text-sm flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors">
                  <CalendarPlus size={14} /> Calendar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
