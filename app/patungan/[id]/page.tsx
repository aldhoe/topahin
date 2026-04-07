"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, increment, arrayUnion, getDoc, deleteDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function DetailPatungan() {
  const { id } = useParams();
  const router = useRouter();

  // Fitur Hapus Project
 const executeDeleteProject = async () => {
  try {
    await deleteDoc(doc(db, "patungan", id as string));
    showToast("Project telah dibubarkan! 🗑️", "success");
    router.push("/"); 
  } catch (error) {
    console.error(error);
    showToast("Gagal hapus project.", "error");
  }
};

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<any>(null);

// Ambil profil user yang login buat data Midtrans
useEffect(() => {
  const fetchProfile = async () => {
    if (auth.currentUser) {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) setProfile(userDoc.data());
    }
  };
  fetchProfile();
}, []);

  const [inputDana, setInputDana] = useState("");
  const [inputNominal, setInputNominal] = useState<number>(0);
  const [paying, setPaying] = useState(false);

  const [isTipsOpen, setIsTipsOpen] = useState(false);
  const [isEditTipsOpen, setIsEditTipsOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [tempTips, setTempTips] = useState(""); 
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [tempCatatan, setTempCatatan] = useState("");

  // --- KUMPULAN STATE TUGAS & PACKING (YANG BENER) ---
  const [tasks, setTasks] = useState<any[]>([]); // <-- INI YANG BENER: setTasks
  const [newTask, setNewTask] = useState("");
  const [newPIC, setNewPIC] = useState("");

  const [packingItems, setPackingItems] = useState<any[]>([ // <-- INI YANG BENER: setPackingItems
    { category: "📁 Dokumen", items: [] },
    { category: "👕 Pakaian", items: [] },
    { category: "🔌 Elektronik", items: [] },
    { category: "💊 Obat-obatan", items: [] },
    { category: "📦 Lain-lain", items: [] },
  ]);
  const [openCategory, setOpenCategory] = useState<string | null>();
  const [newItemInput, setNewItemInput] = useState("");
  const [newPackingPIC, setNewPackingPIC] = useState("");

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  
  // State khusus Itinerary & Navigasi
  const [showItineraryForm, setShowItineraryForm] = useState(false);
  const [kegiatan, setKegiatan] = useState("");
  const [estimasiBiaya, setEstimasiBiaya] = useState("");
  const [activeTab, setActiveTab] = useState<"dana" | "rencana" | "anggota">("dana");
  const [tripTab, setTripTab] = useState<"rundown" | "tugas" | "packing">("rundown");
  const [showRundownForm, setShowRundownForm] = useState(false);
  const [rDay, setRDay] = useState("1");
  const [rWaktu, setRWaktu] = useState("");
  const [rAktivitas, setRAktivitas] = useState("");
  const [rLokasi, setRLokasi] = useState("");
  const [rBiaya, setRBiaya] = useState("");
  const [rTransport, setRTransport] = useState("");
  const [rFoto, setRFoto] = useState("");
  const [rMaps, setRMaps] = useState("");
  const [rLink, setRLink] = useState("");
  const [rCatatan, setRCatatan] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // State buat nyimpen ID jadwal yang mau dihapus (kalau null berarti modalnya nutup)
const [itemToDelete, setItemToDelete] = useState<string | null>(null);
const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);

  // --- 1. SINKRONISASI AWAL DARI FIREBASE ---
  useEffect(() => {
    if (data) {
      if (data.tasks) setTasks(data.tasks); // Pake setTasks LOKAL
      if (data.packingItems && data.packingItems.length > 0) {
        setPackingItems(data.packingItems); // Pake setPackingItems LOKAL
      }
    }
  }, [data]);

  // --- 2. FUNGSI SAKTI TUGAS & PACKING (POSISINYA HARUS DI SINI) ---
  const updateTasksToDB = async (newTasks: any[]) => {
    setTasks(newTasks); 
    console.log("Menyimpan Tasks ke DB...", newTasks);
    try {
      const tripRef = doc(db, "patungan", id as string); 
      await updateDoc(tripRef, { tasks: newTasks });
      console.log("SUKSES SIMPAN TASKS!");
    } catch (error) {
      console.error("Gagal nyimpen Tugas:", error);
    }
  };

  const updatePackingToDB = async (newPacking: any[]) => {
    setPackingItems(newPacking);
    console.log("Menyimpan Packing ke DB...", newPacking);
    try {
      const tripRef = doc(db, "patungan", id as string);
      await updateDoc(tripRef, { packingItems: newPacking });
      console.log("SUKSES SIMPAN PACKING!");
    } catch (error) {
      console.error("Gagal nyimpen Packing List:", error);
    }
  };

  // --- 3. FUNGSI UPDATE TIPS (UDAH BERSIH DARI EFFECT) ---
  const handleUpdateTips = () => {
    if (selectedDay === null) return;
    if (!data || !data.rundown) {
      console.error("Data rundown belum siap!");
      return;
    }

    const updatedRundown = data.rundown.map((item: any) => {
      if (item.day == selectedDay) {
        return { ...item, tipsHarian: tempTips }; 
      }
      return item;
    });

    setData({ ...data, rundown: updatedRundown });
    setIsEditTipsOpen(false);
  };

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddItinerary = async () => {
    if (!kegiatan || !estimasiBiaya) return showToast("Isi nama kegiatan dan biayanya dong", "error");
    try {
      const docRef = doc(db, "patungan", id as string);
      await updateDoc(docRef, {
        itinerary: arrayUnion({
          kegiatan: kegiatan,
          estimasiBiaya: parseInt(estimasiBiaya),
          waktu: new Date()
        })
      });
      setKegiatan("");
      setEstimasiBiaya("");
      setShowItineraryForm(false);
      showToast("Jadwal/Budget berhasil ditambah! 📝", "success");
    } catch (error) {
      console.error(error);
      showToast("Gagal nambahin jadwal.", "error");
    }
  };

  const handleAddRundown = async () => {
    if (!rWaktu || !rAktivitas) return showToast("Jam dan Aktivitas wajib diisi ya!", "error");
    try {
      const docRef = doc(db, "patungan", id as string);
      await updateDoc(docRef, {
        rundown: arrayUnion({
          day: parseInt(rDay),
          waktu: rWaktu,
          aktivitas: rAktivitas,
          lokasi: rLokasi || "-",
          biaya: parseInt(rBiaya) || 0,
          transport: rTransport || "-",
          createdAt: new Date(),
          foto: rFoto,
          linkMaps: rMaps,
          linkExternal: rLink,
          catatan: rCatatan,
          id: Date.now().toString() 
        })
      });
      setRWaktu(""); setRAktivitas(""); setRLokasi(""); setRBiaya(""); setRTransport("");
      setShowRundownForm(false);
      showToast("Jadwal berhasil ditambahkan! 📅", "success");
    } catch (error) {
      console.error(error);
      showToast("Duh, gagal menyimpan jadwal.", "error");
    }
  };

  // --- STATE & FUNGSI EDIT RUNDOWN ---
const [isEditingRundown, setIsEditingRundown] = useState(false);
const [editForm, setEditForm] = useState<any>({});

