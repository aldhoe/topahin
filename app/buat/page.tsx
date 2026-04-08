"use client";

import { useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc, getDocs, query, where, collectionGroup } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Scale, Target } from "lucide-react";

export default function BuatPatungan() {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [tipe, setTipe] = useState<"bebas" | "bagi_rata" | "per_orang">("bagi_rata");
  const [amount, setAmount] = useState("");
  const [anggota, setAnggota] = useState("");
  const [isTrip, setIsTrip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [invalidUsers, setInvalidUsers] = useState<string[]>([]);

  // --- STATE TOAST ---
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

const validateUsernames = async (input: string) => {
  if (!input.trim()) {
    setInvalidUsers([]);
    return;
  }

  setValidating(true);
  const usernames = input.split(",").map(u => u.trim().replace("@", "").toLowerCase()).filter(Boolean);
  const invalid: string[] = [];

  try {
    // Kita cek satu-satu ke koleksi 'users' berdasarkan field 'username'
    for (const uname of usernames) {
      const q = query(collection(db, "users"), where("username", "==", uname));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        invalid.push(uname);
      }
    }
    setInvalidUsers(invalid);
  } catch (error) {
    console.error("Error validating usernames:", error);
  } finally {
    setValidating(false);
  }
};

  const handleSubmit = async () => {
  // 1. Validasi Input Dasar
  if (!nama || !amount || !deskripsi) {
    return showToast("Isi semua data dasarnya dulu ya! 📋", "error");
  }
  
  // 2. Validasi Anggota jika bukan tipe bebas
  if (tipe !== "bebas" && !anggota) {
    return showToast("Masukin minimal 1 username temen lu dong! 👥", "error");
  }

  // 3. CEK VALIDASI USERNAME (Jangan kasih lewat kalau ada yang ngaco)
  if (invalidUsers.length > 0) {
    return showToast(`Username "${invalidUsers[0]}" tidak terdaftar. Cek lagi!`, "error");
  }

  setLoading(true);
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Belum login");

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    const namaAsli = userDoc.exists() ? userDoc.data().displayName : user.displayName;
    const usernameAsli = userDoc.exists() ? userDoc.data().username : "";

    // Siapkan array anggota (Pembuat otomatis masuk dengan lowercase)
    let listAnggota = [usernameAsli.toLowerCase()]; 
    if (tipe !== "bebas") {
      const teman = anggota.split(",").map(u => u.trim().replace("@", "").toLowerCase());
      // Pakai Set biar gak ada username duplikat
      listAnggota = [...new Set([...listAnggota, ...teman])].filter(Boolean);
    }

    // LOGIKA MATEMATIKA
    let targetTotal = parseInt(amount);
    let targetIndividu = 0;

    if (tipe === "bagi_rata") {
      targetIndividu = Math.round(targetTotal / listAnggota.length);
    } else if (tipe === "per_orang") {
      targetIndividu = parseInt(amount);
      targetTotal = targetIndividu * listAnggota.length; 
    }

    // 4. Simpan ke Firestore
    await addDoc(collection(db, "patungan"), {
      namaPatungan: nama,
      deskripsi: deskripsi,
      tipe: tipe,
      isTrip: tipe === "per_orang" ? isTrip : false,
      targetDana: targetTotal,
      targetPerOrang: targetIndividu,
      pembuat: namaAsli,
      usernamePembuat: usernameAsli.toLowerCase(),
      fotoPembuat: user.photoURL,
      uidPembuat: user.uid,
      listAnggota: listAnggota, 
      terkumpul: 0,
      createdAt: serverTimestamp(),
    });

    // Notifikasi Sukses & Redirect
    showToast("Project berhasil dibuat! 🔥", "success");
    setTimeout(() => {
      router.push("/");
    }, 1500);

  } catch (error: any) {
    console.error(error);
    showToast(error.message === "Belum login" ? "Login dulu yuk! 🔑" : "Gagal bikin project, coba lagi ya. ❌", "error");
  } finally {
    setLoading(false);
  }
};

  return (
    <main className="min-h-screen bg-slate-50 font-sans pb-20">
      <nav className="p-4 flex items-center bg-white border-b border-slate-100 sticky top-0 z-10">
        <Link href="/" className="p-2 text-slate-400">←</Link>
        <h1 className="ml-2 font-bold text-slate-800">Buat Project Baru</h1>
      </nav>

      <section className="max-w-xl mx-auto p-6 mt-4">
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
          
          {/* Tipe Patungan - Sisa 2 Opsi Solid */}
<div>
  <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 pl-1">
    Metode Patungan
  </label>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    
    {/* BAGI RATA */}
    <button 
      type="button"
      onClick={() => setTipe("bagi_rata")} 
      className={`p-6 rounded-[32px] border-2 text-left transition-all group relative overflow-hidden ${
        tipe === "bagi_rata" ? "border-cyan-500 bg-cyan-50/50 shadow-md shadow-cyan-100" : "border-slate-100 bg-white hover:border-slate-200 shadow-sm"
      }`}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${
        tipe === "bagi_rata" ? "bg-cyan-500 text-white scale-110 shadow-lg shadow-cyan-200" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
      }`}>
        <Scale size={24} strokeWidth={2.5} />
      </div>
      <h4 className="font-black text-slate-800 text-base tracking-tight">Bagi Rata</h4>
      <p className="text-[11px] text-slate-500 font-bold leading-relaxed mt-1 opacity-80">
        Total biaya otomatis dibagi rata ke semua anggota tim.
      </p>
    </button>

    {/* PER ORANG */}
    <button 
      type="button"
      onClick={() => setTipe("per_orang")} 
      className={`p-6 rounded-[32px] border-2 text-left transition-all group relative overflow-hidden ${
        tipe === "per_orang" ? "border-cyan-500 bg-cyan-50/50 shadow-md shadow-cyan-100" : "border-slate-100 bg-white hover:border-slate-200 shadow-sm"
      }`}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${
        tipe === "per_orang" ? "bg-cyan-500 text-white scale-110 shadow-lg shadow-cyan-200" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
      }`}>
        <Target size={24} strokeWidth={2.5} />
      </div>
      <h4 className="font-black text-slate-800 text-base tracking-tight">Per Orangan</h4>
      <p className="text-[11px] text-slate-500 font-bold leading-relaxed mt-1 opacity-80">
        Tentukan target nominal berbeda untuk tiap-tiap orang.
      </p>
    </button>
    
  </div>
