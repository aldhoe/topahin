"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useToast } from "@/components/providers/ToastProvider";
import LoadingScreen from "@/components/ui/LoadingScreen";
import BackButton from "@/components/ui/BackButton";
import { motion } from "framer-motion";
import { LogOut, Save, CheckCircle2, XCircle } from "lucide-react";
import type { UserProfile } from "@/types";

export default function ProfilPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) { router.push("/"); return; }
      setUser(currentUser);

      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile;
        setProfile(data);
        setDisplayName(data.displayName || "");
        setUsername(data.username || "");
        setOriginalUsername(data.username || "");
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  // Username uniqueness check
  useEffect(() => {
    if (!username || username === originalUsername) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      const formatted = username.toLowerCase().replace(/[^a-z0-9._]/g, "");
      if (formatted !== username) setUsername(formatted);

      const q = query(collection(db, "users"), where("username", "==", formatted));
      const snap = await getDocs(q);
      setUsernameAvailable(snap.empty);
      setCheckingUsername(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [username, originalUsername]);

  const handleSave = async () => {
    if (!user || !displayName.trim() || !username.trim()) {
      return showToast("Isi semua field.", "error");
    }

    if (username !== originalUsername && !usernameAvailable) {
      return showToast("Username tidak tersedia.", "error");
    }

    setSaving(true);
    try {
      const formatted = username.toLowerCase().replace(/[^a-z0-9._]/g, "");
      await updateDoc(doc(db, "users", user.uid), {
        displayName: displayName.trim(),
        username: formatted,
      });
      setOriginalUsername(formatted);
      showToast("Profil disimpan!", "success");
    } catch {
      showToast("Gagal menyimpan.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/");
  };

  if (loading) return <LoadingScreen />;

  return (
    <main className="min-h-screen bg-slate-50 font-sans pb-12">
      <nav className="p-4 flex items-center gap-2 bg-white border-b border-slate-100 sticky top-0 z-50">
        <BackButton href="/" />
        <h1 className="font-bold text-slate-800 text-sm">Profil</h1>
      </nav>

      <section className="max-w-lg mx-auto p-6 space-y-6">
        {/* Avatar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center py-4"
        >
          <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 mb-3 border-2 border-white shadow-lg">
            {(profile?.photoURL || user?.photoURL) && (
              <img
                src={profile?.photoURL || user?.photoURL || ""}
                alt=""
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <p className="text-xs text-slate-400">{profile?.email || user?.email}</p>
        </motion.div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-medium text-slate-400 mb-1.5 block uppercase tracking-wider">
              Nama Tampilan
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-4 rounded-2xl bg-white border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500 transition-colors"
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
                className="w-full p-4 pl-10 rounded-2xl bg-white border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500 transition-colors"
              />
              {/* Status indicator */}
              {username !== originalUsername && (
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
              Hanya huruf kecil, angka, titik, dan underscore.
            </p>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || !displayName.trim() || !username.trim()}
          className="w-full py-4 bg-slate-900 text-white font-semibold rounded-2xl transition-all active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-2"
        >
          <Save size={16} />
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-4 bg-red-50 text-red-500 font-semibold rounded-2xl transition-all hover:bg-red-100 flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          Keluar
        </button>
      </section>
    </main>
  );
}
