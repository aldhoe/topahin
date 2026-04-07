"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { auth, googleProvider, db } from "@/lib/firebase"; 
import { useRouter } from "next/navigation";
import { signInWithPopup, onAuthStateChanged, User, signOut } from "firebase/auth";
import { doc, setDoc, getDoc, collection, query, orderBy, onSnapshot, where } from "firebase/firestore";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [patunganList, setPatunganList] = useState<any[]>([]);
  const words = ["Kado Temen", "Liburan", "Sewa Villa", "Project"];
  const [wordIndex, setWordIndex] = useState(0);
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);

  // Pantau Login & Ambil Profil Firestore secara otomatis
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data());
          } else {
            router.push("/setup-profil");
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // --- UPDATE: QUERY PAKAI FILTER LIST ANGGOTA ---
  useEffect(() => {
    if (user && profile?.username) {
      const myUsername = profile.username.toLowerCase();

      const q = query(
        collection(db, "patungan"), 
        where("listAnggota", "array-contains", myUsername),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        setPatunganList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => {
        console.error("Query Error:", err);
      });

      return () => unsubscribe();
    }
  }, [user, profile]);

  // --- HITUNG TOTAL TERKUMPUL SECARA DINAMIS ---
  const totalTerkumpulSemua = patunganList.reduce((acc, item) => acc + (item.terkumpul || 0), 0);

  // Animasi Teks
  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        router.push("/setup-profil");
      } else {
        router.refresh();
      }
    } catch (error: any) {
      if (error.code !== "auth/popup-closed-by-user") console.error(error);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-cyan-500 font-bold">Loading Topahin...</div>;

  return (
    <main className="min-h-screen bg-slate-50 font-sans">
      
      <nav className="sticky top-0 z-50 w-full px-6 py-3 flex justify-between items-center bg-white/70 backdrop-blur-md border-b border-slate-200/50">
        <Link href="/" className="active:scale-95 transition-transform">
          <img src="/topahinbanner.png" alt="Logo Topahin" className="h-8 w-auto" />
        </Link>
        {user ? (
          <div className="flex items-center gap-3">
            <button onClick={() => signOut(auth)} className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors">LOGOUT</button>
            <img src={user.photoURL || ""} className="w-9 h-9 rounded-full border-2 border-cyan-500 shadow-sm" />
          </div>
        ) : (
          <button onClick={handleLogin} className="text-sm font-bold text-cyan-600 px-5 py-2 rounded-full bg-cyan-50 active:scale-95 transition-all">Masuk</button>
        )}
      </nav>

      <AnimatePresence mode="wait">
        {!user ? (
          <motion.section 
            key="landing"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center text-center px-6 pt-20"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm mb-8">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
              <span className="text-xs font-semibold text-slate-600">Topah Jadi Gampang</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-800 leading-tight mb-6 tracking-tight">
              Kumpulin Dana Buat <br />
              <div className="relative h-[1.2em] overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={words[wordIndex]}
                    initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}
                    className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-teal-400"
                  >
                    {words[wordIndex]}
                  </motion.span>
                </AnimatePresence>
              </div>
              Tinggal Topahin.
            </h1>
            <p className="text-slate-500 max-w-md mb-10">Bikin patungan jadi lebih asyik, transparan, dan tanpa drama. Login sekarang buat mulai!</p>
            <button onClick={handleLogin} className="bg-slate-900 text-white font-bold py-4 px-10 rounded-2xl shadow-xl active:scale-95 transition-all">
              Mulai Sekarang Gratis
            </button>
          </motion.section>
        ) : (
          <motion.section 
            key="dashboard"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="p-6 max-w-5xl mx-auto w-full"
          >
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-2xl font-black text-slate-800">
                  Halo, {profile?.displayName || user?.displayName?.split(' ')[0]}! 
                </h2>
                <p className="text-xs font-bold text-cyan-600">@{profile?.username || "loading..."}</p>
              </div>
              <Link href="/buat">
                <button className="bg-gradient-to-tr from-cyan-500 to-teal-400 text-white p-4 rounded-2xl shadow-lg shadow-cyan-500/20 active:scale-95 transition-all">
                  <span className="font-bold">+ Bikin</span>
                </button>
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Patungan Aktif</p>
                <p className="text-xl font-black text-slate-800">{patunganList.length}</p>
              </div>
              <div className="bg-cyan-500 p-4 rounded-3xl shadow-lg text-white text-center">
                <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Total Terkumpul</p>
                <p className="text-xl font-black">Rp {totalTerkumpulSemua.toLocaleString('id-ID')}</p>
              </div>
            </div>

            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">Explore Patungan 🔥</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {patunganList.map((item) => {
                const progress = Math.min(Math.round((item.terkumpul / item.targetDana) * 100), 100) || 0;
                return (
                  <Link href={`/patungan/${item.id}`} key={item.id} className="block">
                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:translate-y-[-4px] transition-all cursor-pointer">
                      <div className="flex items-center gap-2 mb-4">
                        <img src={item.fotoPembuat} className="w-6 h-6 rounded-full border border-slate-100" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.pembuat}</span>
                      </div>
                      <h4 className="font-bold text-slate-800 mb-1 line-clamp-1">{item.namaPatungan}</h4>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full my-4 overflow-hidden">
                        <div className="h-full bg-cyan-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Target</span>
                          <span className="text-xs font-bold text-slate-700 font-mono">Rp {item.targetDana?.toLocaleString('id-ID')}</span>
                        </div>
                        <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-3 py-2 rounded-xl border border-cyan-100 shadow-sm shadow-cyan-500/5">
                          {progress}% DETAIL
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}