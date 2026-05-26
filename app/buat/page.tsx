"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import LoadingScreen from "@/components/ui/LoadingScreen";
import BackButton from "@/components/ui/BackButton";
import { useToast } from "@/components/providers/ToastProvider";
import { MapPin, Users, Calendar, Plane } from "lucide-react";

export default function BuatPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [nama, setNama] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [amount, setAmount] = useState("");
  const [isTrip, setIsTrip] = useState(true);
  const [anggota, setAnggota] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");

  // Validation
  const [invalidUsers, setInvalidUsers] = useState<string[]>([]);
  const [validatingUsers, setValidatingUsers] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) { router.push("/"); return; }
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  // Validate usernames with debounce
  useEffect(() => {
    if (!anggota.trim()) { setInvalidUsers([]); return; }

    const timer = setTimeout(async () => {
      setValidatingUsers(true);
      const usernames = anggota
        .split(",")
        .map((u) => u.trim().replace("@", "").toLowerCase())
        .filter(Boolean);

      const invalid: string[] = [];

      for (const username of usernames) {
        const q = query(
          collection(db, "users"),
          where("username", "==", username)
        );
        const snap = await getDocs(q);
        if (snap.empty) invalid.push(username);
      }

      setInvalidUsers(invalid);
      setValidatingUsers(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [anggota]);

  const handleSubmit = async () => {
    if (!nama || !amount || !deskripsi) {
      return showToast("Isi semua data dulu.", "error");
    }

    if (!anggota.trim()) {
      return showToast("Tambahin minimal 1 username temen.", "error");
    }

    if (invalidUsers.length > 0) {
      return showToast(
        `Username "${invalidUsers[0]}" tidak terdaftar.`,
        "error"
      );
    }

    setSubmitting(true);
    try {
      if (!user) throw new Error("Belum login");

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      const namaAsli = userDoc.exists()
        ? userDoc.data().displayName
        : user.displayName;
      const usernameAsli = userDoc.exists() ? userDoc.data().username : "";

      // Build member list
      const teman = anggota
        .split(",")
        .map((u) => u.trim().replace("@", "").toLowerCase());
      const listAnggota = [
        ...new Set([usernameAsli.toLowerCase(), ...teman]),
      ].filter(Boolean);

      // Calculate targets (per_orang only)
      const targetIndividu = parseInt(amount);
      const targetTotal = targetIndividu * listAnggota.length;

      await addDoc(collection(db, "patungan"), {
        namaPatungan: nama,
        deskripsi,
        tipe: "per_orang",
        isTrip,
        targetDana: targetTotal,
        targetPerOrang: targetIndividu,
        pembuat: namaAsli,
        usernamePembuat: usernameAsli.toLowerCase(),
        fotoPembuat: user.photoURL,
        uidPembuat: user.uid,
        listAnggota,
        terkumpul: 0,
        status: "active",
        tanggalMulai: tanggalMulai ? new Date(tanggalMulai) : null,
        tanggalSelesai: tanggalSelesai ? new Date(tanggalSelesai) : null,
        createdAt: serverTimestamp(),
      });

      showToast("Project berhasil dibuat!", "success");
      setTimeout(() => router.push("/"), 1000);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      showToast(
        message === "Belum login" ? "Login dulu." : "Gagal bikin project.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <main className="min-h-screen bg-slate-50 font-sans pb-12">
      {/* Navbar */}
      <nav className="p-4 flex items-center gap-2 bg-white border-b border-slate-100 sticky top-0 z-50">
        <BackButton href="/" />
        <h1 className="font-bold text-slate-800 text-sm">Bikin Project</h1>
      </nav>

      <section className="max-w-lg mx-auto p-6 space-y-6">
        {/* Type Toggle */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-3">
            Tipe Project
          </p>
          <div className="flex gap-3">
            {[
              { id: true, label: "Liburan / Trip", icon: <Plane size={16} />, desc: "Dengan itinerary & packing" },
              { id: false, label: "Patungan Biasa", icon: <Users size={16} />, desc: "Kado, event, dll" },
            ].map((opt) => (
              <button
                key={String(opt.id)}
                onClick={() => setIsTrip(opt.id)}
                className={`flex-1 p-4 rounded-xl text-left transition-all border ${
                  isTrip === opt.id
                    ? "border-cyan-500 bg-cyan-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                    isTrip === opt.id
                      ? "bg-cyan-500 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {opt.icon}
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  {opt.label}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-medium text-slate-400 mb-1.5 block uppercase tracking-wider">
              Nama Project
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Trip Bali 2027"
              className="w-full p-4 rounded-2xl bg-white border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-400 mb-1.5 block uppercase tracking-wider">
              Deskripsi
            </label>
            <textarea
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Liburan bareng sebelum wisuda"
              className="w-full p-4 rounded-2xl bg-white border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500 transition-colors resize-none h-24"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-400 mb-1.5 block uppercase tracking-wider">
              Target Per Orang (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                Rp
              </span>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500000"
                className="w-full p-4 pl-12 rounded-2xl bg-white border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-400 mb-1.5 block uppercase tracking-wider">
              Username Anggota
            </label>
            <textarea
              value={anggota}
              onChange={(e) => setAnggota(e.target.value)}
              placeholder="@john, @doe (pisah pakai koma)"
              className="w-full p-4 rounded-2xl bg-white border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500 transition-colors resize-none h-20"
            />
            {invalidUsers.length > 0 && (
              <p className="text-[11px] text-red-500 font-medium mt-2">
                Username tidak ditemukan: {invalidUsers.join(", ")}
              </p>
            )}
            {validatingUsers && (
              <p className="text-[11px] text-slate-400 font-medium mt-2 animate-pulse">
                Mengecek username...
              </p>
            )}
          </div>

          {/* Trip dates */}
          <AnimatePresence>
            {isTrip && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 mb-1.5 block uppercase tracking-wider">
                      Tanggal Mulai
                    </label>
                    <input
                      type="date"
                      value={tanggalMulai}
                      onChange={(e) => setTanggalMulai(e.target.value)}
                      className="w-full p-4 rounded-2xl bg-white border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 mb-1.5 block uppercase tracking-wider">
                      Tanggal Selesai
                    </label>
                    <input
                      type="date"
                      value={tanggalSelesai}
                      onChange={(e) => setTanggalSelesai(e.target.value)}
                      className="w-full p-4 rounded-2xl bg-white border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Preview Card */}
        {nama && amount && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-5 rounded-2xl border border-slate-200"
          >
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-3">
              Preview
            </p>
            <h4 className="text-base font-bold text-slate-800 mb-2">{nama}</h4>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="bg-slate-50 px-2.5 py-1 rounded-lg">
                {isTrip ? "🌴 Trip" : "💰 Patungan"}
              </span>
              <span className="bg-slate-50 px-2.5 py-1 rounded-lg">
                Rp {parseInt(amount || "0").toLocaleString("id-ID")}/orang
              </span>
              {anggota && (
                <span className="bg-slate-50 px-2.5 py-1 rounded-lg">
                  ~{anggota.split(",").filter(Boolean).length + 1} orang
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !nama || !amount || !deskripsi || !anggota.trim()}
          className="w-full py-4 bg-slate-900 text-white font-semibold rounded-2xl transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {submitting ? "Membuat..." : "Buat Project"}
        </button>
      </section>
    </main>
  );
}