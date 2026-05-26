"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  collectionGroup,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/ToastProvider";
import { motion, AnimatePresence } from "framer-motion";
import LoadingScreen from "@/components/ui/LoadingScreen";
import BackButton from "@/components/ui/BackButton";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmModal from "@/components/ui/ConfirmModal";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Image as ImageIcon,
  Shield,
  X,
} from "lucide-react";
import type { Deposit, UserProfile } from "@/types";

interface DepositWithProject extends Deposit {
  projectName?: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [deposits, setDeposits] = useState<DepositWithProject[]>([]);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  // Rejection reason modal (#9)
  const [rejectTarget, setRejectTarget] = useState<DepositWithProject | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Cache for project names (#3)
  const projectNameCache = useState<Map<string, string>>(new Map())[0];

  // Auth check + admin verification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/");
        return;
      }
      setUser(currentUser);

      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (!userDoc.exists() || userDoc.data()?.role !== "admin") {
        showToast("Akses ditolak. Bukan admin.", "error");
        router.push("/");
        return;
      }
      setProfile(userDoc.data() as UserProfile);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, showToast]);

  // Listen to all deposits across all projects
  useEffect(() => {
    if (!profile) return;

    const q =
      filter === "pending"
        ? query(
            collectionGroup(db, "deposits"),
            where("status", "==", "pending"),
            orderBy("createdAt", "desc")
          )
        : query(collectionGroup(db, "deposits"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const depositsData: DepositWithProject[] = [];

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data() as Deposit;
          // Get parent patungan ID from path
          const patunganId = docSnap.ref.parent.parent?.id || "";

          // Use denormalized namaPatungan first, then cache, then fetch (#3)
          let projectName = (data as any).namaPatungan || "";

          if (!projectName) {
            if (projectNameCache.has(patunganId)) {
              projectName = projectNameCache.get(patunganId) || "Unknown Project";
            } else {
              try {
                const patunganDoc = await getDoc(doc(db, "patungan", patunganId));
                if (patunganDoc.exists()) {
                  projectName = patunganDoc.data()?.namaPatungan || "Unknown Project";
                }
              } catch {
                projectName = "Unknown Project";
              }
              projectNameCache.set(patunganId, projectName);
            }
          }

          depositsData.push({
            ...data,
            id: docSnap.id,
            patunganId,
            projectName,
          });
        }

        setDeposits(depositsData);
      },
      (err) => {
        console.error("Admin query error:", err);
      }
    );

    return () => unsubscribe();
  }, [profile, filter, projectNameCache]);

  const handleApprove = async (deposit: DepositWithProject) => {
    if (!user) return;
    setProcessing(deposit.id);

    try {
      const res = await fetch(`/api/deposits/${deposit.id}/approve`, {
        method: "POST",
        body: JSON.stringify({
          patunganId: deposit.patunganId,
          adminUid: user.uid,
        }),
      });

      if (!res.ok) throw new Error("Failed to approve");
      showToast(`Deposit dari @${deposit.username} disetujui!`, "success");
    } catch (error) {
      console.error(error);
      showToast("Gagal approve deposit.", "error");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!user || !rejectTarget) return;
    setProcessing(rejectTarget.id);

    try {
      const res = await fetch(`/api/deposits/${rejectTarget.id}/reject`, {
        method: "POST",
        body: JSON.stringify({
          patunganId: rejectTarget.patunganId,
          adminUid: user.uid,
          reason: rejectReason.trim() || "Bukti transfer tidak valid",
        }),
      });

      if (!res.ok) throw new Error("Failed to reject");
      showToast(`Deposit dari @${rejectTarget.username} ditolak.`, "info");
      setRejectTarget(null);
      setRejectReason("");
    } catch (error) {
      console.error(error);
      showToast("Gagal reject deposit.", "error");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <LoadingScreen />;

  const pendingCount = deposits.filter((d) => d.status === "pending").length;

  return (
    <main className="min-h-screen bg-slate-50 font-sans">
      {/* Navbar */}
      <nav className="p-4 flex items-center gap-3 bg-white border-b border-slate-100 sticky top-0 z-50">
        <BackButton href="/" />
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-cyan-500" />
          <h1 className="font-bold text-slate-800">Admin Panel</h1>
        </div>
      </nav>

      <section className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-1">
            Verifikasi Deposit
          </h2>
          <p className="text-sm text-slate-400">
            {pendingCount > 0
              ? `${pendingCount} deposit menunggu verifikasi`
              : "Semua deposit sudah diproses"}
          </p>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {[
            { id: "pending" as const, label: "Menunggu" },
            { id: "all" as const, label: "Semua" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                filter === f.id
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-400 border border-slate-200"
              }`}
            >
              {f.label}
              {f.id === "pending" && pendingCount > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Deposit List */}
        {deposits.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={28} className="text-emerald-300" />}
            title="Semua bersih!"
            description="Tidak ada deposit yang perlu diverifikasi saat ini."
          />
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {deposits.map((deposit) => {
                const date = deposit.createdAt?.toDate
                  ? deposit.createdAt.toDate()
                  : new Date();
                const isProcessing = processing === deposit.id;

                return (
                  <motion.div
                    key={deposit.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white p-5 rounded-2xl border border-slate-100"
                  >
                    {/* Project name */}
                    <p className="text-[11px] font-medium text-slate-400 mb-3">
                      {deposit.projectName}
                    </p>

                    <div className="flex items-start justify-between gap-4">
                      {/* User info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-sm font-bold text-slate-400">
                          {deposit.photoURL ? (
                            <img
                              src={deposit.photoURL}
                              alt={deposit.displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            deposit.displayName?.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {deposit.displayName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            @{deposit.username} ·{" "}
                            {date.toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Amount */}
                      <p className="text-base font-bold text-slate-800 shrink-0">
                        Rp {deposit.nominal?.toLocaleString("id-ID")}
                      </p>
                    </div>

                    {/* Bukti preview */}
                    {deposit.buktiUrl && (
                      <button
                        onClick={() => setPreviewImage(deposit.buktiUrl)}
                        className="mt-3 flex items-center gap-2 text-xs font-medium text-cyan-600 hover:text-cyan-700 transition-colors"
                      >
                        <ImageIcon size={14} />
                        Lihat Bukti Transfer
                      </button>
                    )}

                    {/* Status / Actions */}
                    {deposit.status === "pending" ? (
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleApprove(deposit)}
                          disabled={isProcessing}
                          className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                        >
                          <CheckCircle2 size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setRejectTarget(deposit);
                            setRejectReason("");
                          }}
                          disabled={isProcessing}
                          className="py-3 px-5 bg-red-50 hover:bg-red-100 text-red-500 font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border ${
                            deposit.status === "approved"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : "bg-red-50 text-red-600 border-red-100"
                          }`}
                        >
                          {deposit.status === "approved" ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <XCircle size={12} />
                          )}
                          {deposit.status === "approved"
                            ? "Disetujui"
                            : "Ditolak"}
                          {deposit.rejectedReason &&
                            ` — ${deposit.rejectedReason}`}
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Reject Reason Modal (#9) */}
      <AnimatePresence>
        {rejectTarget && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRejectTarget(null)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-slate-800">Tolak Deposit</h3>
                <button onClick={() => setRejectTarget(null)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-slate-400 mb-4">
                Deposit Rp {rejectTarget.nominal?.toLocaleString("id-ID")} dari @{rejectTarget.username}
              </p>

              <div className="space-y-3 mb-5">
                <label className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
                  Alasan Penolakan
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Bukti transfer tidak valid / tidak jelas..."
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-red-400 resize-none h-20"
                />
                {/* Quick reasons */}
                <div className="flex flex-wrap gap-2">
                  {["Bukti tidak jelas", "Nominal tidak sesuai", "Transfer ke rekening lain"].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRejectReason(r)}
                      className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setRejectTarget(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-semibold rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing === rejectTarget.id}
                  className="flex-1 py-3 bg-red-500 text-white font-semibold rounded-xl text-sm active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {processing === rejectTarget.id ? "Memproses..." : "Tolak Deposit"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewImage(null)}
              className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-sm w-full max-h-[80vh] overflow-hidden rounded-3xl shadow-2xl"
            >
              <img
                src={previewImage}
                alt="Bukti transfer"
                className="w-full h-full object-contain bg-white"
              />
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-slate-900/60 text-white rounded-full flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
