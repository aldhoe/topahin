"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";


export default function SetupProfil() {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/");
        return;
      }
      // Cek jika sudah ada profil, langsung lempar ke home
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        router.push("/");
      }
      setChecking(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleSave = async () => {
    if (!displayName || !username) return alert("Isi semua data");
    
    setLoading(true);
    const user = auth.currentUser;
    if (user) {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: displayName,
        username: username.toLowerCase().replace(/\s/g, ""),
        photoURL: user.photoURL,
        email: user.email,
        createdAt: new Date(),
      });
      router.push("/");
    }
  };

  if (checking) return null;

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-200"
      >
        <h1 className="text-2xl font-black text-slate-800 mb-2">Atur Profil Lu</h1>
        <p className="text-sm text-slate-500 mb-8">Nama di Google lu bakal diabaikan, atur identitas di Topahin di sini.</p>
        
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nama Lengkap</label>
            <input 
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Contoh: Renaldo"
              className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-cyan-500 text-slate-800 font-bold"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
              <input 
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="renaldo"
                className="w-full p-4 pl-10 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-cyan-500 text-slate-800 font-bold"
              />
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : "Simpan Profil"}
          </button>
        </div>
      </motion.div>
    </main>
  );
}