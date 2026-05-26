"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useToast } from "@/components/providers/ToastProvider";
import { CheckCircle2, XCircle } from "lucide-react";

export default function SetupProfil() {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/"); return; }
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) { router.push("/"); return; }
      // Pre-fill display name from Google
      setDisplayName(user.displayName || "");
      setChecking(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Username uniqueness check
  useEffect(() => {
    if (!username.trim()) { setUsernameAvailable(null); return; }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      const formatted = username.toLowerCase().replace(/[^a-z0-9._]/g, "");
      const q = query(collection(db, "users"), where("username", "==", formatted));
      const snap = await getDocs(q);
      setUsernameAvailable(snap.empty);
      setCheckingUsername(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSave = async () => {
    if (!displayName.trim() || !username.trim()) {
      return showToast("Isi semua data.", "error");
    }

    const formatted = username.toLowerCase().replace(/[^a-z0-9._]/g, "");

    if (formatted.length < 3) {
      return showToast("Username minimal 3 karakter.", "error");
    }

    if (!usernameAvailable) {
      return showToast("Username sudah dipakai.", "error");
    }

    setLoading(true);
    const user = auth.currentUser;
    if (user) {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: displayName.trim(),
        username: formatted,
        photoURL: user.photoURL,
        email: user.email,
        role: "member",
        createdAt: new Date(),
      });
      showToast("Profil tersimpan!", "success");
      router.push("/");
    }
  };

  if (checking) return null;

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-3xl shadow-lg max-w-md w-full border border-slate-200"
      >
        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 border-2 border-white shadow-md">
            {auth.currentUser?.photoURL && (
              <img
                src={auth.currentUser.photoURL}
                alt=""
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>

        <h1 className="text-xl font-bold text-slate-800 mb-1 text-center">
          Setup Profil
        </h1>
        <p className="text-sm text-slate-400 mb-8 text-center">
          Atur identitas kamu di Topahin.
        </p>

        <div className="space-y-5">
          <div>
            <label className="text-[11px] font-medium text-slate-400 mb-1.5 block uppercase tracking-wider">
              Nama Tampilan
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nama kamu"
              className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-400 mb-1.5 block uppercase tracking-wider">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "")
                  )
                }
                placeholder="username"
                className="w-full p-4 pl-10 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500 transition-colors"
              />
              {username.trim() && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2">
                  {checkingUsername ? (
                    <span className="text-[11px] text-slate-400 animate-pulse">
                      ...
                    </span>
                  ) : usernameAvailable === true ? (
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  ) : usernameAvailable === false ? (
                    <XCircle size={16} className="text-red-500" />
                  ) : null}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Huruf kecil, angka, titik, underscore. Min 3 karakter.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={
              loading ||
              !displayName.trim() ||
              !username.trim() ||
              usernameAvailable !== true
            }
            className="w-full bg-slate-900 text-white font-semibold py-4 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-30"
          >
            {loading ? "Menyimpan..." : "Simpan & Lanjut"}
          </button>
        </div>
      </motion.div>
    </main>
  );
}