</div>

          {/* Nama Project */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nama Project</label>
            <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Contoh: Sewa Villa Puncak" className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:border-cyan-500 font-bold text-slate-800" />
          </div>

          {/* Nominal */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
              {tipe === "bebas" ? "Target Dana Keseluruhan" : tipe === "bagi_rata" ? "Total Biaya (Nanti dibagi rata)" : "Jatah Bayar Per Orang"}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={tipe === "per_orang" ? "500000" : "20000000"} className="w-full p-4 pl-12 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:border-cyan-500 font-bold text-slate-800" />
            </div>
          </div>

          {/* Form Anggota */}
<AnimatePresence>
  {tipe !== "bebas" && (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <label className="block text-xs font-bold text-slate-400 uppercase mb-2 mt-2 flex justify-between items-center">
        <span>Siapa aja yang ikut?</span>
        {validating && <span className="text-[9px] text-cyan-500 animate-pulse tracking-widest font-black">MENGECEK...</span>}
      </label>

      <textarea 
        value={anggota} 
        onChange={(e) => setAnggota(e.target.value)}
        onBlur={(e) => validateUsernames(e.target.value)} // Fungsi pengecekan jalan pas lu pindah fokus input
        placeholder="Pisahkan dengan koma. Contoh: dinda, budi" 
        className={`w-full p-4 rounded-2xl bg-slate-50 border transition-all duration-300 text-sm text-slate-800 font-medium resize-none h-24 outline-none ${
          invalidUsers.length > 0 
            ? 'border-red-300 focus:border-red-500 bg-red-50/30' 
            : 'border-slate-100 focus:border-cyan-500'
        }`} 
      />

      {/* Tanda Peringatan Kalau Username Gak Terdaftar */}
      <AnimatePresence>
        {invalidUsers.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 p-3 bg-red-50 rounded-xl border border-red-100"
          >
            <p className="text-[10px] font-black text-red-600 uppercase leading-relaxed tracking-tight">
              ⚠️ Username tidak ditemukan: <span className="underline decoration-red-300 decoration-2">{invalidUsers.join(", ")}</span>.
              <br/>
              <span className="opacity-70 font-bold">Minta mereka buat akun dulu ya!</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-[10px] font-bold text-cyan-600 mt-2 bg-cyan-50 p-2 rounded-lg mb-4">
        *Username kamu otomatis dihitung sebagai anggota ke-1.
      </p>

      {/* --- Toggle Mode Liburan --- */}
      {tipe === "per_orang" && (
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 mt-4 shadow-sm">
          <div>
            <p className="text-sm font-bold text-slate-800">Mode Trip Liburan ✈️</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Aktifkan tab Itinerary (Rundown harian)</p>
          </div>
          <button 
            onClick={() => setIsTrip(!isTrip)}
            className={`w-12 h-6 rounded-full flex items-center transition-all p-1 ${isTrip ? "bg-cyan-500 justify-end" : "bg-slate-200 justify-start"}`}
          >
            <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-sm" />
          </button>
        </div>
      )}
    </motion.div>
  )}
</AnimatePresence>

          {/* Deskripsi */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Deskripsi / Catatan</label>
            <textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="Jelasin detailnya di sini..." className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:border-cyan-500 text-sm text-slate-800 resize-none h-32" />
          </div>

          <button onClick={handleSubmit} disabled={loading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl active:scale-95 transition-all disabled:opacity-50 mt-4 shadow-lg shadow-slate-200">
            {loading ? "Menyimpan..." : "Buat Project Sekarang"}
          </button>
        </div>
      </section>

      {/* --- CUSTOM TOAST NOTIFICATION --- */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-10 left-0 right-0 z-[999] flex justify-center px-4 pointer-events-none"
          >
            <div className={`
              flex items-center gap-3 px-6 py-4 rounded-[24px] shadow-2xl backdrop-blur-md border
              ${toast.type === "success" 
                ? "bg-emerald-500/90 border-emerald-400 text-white" 
                : "bg-slate-900/90 border-slate-700 text-white"}
            `}>
              <span className="text-xl">
                {toast.type === "success" ? "✅" : "⚠️"}
              </span>
              <p className="text-sm font-bold tracking-tight">
                {toast.message}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}