const handleSaveEditRundown = async () => {
  try {
    const updatedRundown = data.rundown.map((item: any) => 
      item.id === editForm.id ? editForm : item
    );
    const docRef = doc(db, "patungan", id as string);
    await updateDoc(docRef, { rundown: updatedRundown });

    setData({ ...data, rundown: updatedRundown });
    setSelectedItem(editForm);
    setIsEditingRundown(false);
    showToast("Jadwal berhasil diupdate! ✏️", "success");
  } catch (error) {
    console.error(error);
    showToast("Gagal update jadwal.", "error");
  }
};

// 1. Fungsi buat BUKA pop-up konfirmasi (Dipanggil pas klik tombol tong sampah)
const triggerDelete = (itemId: string) => {
  setItemToDelete(itemId);
};

// 2. Fungsi EKSEKUSI hapus (Dipanggil pas klik "Yakin, Hapus!" di pop-up)
const executeDeleteRundown = async () => {
  if (!itemToDelete) return; // Kalau kosong, batalin
  
  try {
    const updatedRundown = data.rundown.filter((item: any) => item.id !== itemToDelete);
    const docRef = doc(db, "patungan", id as string);
    await updateDoc(docRef, { rundown: updatedRundown });

    setData({ ...data, rundown: updatedRundown });
    setSelectedItem(null); // Tutup modal detail/edit
    setItemToDelete(null); // Tutup pop-up konfirmasi
    showToast("Jadwal dihapus! 🗑️", "success");
  } catch (error) {
    console.error(error);
    showToast("Gagal hapus jadwal.", "error");
  }
};

  useEffect(() => {
    if (!id) return;
    const docRef = doc(db, "patungan", id as string);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setData({ id: docSnap.id, ...docSnap.data() });
      } else {
        router.push("/");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id, router]);

  const handlePayment = async () => {
  if (!auth.currentUser) return showToast("Login dulu yuk buat bayar! 🔑", "error");
  
  // Validasi: Harus isi nominal dulu
  if (inputNominal <= 0) return showToast("Masukin nominal yang mau dibayar dulu ya! 💸", "error");

  try {
    // 1. SIAPIN USERNAME (Ambil dari profil atau email sebelum tanda @ kalau gak ada)
    const usernameClean = profile?.username || auth.currentUser.email?.split('@')[0] || "anonim";
    
    // 2. BIKIN ORDER ID YANG ADA USERNAME-NYA
    // Format: idProject-username-timestamp
    const orderId = `${id}-${usernameClean.replace(/\s/g, "").toLowerCase()}-${Date.now()}`;
    
    const response = await fetch("/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        orderId: orderId, // <--- Pake ID yang baru
        amount: inputNominal,
        itemDetails: [
          { 
            id: id, 
            price: inputNominal, 
            quantity: 1, 
            name: `Patungan: ${data.namaPatungan}` 
          }
        ],
        customerDetails: { 
          first_name: profile?.displayName || auth.currentUser.displayName, 
          email: auth.currentUser.email 
        },
      }),
    });

    const { token } = await response.json();

    // 2. Munculin Pop-up Midtrans
    (window as any).snap.pay(token, {
      onSuccess: function(result: any) {
        showToast("Pembayaran Berhasil! 💸", "success");
        // Catatan: Update terkumpul nanti lewat Webhook biar aman, 
        // tapi kalo mau instan buat UI bisa panggil updateDoc di sini.
      },
      onPending: function(result: any) {
        showToast("Ditunggu pembayarannya ya! ⏳", "info");
      },
      onError: function(result: any) {
        showToast("Waduh, pembayaran gagal.", "error");
      },
      onClose: function() {
        showToast("Yah, bayarnya dibatalin. 🥺", "error");
      }
    });
  } catch (error) {
    console.error(error);
    showToast("Gagal konek ke sistem pembayaran.", "error");
  }
};

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Loading Planner...</div>;

  const progress = Math.min(Math.round((data.terkumpul / data.targetDana) * 100), 100) || 0;

// --- LOGIKA HITUNG PROGRES TOTAL PROJECT ---
// 1. Jumlahin semua nominal dari riwayat (Paksa jadi Number biar gak NaN)
const totalTerkumpul = data.riwayat?.reduce((acc: number, curr: any) => 
  acc + (Number(curr.nominal) || 0), 0) || 0;

// 2. Tentukan Target Total (Pakai targetTotal atau hasil perkalian anggota)
const targetProyek = data.targetTotal || (Number(data.targetPerOrang) * (data.listAnggota?.length || 0)) || 1;

