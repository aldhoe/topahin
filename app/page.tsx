"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, type User } from "firebase/auth";
import { collection, onSnapshot, query, where, doc, getDoc, orderBy } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import LoadingScreen from "@/components/ui/LoadingScreen";
import EmptyState from "@/components/ui/EmptyState";
import NotificationCenter from "@/components/ui/NotificationCenter";
import OnboardingTour from "@/components/ui/OnboardingTour";
import IOSInstallPrompt from "@/components/ui/IOSInstallPrompt";
import { Plus, Shield, LogOut, Users, Calendar, Plane, DollarSign, ArrowRight, Search } from "lucide-react";
import type { Patungan, UserProfile } from "@/types";
import { formatRupiah, formatCompact } from "@/lib/formatCurrency";

const TAGLINES = [
  "Split bill tanpa ribet",
  "Track budget real-time",
  "Plan trip bareng geng",
  "Transparan, no drama",
  "Bye siapa belum bayar",
];

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [patunganList, setPatunganList] = useState<Patungan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "archived">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [taglineIndex, setTaglineIndex] = useState(0);

  // Rotate taglines
  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % TAGLINES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        } else {
          router.push("/setup-profil");
          return;
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Patungan listener
  useEffect(() => {
    if (!profile?.username) return;

    const q = query(
      collection(db, "patungan"),
      where("listAnggota", "array-contains", profile.username.toLowerCase())
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Patungan[];

      list.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setPatunganList(list);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const userDoc = await getDoc(doc(db, "users", result.user.uid));
      if (!userDoc.exists()) router.push("/setup-profil");
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    setUser(null);
    setProfile(null);
    setPatunganList([]);
  };

  if (loading) return <LoadingScreen />;

  // Filter projects
  const activeProjects = patunganList.filter((p) => p.status !== "archived");
  const archivedProjects = patunganList.filter((p) => p.status === "archived");
  const displayedProjects = filter === "active" ? activeProjects : archivedProjects;

  const totalTerkumpul = activeProjects.reduce((acc, p) => acc + (p.terkumpul || 0), 0);

  // Search filter
  const filteredProjects = displayedProjects.filter((p) =>
    !searchQuery || p.namaPatungan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-50 font-sans">
      <AnimatePresence mode="wait">
        {!user ? (
          /* ============ LANDING — PREMIUM LIGHT ============ */
          <motion.section
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen relative overflow-hidden bg-white"
          >
            {/* Ambient glow — soft pastels */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <motion.div
                animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-400/10 rounded-full blur-[120px]"
              />
              <motion.div
                animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-400/8 rounded-full blur-[120px]"
              />
              {/* Dot pattern */}
              <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
                backgroundSize: "24px 24px"
              }} />
            </div>

            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-16">
              {/* Logo — as-is */}
              <motion.img
                src="/icon-512x512.png"
                alt="Topahin"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="w-16 h-16 mb-8"
              />

              {/* Hero Text */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-6 max-w-md"
              >
                <h1 className="text-[2.75rem] leading-[1.1] font-extrabold text-slate-800 tracking-tight mb-4">
                  Topahin
                  <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">.</span>
                </h1>

                {/* Single-line rotating tagline */}
                <div className="h-6 relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={taglineIndex}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      transition={{ duration: 0.35 }}
                      className="text-sm text-slate-400 font-medium absolute inset-x-0 whitespace-nowrap"
                    >
                      {TAGLINES[taglineIndex]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Feature Bento Grid — Light */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-full max-w-sm grid grid-cols-2 gap-2.5 mb-10"
              >
                {/* Main feature — spans 2 cols */}
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className="col-span-2 bg-slate-50 border border-slate-100 rounded-2xl p-5 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-100/60 to-transparent rounded-bl-full" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
                        <DollarSign size={16} className="text-cyan-600" />
                      </div>
                      <span className="text-[11px] font-semibold text-cyan-600 uppercase tracking-wider">Dana</span>
                    </div>
                    <p className="text-[15px] font-bold text-slate-800 leading-snug">Kumpulkan dana transparan,<br/>lacak real-time</p>
                    <p className="text-xs text-slate-400 mt-1.5">Semua anggota bisa pantau progress kapan aja.</p>
                  </div>
                </motion.div>

                {/* Feature 2 */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-slate-50 border border-slate-100 rounded-2xl p-4 relative overflow-hidden"
                >
                  <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-gradient-to-tl from-purple-100/60 to-transparent rounded-tl-full" />
                  <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center mb-2.5">
                    <Plane size={14} className="text-purple-600" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 mb-0.5">Itinerary</p>
                  <p className="text-[10px] text-slate-400 leading-relaxed">Plan lengkap + budget tracking</p>
                </motion.div>

                {/* Feature 3 */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-slate-50 border border-slate-100 rounded-2xl p-4 relative overflow-hidden"
                >
                  <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-gradient-to-tl from-emerald-100/60 to-transparent rounded-tl-full" />
                  <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center mb-2.5">
                    <Users size={14} className="text-emerald-600" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 mb-0.5">Split Bill</p>
                  <p className="text-[10px] text-slate-400 leading-relaxed">Hitung otomatis siapa bayar siapa</p>
                </motion.div>
              </motion.div>

              {/* CTA */}
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogin}
                className="flex items-center gap-3 bg-slate-900 text-white px-7 py-4 rounded-2xl shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 transition-all relative z-10 group"
              >
                <svg width="18" height="18" viewBox="0 0 256 262" xmlns="http://www.w3.org/2000/svg">
                  <path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4" />
                  <path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853" />
                  <path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" fill="#FBBC05" />
                  <path d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EA4335" />
                </svg>
                <span className="text-sm font-bold">
                  Masuk dengan Google
                </span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </motion.button>

              {/* Trust line */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-[11px] text-slate-400 mt-5"
              >
                Gratis · Tanpa install · Langsung pakai
              </motion.p>
            </div>
          </motion.section>
        ) : (
          /* ============ DASHBOARD ============ */
          <motion.section
            key="dashboard"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Top Bar */}
            <div className="bg-white border-b border-slate-100 p-4 sticky top-0 z-50">
              <div className="max-w-2xl mx-auto flex items-center justify-between">
                <Link href="/profil" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 ring-2 ring-slate-100 hover:ring-cyan-200 transition-all">
                    {(profile?.photoURL || user.photoURL) && (
                      <img
                        src={profile?.photoURL || user.photoURL || ""}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {profile?.displayName || user.displayName?.split(" ")[0]}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      @{profile?.username || "..."}
                    </p>
                  </div>
                </Link>

                <div className="flex items-center gap-1">
                  {user && <NotificationCenter userId={user.uid} />}
                  {profile?.role === "admin" && (
                    <Link
                      href="/admin"
                      className="p-2 text-cyan-500 hover:bg-cyan-50 rounded-xl transition-colors"
                      title="Admin Panel"
                    >
                      <Shield size={18} />
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    title="Logout"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="max-w-2xl mx-auto p-6">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[var(--shadow-card)]">
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                    Project Aktif
                  </p>
                  <p className="text-xl font-bold text-slate-800">
                    {activeProjects.length}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-2xl text-white shadow-[var(--shadow-elevated)]">
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                    Total Terkumpul
                  </p>
                  <p className="text-xl font-bold">
                    {formatRupiah(totalTerkumpul)}
                  </p>
                </div>
              </div>

              {/* Filter + Create */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex gap-2">
                  {[
                    { id: "active" as const, label: "Aktif" },
                    { id: "archived" as const, label: "Arsip" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        filter === f.id
                          ? "bg-slate-900 text-white"
                          : "text-slate-400 hover:bg-slate-100"
                      }`}
                    >
                      {f.label}
                      {f.id === "archived" && archivedProjects.length > 0 && (
                        <span className="ml-1 text-slate-500">
                          ({archivedProjects.length})
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <Link href="/buat">
                  <button className="flex items-center gap-1.5 bg-cyan-500 text-white px-4 py-2.5 rounded-xl shadow-sm active:scale-95 transition-all text-xs font-semibold">
                    <Plus size={16} />
                    Bikin Project
                  </button>
                </Link>
              </div>

              {/* Search Bar */}
              {displayedProjects.length > 2 && (
                <div className="relative mb-5">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari project..."
                    className="w-full p-3 pl-11 rounded-xl bg-white border border-slate-100 text-sm font-medium outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-300"
                  />
                </div>
              )}

              {/* Project List */}
              {filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProjects.map((item, index) => {
                    const progress =
                      Math.min(
                        Math.round(
                          ((item.terkumpul || 0) / (item.targetDana || 1)) * 100
                        ),
                        100
                      ) || 0;

                    const getTripDate = () => {
                      if (!item.isTrip || !item.tanggalMulai) return null;
                      const d = (item.tanggalMulai as any)?.toDate?.() || new Date(item.tanggalMulai as any);
                      return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
                    };

                    const getDaysUntilDeadline = () => {
                      // Check for payment deadline first, then trip start date
                      const dateStr = item.paymentDeadline || (item.isTrip ? item.tanggalMulai : null);
                      if (!dateStr) return null;
                      
                      const d = (dateStr as any)?.toDate?.() || new Date(dateStr as any);
                      const now = new Date();
                      const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      if (diff < 0) return null;
                      return diff;
                    };

                    const tripDate = getTripDate();
                    const daysUntil = getDaysUntilDeadline();
                    const isTrip = item.isTrip;

                    return (
                      <Link
                        href={`/patungan/${item.id}`}
                        key={item.id}
                        className="block"
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ y: -2 }}
                          className="bg-white rounded-2xl border border-slate-100 cursor-pointer transition-all hover:shadow-md shadow-[var(--shadow-card)] overflow-hidden"
                        >
                          {/* Accent stripe */}
                          <div className={`h-1 ${isTrip ? 'bg-gradient-to-r from-cyan-400 to-blue-500' : 'bg-gradient-to-r from-slate-300 to-slate-400'}`} />

                          <div className="p-5">
                            {/* Top row */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-100">
                                  {item.fotoPembuat && (
                                    <img
                                      src={item.fotoPembuat}
                                      alt=""
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  )}
                                </div>
                                <span className="text-[11px] font-medium text-slate-400">
                                  {item.pembuat}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {daysUntil !== null && daysUntil <= 30 && (
                                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                    {daysUntil === 0 ? "Hari ini!" : `${daysUntil} hari lagi`}
                                  </span>
                                )}
                                {isTrip && (
                                  <span className="text-[10px] font-medium text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-100">
                                    Trip
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Title */}
                            <h4 className="font-semibold text-slate-800 mb-1 line-clamp-1">
                              {item.namaPatungan}
                            </h4>

                            {/* Badges */}
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                                <Users size={10} /> {item.listAnggota?.length || 0}
                              </span>
                              {tripDate && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-cyan-500 bg-cyan-50 px-2 py-0.5 rounded">
                                  <Calendar size={10} /> {tripDate}
                                </span>
                              )}
                            </div>

                            {/* Progress */}
                            <div className={`w-full h-1.5 bg-slate-100 rounded-full my-2 overflow-hidden`}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className={`h-full rounded-full ${progress >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-cyan-400 to-blue-500'}`}
                              />
                            </div>

                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-500 font-medium">
                                {formatRupiah(item.terkumpul || 0)}
                                <span className="text-slate-300">
                                  {" / "}
                                  {formatRupiah(item.targetDana || 0)}
                                </span>
                              </span>
                              <span className={`text-[11px] font-semibold ${progress >= 100 ? 'text-emerald-600' : 'text-cyan-600'}`}>
                                {progress}%
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>
              ) : searchQuery ? (
                <div className="text-center py-12">
                  <Search size={32} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-400">Tidak ada project "{searchQuery}"</p>
                </div>
              ) : (
                <EmptyState
                  title={
                    filter === "active"
                      ? "Belum ada project"
                      : "Belum ada arsip"
                  }
                  description={
                    filter === "active"
                      ? "Bikin project pertama buat mulai patungan bareng temen."
                      : "Project yang diarsipkan akan muncul di sini."
                  }
                  action={
                    filter === "active" ? (
                      <Link href="/buat">
                        <button className="bg-cyan-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition-all">
                          Bikin Project
                        </button>
                      </Link>
                    ) : undefined
                  }
                />
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
      {user && <OnboardingTour />}
      <IOSInstallPrompt />
    </main>
  );
}