// 3. Hitung Persentase (Maksimal 100%)
const persentaseTotal = Math.min(Math.floor((totalTerkumpul / targetProyek) * 100), 100) || 0;

  return (
    <main className="min-h-screen bg-slate-50 font-sans pb-40">
      {/* Navbar Atas */}
<nav className="p-4 flex items-center bg-white border-b border-slate-100 sticky top-0 z-[50]">
  <Link href="/" className="p-2 text-slate-400">←</Link>
  <h1 className="ml-2 font-bold text-slate-800 line-clamp-1">{data.namaPatungan}</h1>
</nav>

      <section className="max-w-xl mx-auto p-6">
        {/* Header Project */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <img src={data.fotoPembuat} className="w-8 h-8 rounded-full border border-slate-200" />
            <span className="text-xs font-bold text-slate-500">@{data.usernamePembuat}</span>
            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-1 rounded-md ml-auto font-bold uppercase">Project Owner</span>
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-2 leading-tight">{data.namaPatungan}</h2>
          <p className="text-sm text-slate-500 leading-relaxed">{data.deskripsi}</p>
        </div>

        {/* Tab Navigation */}
<div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 mb-8 sticky top-[68px] z-[40] shadow-sm">
          {[
            { id: "dana", label: "Dana" },
            { id: "rencana", label: data?.isTrip ? "Itinerary" : "Budget" },
            { id: "anggota", label: "Anggota" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 text-xs font-bold uppercase rounded-xl transition-all ${
                activeTab === tab.id ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* --- KONTEN TAB: DANA --- */}
{activeTab === "dana" && (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
    
    {/* Card Progress Dana */}
<div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 mb-6">
  <div className="flex justify-between items-end mb-4">
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
        Dana Terkumpul (Total)
      </p>
      <h1 className="text-3xl font-black text-slate-800">
        Rp {totalTerkumpul.toLocaleString('id-ID')}
      </h1>
    </div>
    <div className="text-right">
      <span className="text-[10px] font-black text-cyan-600 bg-cyan-50 px-2 py-1 rounded-lg">
        {persentaseTotal}% TARGET
      </span>
    </div>
  </div>

  {/* Progress Bar Utama */}
  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden relative">
    <motion.div 
      initial={{ width: 0 }}
      animate={{ width: `${persentaseTotal}%` }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.3)]"
    />
  </div>

  <div className="flex justify-between mt-3 px-1">
    <div className="flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
      <p className="text-[9px] font-bold text-slate-400 uppercase">
        Target Project: Rp {targetProyek.toLocaleString('id-ID')}
      </p>
    </div>
    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
      {data.listAnggota?.length || 0} Anggota Berpartisipasi
    </p>
  </div>
</div>

    {/* 1. HITUNG SISA TAGIHAN KHUSUS USER INI */}
{(() => {
  // Hitung total yang sudah dibayar oleh user yang sedang login
  const myUsername = profile?.username || auth.currentUser?.email?.split('@')[0] || "";
  const sudahDibayar = data.riwayat
    ?.filter((r: any) => (r.username || "").toLowerCase() === myUsername.toLowerCase())
    .reduce((acc: number, curr: any) => acc + (Number(curr.nominal) || 0), 0) || 0;

  // Sisa yang harus dilunasi
  const sisaTagihan = Math.max(data.targetPerOrang - sudahDibayar, 0);
  const isSudahLunas = sudahDibayar >= data.targetPerOrang;

  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 mb-8 text-center">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
        {isSudahLunas ? "Satus Kamu: LUNAS 🔥" : "Mau Bayar Berapa?"}
      </p>
      
      {!isSudahLunas ? (
        <>
          {/* INPUT NOMINAL BEBAS */}
          <div className="relative mb-4 group">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl group-focus-within:text-cyan-500 transition-colors">Rp</span>
            <input
              type="number"
              placeholder={sisaTagihan.toLocaleString('id-ID')}
              value={inputNominal || ""}
              onChange={(e) => setInputNominal(Number(e.target.value))}
              className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-transparent focus:border-cyan-500 focus:bg-white rounded-3xl text-2xl font-black text-slate-800 outline-none transition-all placeholder:text-slate-300"
            />
          </div>

          {/* TOMBOL CEPAT (LUNASIN SISA) */}
          <div className="flex gap-2 mb-6">
            <button 
              onClick={() => setInputNominal(sisaTagihan)}
              className="flex-1 py-2 bg-cyan-50 hover:bg-cyan-100 text-[10px] font-black text-cyan-600 rounded-full transition-all border border-cyan-100 flex items-center justify-center gap-2"
            >
              ⚡ LUNASIN (Rp {sisaTagihan.toLocaleString('id-ID')})
            </button>
          </div>
          
          <button 
            onClick={handlePayment}
            disabled={!inputNominal || inputNominal <= 0}
            className={`w-full py-5 font-black rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 ${
              inputNominal > 0 
                ? "bg-gradient-to-tr from-cyan-500 to-teal-400 text-slate-900 shadow-cyan-500/20" 
                : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
            }`}
          >
            <span className="text-xl">💳</span>
            {inputNominal > 0 ? `BAYAR Rp ${inputNominal.toLocaleString('id-ID')}` : "MASUKKAN NOMINAL"}
          </button>
        </>
      ) : (
        <div className="py-4 px-6 bg-teal-50 border-2 border-teal-100 rounded-3xl">
           <p className="text-teal-600 font-black text-sm uppercase">Terima kasih! Kamu sudah lunas. ✨</p>
        </div>
      )}

      <p className="text-[9px] text-slate-400 mt-4 font-bold uppercase tracking-tighter italic">
        *Mendukung QRIS, GoPay, ShopeePay & Transfer Bank
      </p>
    </div>
  );
})()}

            {/* Riwayat */}
            <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase">Riwayat Transaksi</h3>
            <div className="space-y-3">
              {data.riwayat && data.riwayat.length > 0 ? (
                [...data.riwayat].reverse().map((donatur: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-cyan-50 text-cyan-600 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                        {donatur.nama?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{donatur.nama}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{new Date(donatur.waktu?.toDate()).toLocaleDateString('id-ID')}</p>
                      </div>
                    </div>
                    <p className="text-sm font-black text-slate-800">+Rp {donatur.nominal?.toLocaleString('id-ID')}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-6 border border-dashed rounded-2xl">Belum ada transaksi</p>
              )}
            </div>
          </motion.div>
        )}

        {/* --- KONTEN TAB: RENCANA (BUDGET / ITINERARY) --- */}
        {activeTab === "rencana" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            
            {data?.isTrip ? (
              // TAMPILAN JIKA MODE LIBURAN (ITINERARY) AKTIF
              <div className="space-y-6">
                
                {/* Header Trip Mode & Sub-Nav */}
                <div>
                  <h3 className="font-bold text-slate-800 uppercase tracking-wider text-sm mb-4 pl-2">Plan Liburan ✈️</h3>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {[
                      { id: "rundown", icon: "📅", label: "Rundown" },
                      { id: "tugas", icon: "✅", label: "Tugas & PIC" },
                      { id: "packing", icon: "🎒", label: "Packing" }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTripTab(t.id as any)}
                        className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                          tripTab === t.id 
                            ? "bg-cyan-500 text-slate-900 border-cyan-500 shadow-sm" 
                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-sm">{t.icon}</span> {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Konten Sub-Tab Trip */}
                <AnimatePresence mode="wait">
                  {tripTab === "rundown" && (
                    <motion.div key="rundown" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                      
                      {/* Tombol Tambah Jadwal (Hanya untuk Owner) */}
                      {auth.currentUser?.uid === data.uidPembuat && (
                        <div className="relative mb-8">
  <motion.button 
    layout
    onClick={() => setShowRundownForm(!showRundownForm)}
    className={`w-full py-4 rounded-[24px] font-black text-sm uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-3 ${
      showRundownForm 
        ? "bg-slate-800 text-slate-400 shadow-inner" 
        : "bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-900 shadow-cyan-500/20"
    }`}
  >
    <motion.span layout className="text-xl">
      {showRundownForm ? "✕" : "＋"}
    </motion.span>
    {showRundownForm ? "Tutup Form Input" : "Tambah Rencana Baru"}
  </motion.button>
</div>
                      )}

                      {/* --- FORM INPUT JADWAL (UPDATE: Tambah Field Foto & Links) --- */}
                      <AnimatePresence>
  {showRundownForm && (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-slate-900 p-6 rounded-[32px] mb-8 overflow-hidden shadow-xl space-y-4 border border-slate-800">
      
      {/* Kolom 1: Indikator Hari & Jam */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-widest">Pilih Hari</label>
          <select 
            value={rDay} 
            onChange={(e) => setRDay(e.target.value)} 
            className="w-full p-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-white text-sm font-bold focus:border-cyan-500 outline-none appearance-none"
          >
            {[1,2,3,4,5,6,7,8,9,10].map(d => (
              <option key={d} value={d}>Day {d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-widest">Waktu/Jam</label>
          <input 
            type="time" 
            value={rWaktu} 
            onChange={(e) => setRWaktu(e.target.value)} 
            className="w-full p-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-white text-sm font-bold focus:border-cyan-500 outline-none" 
          />
        </div>
      </div>

      {/* Aktivitas & Lokasi */}
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-widest">Nama Aktivitas</label>
          <input type="text" value={rAktivitas} onChange={(e) => setRAktivitas(e.target.value)} placeholder="Misal: Snorkeling & Lunch" className="w-full p-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-white text-sm font-bold outline-none focus:border-cyan-500" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-widest">Lokasi</label>
          <input type="text" value={rLokasi} onChange={(e) => setRLokasi(e.target.value)} placeholder="Misal: Coral Island" className="w-full p-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-white text-sm font-bold outline-none focus:border-cyan-500" />
        </div>
      </div>

      {/* Transport & Biaya */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-widest">Transport</label>
          <input type="text" value={rTransport} onChange={(e) => setRTransport(e.target.value)} placeholder="Speedboat" className="w-full p-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-white text-sm font-bold outline-none focus:border-cyan-500" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-widest">Biaya (Rp)</label>
          <input type="number" value={rBiaya} onChange={(e) => setRBiaya(e.target.value)} placeholder="0" className="w-full p-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-white text-sm font-bold outline-none focus:border-cyan-500" />
        </div>
      </div>

      {/* Media & Links */}
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-widest">URL Foto (Optional)</label>
          <input type="text" value={rFoto} onChange={(e) => setRFoto(e.target.value)} placeholder="https://image-url.com" className="w-full p-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-white text-[10px] font-medium outline-none focus:border-cyan-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="text" value={rMaps} onChange={(e) => setRMaps(e.target.value)} placeholder="Link G-Maps" className="w-full p-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-white text-[10px] font-medium outline-none focus:border-cyan-500" />
          <input type="text" value={rLink} onChange={(e) => setRLink(e.target.value)} placeholder="Link Info/Review" className="w-full p-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-white text-[10px] font-medium outline-none focus:border-cyan-500" />
        </div>
      </div>

      {/* Catatan */}
      <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-widest">Catatan Tambahan</label>
        <textarea value={rCatatan} onChange={(e) => setRCatatan(e.target.value)} placeholder="Tips: Jangan lupa bawa baju ganti..." className="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 text-white text-sm font-medium h-24 resize-none outline-none focus:border-cyan-500" />
      </div>

      <button onClick={handleAddRundown} className="w-full bg-cyan-500 text-slate-900 font-black py-4 rounded-[20px] active:scale-95 transition-all text-sm uppercase tracking-widest shadow-lg shadow-cyan-500/20">
        Simpan Ke Timeline
      </button>
    </motion.div>
  )}
</AnimatePresence>

                      {/* --- TAMPILAN JADWAL (MAPPING DATA) --- */}
                      {data.rundown && data.rundown.length > 0 ? (
                        <div className="space-y-12">
                          {[...new Set(data.rundown.map((item: any) => item.day))]
                            .sort((a: any, b: any) => a - b)
                            .map((dayNum: any) => (
                              <div key={dayNum} className="relative">
                                
                                {/* --- HEADER DAY (STICKY & EXPANDABLE TIPS) --- */}
<div className="sticky top-[135px] z-[30] mb-8 px-1">
  <div className="bg-white/80 backdrop-blur-xl p-5 rounded-[32px] border border-white/50 shadow-xl shadow-slate-200/40">
    
    {/* Baris Utama: Day & Judul */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="bg-slate-900 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-tighter">
          Day {dayNum}
        </span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Itinerary Trip</span>
      </div>
      
      {/* Tombol Expand Tips */}
      <button 
        onClick={() => setIsTipsOpen(!isTipsOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${isTipsOpen ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
      >
        <span className="text-[10px] font-black uppercase tracking-widest">Tips</span>
        <motion.span animate={{ rotate: isTipsOpen ? 180 : 0 }} className="text-[10px]">
          {isTipsOpen ? '✕' : '💡'}
        </motion.span>
      </button>
    </div>

    {/* Konten Tips yang Bisa Di-Expand (Pake Framer Motion) */}
    <AnimatePresence>
      {isTipsOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0, marginTop: 0 }}
          animate={{ height: "auto", opacity: 1, marginTop: 16 }}
          exit={{ height: 0, opacity: 0, marginTop: 0 }}
          className="overflow-hidden"
        >
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-100/50 p-5 rounded-2xl relative">
            <p className="text-[10px] font-black text-amber-700 uppercase mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></span>
              Daily Notes & Tips
            </p>
            
            {/* Render List Tips (Bisa lu isi/edit lewat data nantinya) */}
<div className="space-y-3">
  
  {/* CEK: Apakah HARI INI (dayNum) yang lagi diklik edit? */}
  {editingDay === dayNum ? (
    /* --- KALAU TOMBOL EDIT DIKLIK: MUNCUL KOTAK INPUT --- */
    <div className="bg-white/80 p-3 rounded-xl border border-amber-200">
      <textarea
        className="w-full text-[11px] text-slate-700 bg-transparent focus:outline-none resize-none"
        rows={4}
        value={tempCatatan}
        onChange={(e) => setTempCatatan(e.target.value)}
        autoFocus
      />
      <div className="flex justify-end mt-2">
        <button 
          onClick={() => {
            // 1. Simpan ketikan ke data utama KHUSUS buat hari ini
            const updatedRundown = data.rundown.map((r: any) => 
              r.day === dayNum ? { ...r, tipsHarian: tempCatatan } : r
            );
            setData({ ...data, rundown: updatedRundown });
            
            // 2. Tutup mode edit
            setEditingDay(null);
          }}
          className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-bold px-4 py-1.5 rounded-lg transition-all"
        >
          SIMPAN
        </button>
      </div>
    </div>
  ) : (
    /* --- TAMPILAN NORMAL (CUMA BACA) --- */
    <>
      <p className="text-[11px] text-amber-900/80 leading-relaxed font-semibold italic whitespace-pre-line">
        {/* CARI TIPS DI DATA BERDASARKAN NOMOR HARI */}
        "{data.rundown.find((r: any) => r.day === dayNum)?.tipsHarian || 'Tambahkan tips di sini'}"
      </p>
      
      {/* Tombol Edit Cepat */}
      <button 
        onClick={() => {
          // PAS DIKLIK, CARI JUGA TIPS-NYA BUAT DIMASUKIN KE KOTAK KETIKAN
          const tipsSaatIni = data.rundown.find((r: any) => r.day === dayNum)?.tipsHarian;
          setTempCatatan(tipsSaatIni || "Tambahkan tips di sini");
          setEditingDay(dayNum);
        }}
        className="mt-4 flex items-center gap-2 text-[9px] font-black text-amber-600/60 uppercase tracking-[0.2em] hover:text-amber-700 transition-colors"
      >
        <span>✎</span>
        <span>Update Daily Notes</span>
      </button>
    </>
  )}

</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
</div>

                                {/* Timeline Line */}
                                <div className="ml-4 space-y-8 relative before:absolute before:inset-0 before:left-[4px] before:h-full before:w-0.5 before:bg-slate-200">
                                  {data.rundown
                                    .filter((item: any) => item.day === dayNum)
                                    .sort((a: any, b: any) => a.waktu.localeCompare(b.waktu))
                                    .map((item: any, idx: number) => (
                                      <div key={idx} className="relative pl-10">
                                        {/* Titik Indikator & Jam (Sekarang gak ngalangin) */}
                                        <div className="absolute -left-[5px] top-1.5 w-3 h-3 rounded-full bg-cyan-500 border-2 border-white z-10 shadow-sm"></div>
                                        <div className="absolute -left-[45px] top-1 text-[10px] font-black text-slate-400 w-10 text-right">
                                          {item.waktu}
                                        </div>

                                        {/* Kartu Aktivitas - FULL COVER IMAGE + DARK GRADIENT OVERLAY */}
<motion.div 
  whileTap={{ scale: 0.98 }}
  onClick={() => {
    setSelectedItem(item);
    setIsEditingRundown(false); // Buka sebagai info dulu, bukan langsung edit
  }}
  className="relative group h-[280px] rounded-[40px] overflow-hidden border border-white/10 shadow-xl shadow-slate-900/10 cursor-pointer"
>
  {/* --- 1. FULL BACKGROUND FOTO --- */}
  {item.foto ? (
    <div className="absolute inset-0 z-0">
      <img src={item.foto} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={item.aktivitas} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/100 via-black/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent opacity-60" />
    </div>
  ) : (
    <div className="absolute inset-0 z-0 bg-slate-900 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 opacity-90" />
      <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3], rotate: [0, 90, 0] }} transition={{ duration: 10, repeat: Infinity }} className="absolute -right-20 -top-20 w-64 h-64 bg-cyan-500/30 rounded-full blur-[80px]" />
      <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px]" />
      <div className="absolute top-4 right-8 text-8xl font-black text-white/[0.03] select-none tracking-tighter">{item.waktu.split(':')[0]}</div>
      <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `linear-gradient(30deg, #22d3ee 12%, transparent 12.5%, transparent 87%, #22d3ee 87.5%, #22d3ee), linear-gradient(150deg, #22d3ee 12%, transparent 12.5%, transparent 87%, #22d3ee 87.5%, #22d3ee), linear-gradient(30deg, #22d3ee 12%, transparent 12.5%, transparent 87%, #22d3ee 87.5%, #22d3ee), linear-gradient(150deg, #22d3ee 12%, transparent 12.5%, transparent 87%, #22d3ee 87.5%, #22d3ee)`, backgroundSize: '80px 140px' }} />
      <div className="absolute inset-4 rounded-[30px] border border-white/5 pointer-events-none" />
    </div>
  )}

  {/* 2. KONTEN TEKS */}
  <div className={`absolute inset-0 z-10 p-7 flex flex-col ${item.foto ? "justify-end" : "justify-center"}`}>
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-start gap-4">
        <h4 className={`font-black text-white uppercase tracking-tighter leading-[1.1] drop-shadow-lg flex-1 ${item.foto ? "text-xl" : "text-2xl"}`}>
          {item.aktivitas}
        </h4>
        {item.biaya > 0 && (
          <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl text-right shadow-xl flex-shrink-0 -mt-1 border border-white/20">
            <p className="text-[7px] font-black text-slate-400 uppercase leading-none mb-0.5 tracking-widest">Est. Cost</p>
            <p className="text-xs font-black text-slate-900 leading-none">Rp {item.biaya.toLocaleString('id-ID')}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 bg-cyan-500/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 shadow-lg shadow-cyan-500/10">
          <span className="text-[10px]">📍</span>
          <span className="text-[9px] font-black text-white uppercase tracking-widest">{item.lokasi}</span>
        </div>
        {item.transport !== "-" && (
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
            <span className="text-[10px]">🚐</span>
            <span className="text-[9px] font-bold text-slate-100 uppercase tracking-wider">{item.transport}</span>
          </div>
        )}
      </div>

      {item.catatan && (
        <div className="relative">
          <p className="text-[10px] text-slate-200/90 leading-relaxed font-medium italic line-clamp-2 pl-3 border-l-2 border-cyan-400/50">
            "{item.catatan}"
          </p>
        </div>
      )}

      {/* BARIS 4: FOOTER LINKS (LINK AKTIF, GAK BUKA MODAL) */}
      {(item.linkMaps || item.linkExternal) && (
        <div className="flex items-center gap-4 pt-4 mt-1 border-t border-white/10">
          {item.linkMaps && (
            <a 
              href={item.linkMaps} target="_blank" rel="noopener noreferrer" 
              onClick={(e) => e.stopPropagation()} // <-- Cegah modal kebuka kalau klik maps
              className="text-[9px] font-black text-blue-300 flex items-center gap-1.5 tracking-[0.15em] hover:text-blue-100 transition-colors"
            >
              <span className="w-1 h-1 bg-blue-400 rounded-full shadow-[0_0_5px_#60a5fa]" /> MAPS
            </a>
          )}
          {item.linkExternal && (
            <a 
              href={item.linkExternal} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()} // <-- Cegah modal kebuka kalau klik info
              className="text-[9px] font-black text-slate-400 flex items-center gap-1.5 tracking-[0.15em] hover:text-white transition-colors"
            >
              <span className="w-1 h-1 bg-slate-500 rounded-full" /> INFO
            </a>
          )}
        </div>
      )}
    </div>
  </div>
</motion.div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="text-center py-16 bg-white rounded-[40px] border border-dashed border-slate-200">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rencana masih kosong</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {tripTab === "tugas" && (
  <motion.div 
    key="tugas" 
    initial={{ opacity: 0, x: -10 }} 
    animate={{ opacity: 1, x: 0 }} 
    exit={{ opacity: 0, x: 10 }}
  >
    <div className="space-y-6">
      
      {/* --- FORM TAMBAH TUGAS (HANYA UNTUK OWNER) --- */}
      {auth.currentUser?.uid === data.uidPembuat && (
        <div className="bg-white p-6 rounded-[32px] shadow-lg shadow-slate-200/40 border border-slate-100">
          <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span>📋</span> Tambah Tugas Baru
          </h3>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text" 
              placeholder="Nama tugas (misal: Beli tiket)" 
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-[13px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 placeholder:text-slate-400"
            />
            <div className="flex gap-3">
              <div className="relative w-full sm:w-36">
                <select
                  value={newPIC}
                  onChange={(e) => setNewPIC(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-[13px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none cursor-pointer"
                >
                  <option value="" disabled>Pilih PIC...</option>
                  {data?.listAnggota && data.listAnggota.map((username: string, index: number) => {
                    const displayNama = username.charAt(0).toUpperCase() + username.slice(1);
                    return (
                      <option key={index} value={displayNama}>
                        {displayNama}
                      </option>
                    );
                  })}
                  <option value="Semua Orang">Semua Orang</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>
              <button 
                onClick={() => {
                  if (!newTask.trim()) return; 
                  updateTasksToDB([...tasks, { id: Date.now(), text: newTask, pic: newPIC || "Bebas", isDone: false }]);
                  setNewTask(""); 
                  setNewPIC("");
                }}
                className="bg-cyan-500 hover:bg-cyan-600 active:scale-95 text-white rounded-2xl px-6 py-3 font-black text-lg transition-all shadow-md shadow-cyan-200"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- LIST TUGAS --- */}
      <div className="space-y-3">
        {tasks.map((task) => (
          <div 
            key={task.id} 
            className={`group flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
              task.isDone 
                ? 'bg-slate-50/50 border-slate-100' 
                : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-cyan-200'
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Tombol Checkbox (Bisa diklik siapa saja) */}
              <button 
                onClick={() => 
                  updateTasksToDB(tasks.map(t => t.id === task.id ? { ...t, isDone: !t.isDone } : t))
                }
                className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  task.isDone 
                    ? 'bg-cyan-500 text-white scale-95' 
                    : 'bg-slate-50 border-2 border-slate-200 text-transparent hover:border-cyan-400 hover:bg-cyan-50'
                }`}
              >
                ✓
              </button>
              
              <div>
                <p className={`text-sm font-bold transition-all duration-300 ${
                  task.isDone ? 'text-slate-400 line-through' : 'text-slate-700'
                }`}>
                  {task.text}
                </p>
                <span className={`inline-block mt-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md transition-colors ${
                  task.isDone ? 'bg-slate-100 text-slate-400' : 'bg-orange-50 text-orange-600'
                }`}>
                  👤 {task.pic}
                </span>
              </div>
            </div>

            {/* Tombol Hapus (HANYA UNTUK OWNER) */}
            {auth.currentUser?.uid === data.uidPembuat && (
              <button 
                onClick={() => updateTasksToDB(tasks.filter(t => t.id !== task.id))}
                className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
              </button>
            )}
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl opacity-50">🏖️</div>
            <p className="text-slate-400 font-bold text-sm">Belum ada tugas.</p>
          </div>
        )}
      </div>

    </div>
  </motion.div>
)}

                  {tripTab === "packing" && (
  <motion.div key="packing" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
    <div className="space-y-4">

      {/* --- HEADER PACKING LIST --- */}
      <div className="bg-white p-6 rounded-[32px] shadow-lg shadow-slate-200/40 border border-slate-100 flex items-center justify-between mb-2">
        <div>
          <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span>🧳</span> Checklist Barang Bawaan
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">Biar liburannya tenang, gak ada yang ketinggalan.</p>
        </div>
      </div>

      {/* --- LOOPING KATEGORI ACCORDION --- */}
      {packingItems.map((cat, catIndex) => {
        const isOpen = openCategory === cat.category;
        const totalItems = cat.items.length;
        const doneItems = cat.items.filter((i: any) => i.isDone).length;

        return (
          <div key={catIndex} className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
            
            {/* Tombol Header Kategori */}
            <button
              onClick={() => setOpenCategory(isOpen ? null : cat.category)}
              className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <h4 className="text-sm font-bold text-slate-800">{cat.category}</h4>
                <span className={`text-[10px] font-black px-2 py-1 rounded-md transition-colors ${
                  doneItems === totalItems && totalItems > 0 ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-400'
                }`}>
                  {doneItems}/{totalItems}
                </span>
              </div>
              <motion.div animate={{ rotate: isOpen ? 180 : 0 }} className="text-slate-400 text-xs">
                ▼
              </motion.div>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-5 pt-0 border-t border-slate-50 space-y-3 mt-3">

                    {/* Looping Barang */}
                    {cat.items.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => {
                              const newItems = [...packingItems];
                              const itemToUpdate = newItems[catIndex].items.find((i: any) => i.id === item.id);
                              if (itemToUpdate) itemToUpdate.isDone = !itemToUpdate.isDone;
                              updatePackingToDB(newItems);
                            }}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 shrink-0 ${
                              item.isDone 
                                ? 'bg-cyan-500 text-white scale-95' 
                                : 'bg-slate-50 border-2 border-slate-200 text-transparent hover:border-cyan-400 hover:bg-cyan-50'
                            }`}
                          >
                            ✓
                          </button>
                          
                          <div className="flex flex-col">
                            <span className={`text-[13px] transition-all duration-300 ${
                              item.isDone ? 'text-slate-400 line-through' : 'text-slate-700 font-bold'
                            }`}>
                              {item.name}
                            </span>
                            {item.pic && (
                              <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded w-fit mt-0.5 transition-colors ${
                                item.isDone ? 'bg-slate-100 text-slate-400' : 'bg-orange-50 text-orange-600'
                              }`}>
                                👤 {item.pic}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Tombol Hapus Barang (HANYA OWNER) */}
                        {auth.currentUser?.uid === data.uidPembuat && (
                          <button 
                            onClick={() => {
                              const newItems = [...packingItems];
                              newItems[catIndex].items = newItems[catIndex].items.filter((i: any) => i.id !== item.id);
                              updatePackingToDB(newItems);
                            }}
                            className="text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all p-2 rounded-xl"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                          </button>
                        )}
                      </div>
                    ))}

                    {/* Kalau Kosong */}
                    {cat.items.length === 0 && (
                      <div className="text-center py-4">
                        <p className="text-[11px] font-bold text-slate-300 italic">Belum ada barang bawaan.</p>
                      </div>
                    )}

                    {/* Input Nambah Barang Baru (HANYA OWNER) */}
                    {auth.currentUser?.uid === data.uidPembuat && (
                      <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-slate-50">
                        <input 
                          type="text" 
                          placeholder={`Tambah barang di ${cat.category.split(" ")[1]}...`}
                          value={newItemInput}
                          onChange={(e) => setNewItemInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newItemInput.trim() !== "") {
                              const newItems = [...packingItems];
                              newItems[catIndex].items.push({ 
                                id: Date.now(), 
                                name: newItemInput, 
                                pic: newPackingPIC || "Bebas", 
                                isDone: false 
                              });
                              updatePackingToDB(newItems);
                              setNewItemInput("");
                              setNewPackingPIC("");
                            }
                          }}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                        
                        <div className="flex gap-2">
                          <div className="relative flex-1 sm:w-28">
                            <select
                              value={newPackingPIC}
                              onChange={(e) => setNewPackingPIC(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] font-bold text-slate-600 focus:outline-none appearance-none cursor-pointer pr-8"
                            >
                              <option value="" disabled>Pilih PIC...</option>
                              {data?.listAnggota && data.listAnggota.map((username: string, index: number) => {
                                const displayNama = username.charAt(0).toUpperCase() + username.slice(1);
                                return <option key={index} value={displayNama}>{displayNama}</option>;
                              })}
                              <option value="Semua">Semua Orang</option>
                              <option value="Bebas">Bebas</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] text-slate-400">▼</div>
                          </div>

                          <button 
                            onClick={() => {
                              if (newItemInput.trim() !== "") {
                                const newItems = [...packingItems];
                                newItems[catIndex].items.push({ 
                                  id: Date.now(), 
                                  name: newItemInput, 
                                  pic: newPackingPIC || "Bebas", 
                                  isDone: false 
                                });
                                updatePackingToDB(newItems);
                                setNewItemInput("");
                                setNewPackingPIC("");
                              }
                            }}
                            className="bg-slate-900 text-white px-5 rounded-xl font-bold hover:bg-slate-800 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  </motion.div>
)}
                </AnimatePresence>

              </div>
            ) : (
              // TAMPILAN JIKA MODE BIASA (BUDGET)
              <>
                <div className="flex justify-between items-end mb-6 pl-2">
                  <div>
                    <h3 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Rincian Budget</h3>
                    <p className="text-[10px] text-slate-500">Transparansi alokasi dana project</p>
                  </div>
                  {auth.currentUser?.uid === data.uidPembuat && (
                    <button 
                      onClick={() => setShowItineraryForm(!showItineraryForm)}
                      className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-3 py-2 rounded-xl active:scale-95 transition-all"
                    >
                      {showItineraryForm ? "Batal" : "+ Tambah"}
                    </button>
                  )}
                </div>

                {/* Form Tambah Budget */}
                <AnimatePresence>
                  {showItineraryForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-slate-900 p-5 rounded-3xl mb-6 overflow-hidden shadow-lg">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Nama Pengeluaran</label>
                      <input type="text" value={kegiatan} onChange={(e) => setKegiatan(e.target.value)} placeholder="Contoh: Beli Kado" className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:border-cyan-500 text-sm text-white font-medium mb-4" />
                      
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Estimasi Biaya</label>
                      <div className="relative mb-4">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-sm">Rp</span>
                        <input type="number" value={estimasiBiaya} onChange={(e) => setEstimasiBiaya(e.target.value)} placeholder="500000" className="w-full p-3 pl-10 rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:border-cyan-500 text-sm text-white font-medium" />
                      </div>

                      <button onClick={handleAddItinerary} className="w-full bg-cyan-500 text-slate-900 font-bold py-3 rounded-xl active:scale-95 transition-all text-sm">
                        Simpan Budget
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* List Budget */}
                {data.itinerary && data.itinerary.length > 0 ? (
                  <div className="space-y-3">
                    <div className="bg-cyan-50 p-4 rounded-2xl border border-cyan-100 flex justify-between items-center mb-4">
                      <span className="text-xs font-bold text-cyan-800 uppercase">Total Estimasi</span>
                      <span className="text-sm font-black text-cyan-600">
                        Rp {data.itinerary.reduce((acc: number, curr: any) => acc + curr.estimasiBiaya, 0).toLocaleString('id-ID')}
                      </span>
                    </div>

                    {data.itinerary.map((item: any, index: number) => (
                      <div key={index} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 rounded-l-2xl"></div>
                        <div className="pl-2">
                          <p className="text-sm font-bold text-slate-800">{item.kegiatan}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-1">Ditambahkan {new Date(item.waktu?.toDate()).toLocaleDateString('id-ID')}</p>
                        </div>
                        <p className="text-sm font-black text-slate-800">Rp {item.estimasiBiaya?.toLocaleString('id-ID')}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-white rounded-[32px] border border-dashed border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Belum ada rincian budget</p>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* --- KONTEN TAB: ANGGOTA --- */}
{activeTab === "anggota" && (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
    
    {data.tipe === "bebas" ? (
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 text-center py-12 shadow-sm">
        <div className="w-16 h-16 bg-cyan-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🌍</div>
        <h3 className="font-bold text-slate-800 mb-2">Target Bebas</h3>
        <p className="text-sm text-slate-500">Project ini nggak punya patokan harga per orang. Siapa aja boleh nyumbang berapapun!</p>
      </div>
    ) : (
      <div className="space-y-4">
        {/* Header Ringkasan */}
        <div className="bg-slate-900 p-5 rounded-3xl text-white shadow-lg flex justify-between items-center mb-6">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Per Orang</p>
            <p className="text-xl font-black text-cyan-400">Rp {data.targetPerOrang?.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-white/10 px-3 py-1.5 rounded-xl">
            <p className="text-xs font-bold text-slate-300">👥 {data.listAnggota?.length || 0} Orang</p>
          </div>
        </div>

        <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider pl-2">Status Pembayaran</h3>
        
        {data.listAnggota?.map((username: string, index: number) => {
          // 1. HITUNG TOTAL SETORAN (Gue tambahin toLowerCase biar makin akurat)
          const totalSetoran = data.riwayat
            ?.filter((r: any) => 
              r.username?.toLowerCase() === username.toLowerCase() || 
              r.nama?.toLowerCase().replace(/\s/g, "") === username.toLowerCase()
            )
            .reduce((acc: number, curr: any) => acc + curr.nominal, 0) || 0;
          
          // 2. LOGIKA NAMA DISPLAY
          let namaAsli = username;
          if (username === data.usernamePembuat) {
            namaAsli = data.pembuat;
          } else {
            // Cari nama dari riwayat transaksi terbaru milik user ini
            const userRiwayat = data.riwayat?.find((r: any) => r.username?.toLowerCase() === username.toLowerCase());
            if (userRiwayat) namaAsli = userRiwayat.nama;
          }
          
          const displayNama = namaAsli === username 
            ? username.charAt(0).toUpperCase() + username.slice(1) 
            : namaAsli;

          // 3. PROGRESS & STATUS LUNAS
          // Pakai Math.floor biar gak lewat dari 100% kalau ada yang bayar lebih
          const progressMember = Math.min(Math.floor((totalSetoran / data.targetPerOrang) * 100), 100) || 0;
          const isLunas = totalSetoran >= data.targetPerOrang;

          return (
            <div key={index} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden flex flex-col gap-3">
              {isLunas && (
                <div className="absolute top-0 right-0 bg-teal-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl z-10 shadow-sm">
                  LUNAS 🔥
                </div>
              )}
              
              <div className="flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm uppercase ${isLunas ? 'bg-teal-50 text-teal-600 border border-teal-100' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                    {displayNama.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 line-clamp-1">{displayNama}</p>
                    <p className="text-[10px] font-bold text-cyan-600 tracking-wide">@{username}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className={`text-sm font-black ${isLunas ? 'text-teal-500' : 'text-slate-800'}`}>
                    Rp {totalSetoran.toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">
                    {isLunas ? 'Selesai' : `Sisa Rp ${(data.targetPerOrang - totalSetoran).toLocaleString('id-ID')}`}
                  </p>
                </div>
              </div>

              {/* Progress Bar Per Orang */}
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden z-10">
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: `${progressMember}%` }} 
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full ${isLunas ? 'bg-teal-500' : 'bg-gradient-to-r from-cyan-500 to-teal-400'}`} 
                />
              </div>
              
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                {progressMember}% Progres Pembayaran
              </p>
            </div>
          );
        })}
      </div>
    )}
  </motion.div>
)}

      </section>

      {/* Custom Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-xl border z-50 flex items-center gap-2 whitespace-nowrap ${
              toast.type === "success" 
                ? "bg-teal-50 border-teal-200 text-teal-700" 
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

{/* --- MODAL EDIT TIPS (PLACEHOLDER) --- */}
<AnimatePresence>
  {isEditTipsOpen && (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => setIsEditTipsOpen(false)}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      {/* Box Input */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl overflow-hidden"
      >
        <div className="mb-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Edit Tips Day {selectedDay}</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter italic">Update info penting buat grup lu</p>
        </div>

        {/* Textarea Placeholder */}
        <textarea 
          rows={5}
          className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all mb-6 placeholder:italic"
          placeholder="Tulis tips harian di sini... (Misal: Bawa paspor, sewa baju adat, dll)"
          value={tempTips}
          onChange={(e) => setTempTips(e.target.value)}
        />

        <div className="flex gap-3">
          <button 
            onClick={() => setIsEditTipsOpen(false)}
            className="flex-1 py-4 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all"
          >
            Batal
          </button>
          <button 
  onClick={handleUpdateTips} // <--- GANTI JADI INI
  className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/20 active:scale-95 transition-all"
>
  Simpan Perubahan
</button>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>
{/* --- MODAL DETAIL & EDIT RUNDOWN --- */}
<AnimatePresence>
  {selectedItem && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => setSelectedItem(null)}
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
      />

      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="bg-slate-50 border-b border-slate-100 p-5 flex items-center justify-between sticky top-0 z-10">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 bg-cyan-100 px-2 py-1 rounded-md">
              Day {selectedItem.day} • {selectedItem.waktu}
            </span>
            <h3 className="font-black text-slate-800 text-lg mt-2 leading-tight">
              {isEditingRundown ? "Edit Jadwal" : selectedItem.aktivitas}
            </h3>
          </div>
          <button onClick={() => setSelectedItem(null)} className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700">✕</button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {isEditingRundown ? (
            /* --- MODE EDIT --- */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Hari Ke-</label>
                  <input type="number" value={editForm.day} onChange={(e) => setEditForm({...editForm, day: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Jam</label>
                  <input type="time" value={editForm.waktu} onChange={(e) => setEditForm({...editForm, waktu: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none mt-1" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Aktivitas</label>
                <input type="text" value={editForm.aktivitas} onChange={(e) => setEditForm({...editForm, aktivitas: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none mt-1" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Lokasi Singkat</label>
                <input type="text" value={editForm.lokasi} onChange={(e) => setEditForm({...editForm, lokasi: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none mt-1" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">URL Foto</label>
                <input type="text" value={editForm.foto || ""} onChange={(e) => setEditForm({...editForm, foto: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Link Maps</label>
                  <input type="text" value={editForm.linkMaps || ""} onChange={(e) => setEditForm({...editForm, linkMaps: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Link Info</label>
                  <input type="text" value={editForm.linkExternal || ""} onChange={(e) => setEditForm({...editForm, linkExternal: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Transport</label>
                  <input type="text" value={editForm.transport || ""} onChange={(e) => setEditForm({...editForm, transport: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Biaya (Rp)</label>
                  <input type="number" value={editForm.biaya} onChange={(e) => setEditForm({...editForm, biaya: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none mt-1" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Catatan Tambahan</label>
                <textarea value={editForm.catatan || ""} onChange={(e) => setEditForm({...editForm, catatan: e.target.value})} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none mt-1" />
              </div>
            </div>
          ) : (
            /* --- MODE BACA (INFO) --- */
            <div className="space-y-6">
              {selectedItem.foto && (
                <div className="w-full h-40 rounded-2xl overflow-hidden shadow-sm">
                  <img src={selectedItem.foto} className="w-full h-full object-cover" alt="Lokasi" />
                </div>
              )}
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center shrink-0 text-xl">📍</div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Lokasi</p>
                  <p className="text-sm font-bold text-slate-800">{selectedItem.lokasi || "Belum ada lokasi spesifik"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100/50">
                  <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-1">💸 Estimasi Biaya</p>
                  <p className="text-sm font-black text-orange-600">{selectedItem.biaya > 0 ? `Rp ${selectedItem.biaya.toLocaleString('id-ID')}` : "Gratis / Sudah Cover"}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100/50">
                  <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">🚗 Transport</p>
                  <p className="text-sm font-black text-purple-600">{selectedItem.transport || "-"}</p>
                </div>
              </div>
              {selectedItem.catatan && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100/50">
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">📝 Catatan</p>
                  <p className="text-sm font-medium text-amber-800 whitespace-pre-line">{selectedItem.catatan}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border-t border-slate-100 p-5 flex gap-3 sticky bottom-0">
          {isEditingRundown ? (
            <>
              <button onClick={() => setIsEditingRundown(false)} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-colors text-sm">Batal</button>
              <button onClick={handleSaveEditRundown} className="flex-1 py-3.5 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-2xl shadow-md shadow-cyan-200 transition-colors text-sm">Simpan Update</button>
            </>
          ) : (
            <>
              {/* Hanya tampilkan tombol edit/delete kalau ini pembuat trip */}
              {auth.currentUser?.uid === data.uidPembuat && (
                <>
                  <button 
                    onClick={() => { setEditForm(selectedItem); setIsEditingRundown(true); }}
                    className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-colors text-sm shadow-md"
                  >
                    ✏️ Edit
                  </button>
                  <button 
  onClick={() => triggerDelete(selectedItem.id)} 
  className="w-14 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 font-bold rounded-2xl transition-colors"
>
  🗑️
</button>


                </>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>

{/* --- MODAL CUSTOM KONFIRMASI HAPUS --- */}
<AnimatePresence>
  {itemToDelete && (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Background Gelap (Bisa diklik buat batal) */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={() => setItemToDelete(null)}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
      />

      {/* Kotak Pop-up Keren */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative bg-white w-full max-w-[320px] rounded-[32px] shadow-2xl p-6 text-center border border-white/50"
      >
        {/* Ikon Peringatan (Animasi getar dikit) */}
        <motion.div 
          animate={{ rotate: [-5, 5, -5, 5, 0] }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5 border-[6px] border-white shadow-[0_0_20px_#fee2e2]"
        >
          <span className="text-4xl">🗑️</span>
        </motion.div>

        {/* Teks Konfirmasi */}
        <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">Hapus Jadwal?</h3>
        <p className="text-xs font-medium text-slate-500 mb-8 leading-relaxed px-2">
          Jadwal ini bakal dihapus permanen dari timeline. Yakin mau lanjut?
        </p>

        {/* Tombol Aksi */}
        <div className="flex gap-3">
          <button 
            onClick={() => setItemToDelete(null)}
            className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-colors text-sm"
          >
            Batal
          </button>
          <button 
            onClick={executeDeleteRundown}
            className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold rounded-2xl shadow-lg shadow-red-500/30 transition-all text-sm"
          >
            Yakin, Hapus
          </button>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>

{/* --- AREA BAHAYA (HANYA OWNER) --- */}
{auth.currentUser?.uid === data.uidPembuat && (
  <div className="max-w-md mx-auto px-6 pb-20 mt-10">
    <button 
  onClick={() => setShowDeleteProjectModal(true)} // <-- Buka modal custom
  className="w-full py-4 rounded-[24px] bg-red-50 border border-red-100 text-red-500 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-100 transition-all active:scale-95"
>
  🗑️ Bubarkan Project Patungan
</button>
    <p className="text-[9px] text-slate-400 text-center mt-3 font-medium px-10 leading-relaxed">
      Aksi ini permanen. Semua data Rundown, Tugas, dan Dana akan dihapus dari database.
    </p>
  </div>
)}

{/* --- MODAL KONFIRMASI BUBARKAN PROJECT --- */}
<AnimatePresence>
  {showDeleteProjectModal && (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => setShowDeleteProjectModal(false)}
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
      />

      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative bg-white w-full max-w-[340px] rounded-[40px] shadow-2xl p-8 text-center border border-white/50"
      >
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border-[6px] border-white shadow-[0_0_30px_#fee2e2]">
          <span className="text-4xl">☢️</span>
        </div>

        <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tighter uppercase">Bubarkan Project?</h3>
        <p className="text-xs font-medium text-slate-500 mb-8 leading-relaxed px-2">
          Hati-hati! Semua data dana, rundown, dan tugas bakal ilang <span className="font-bold text-red-500">selamanya</span> buat semua anggota.
        </p>

        <div className="flex flex-col gap-3">
          <button 
            onClick={executeDeleteProject}
            className="w-full py-4 bg-red-500 hover:bg-red-600 active:scale-95 text-white font-black rounded-2xl shadow-lg shadow-red-500/30 transition-all text-[11px] uppercase tracking-widest"
          >
            Ya, Bubarkan Sekarang
          </button>
          <button 
            onClick={() => setShowDeleteProjectModal(false)}
            className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-colors text-[11px] uppercase tracking-widest"
          >
            Batalin Saja
          </button>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>

    </main>
  );
}