"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, onSnapshot, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import LoadingScreen from "@/components/ui/LoadingScreen";
import BackButton from "@/components/ui/BackButton";
import { useToast } from "@/components/providers/ToastProvider";
import DanaTab from "@/components/patungan/DanaTab";
import RencanaTab from "@/components/patungan/RencanaTab";
import AnggotaTab from "@/components/patungan/AnggotaTab";
import ConfirmModal from "@/components/ui/ConfirmModal";
import EditProjectModal from "@/components/patungan/EditProjectModal";
import InviteModal from "@/components/patungan/InviteModal";
import ActivityFeed from "@/components/patungan/ActivityFeed";
import { Calendar, Users, Archive, ArchiveRestore, Pencil, UserPlus, Trash2, Share2 } from "lucide-react";
import type { Patungan, UserProfile } from "@/types";

export default function PatunganDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [data, setData] = useState<Patungan | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dana" | "rencana" | "anggota" | "aktivitas">("dana");
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) { router.push("/"); return; }
      setUser(currentUser);
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) setProfile(userDoc.data() as UserProfile);
    });
    return () => unsub();
  }, [router]);

  // Realtime data
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "patungan", id as string), (snap) => {
      if (snap.exists()) {
        setData({ id: snap.id, ...snap.data() } as Patungan);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  if (loading) return <LoadingScreen />;
  if (!data) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-sm text-slate-400">Project tidak ditemukan.</p>
    </div>
  );

  const isOwner = user?.uid === data.uidPembuat;
  const isArchived = data.status === "archived";

  // Countdown for trips
  const getCountdown = () => {
    if (!data.tanggalMulai) return null;
    const start = data.tanggalMulai instanceof Date
      ? data.tanggalMulai
      : (data.tanggalMulai as any).toDate?.() || new Date(data.tanggalMulai as any);
    const diff = Math.ceil((start.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return "Sudah berlalu";
    if (diff === 0) return "Hari ini!";
    return `${diff} hari lagi`;
  };

  const handleArchiveToggle = async () => {
    try {
      await updateDoc(doc(db, "patungan", id as string), {
        status: isArchived ? "active" : "archived",
      });
      setShowArchiveConfirm(false);
      showToast(isArchived ? "Project diaktifkan kembali." : "Project diarsipkan.", "success");
    } catch {
      showToast("Gagal update status.", "error");
    }
  };

  const handleDeleteProject = async () => {
    try {
      await deleteDoc(doc(db, "patungan", id as string));
      showToast("Project dihapus.", "success");
      router.push("/");
    } catch {
      showToast("Gagal hapus project.", "error");
    }
  };

  const countdown = getCountdown();

  // Badge counts for tabs
  const rundownCount = (data.rundown?.length || 0) + (data.tasks?.length || 0);

  return (
    <main className="min-h-screen bg-slate-50 font-sans pb-24">
      {/* Navbar */}
      <nav className="p-4 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <BackButton href="/" />
          <h1 className="font-bold text-slate-800 truncate text-sm">
            {data.namaPatungan}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const url = `${window.location.origin}/share/${id}`;
              navigator.clipboard.writeText(url);
              showToast("Link share disalin!", "success");
            }}
            className="p-2 text-slate-400 hover:text-cyan-600 transition-colors"
            title="Share Link"
          >
            <Share2 size={18} />
          </button>
          {isOwner && (
            <>
              <button
                onClick={() => setShowInviteModal(true)}
                className="p-2 text-slate-400 hover:text-cyan-600 transition-colors"
                title="Invite Anggota"
              >
                <UserPlus size={18} />
              </button>
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2 text-slate-400 hover:text-cyan-600 transition-colors"
                title="Edit Project"
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={() => setShowArchiveConfirm(true)}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                title={isArchived ? "Aktifkan" : "Arsipkan"}
              >
                {isArchived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                title="Hapus Project"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
      </nav>

      <section className="max-w-xl mx-auto p-6">
        {/* Archived Banner */}
        {isArchived && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3"
          >
            <Archive size={18} className="text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Project Diarsipkan</p>
              <p className="text-xs text-amber-600">Deposit tidak bisa dilakukan pada project yang diarsipkan.</p>
            </div>
          </motion.div>
        )}

        {/* Project Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100">
              {data.fotoPembuat && (
                <img src={data.fotoPembuat} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">{data.pembuat}</p>
              <p className="text-[11px] text-slate-400">@{data.usernamePembuat}</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-2 leading-tight">
            {data.namaPatungan}
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">{data.deskripsi}</p>

          {/* Trip info badges */}
          {data.isTrip && (
            <div className="flex flex-wrap gap-2 mt-4">
              {data.tanggalMulai && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-cyan-50 text-cyan-700 px-3 py-1.5 rounded-lg border border-cyan-100">
                  <Calendar size={12} />
                  {countdown}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg">
                <Users size={12} />
                {data.listAnggota?.length || 0} anggota
              </span>
            </div>
          )}
        </div>

        {/* Tab Navigation with badges */}
        <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 mb-6 sticky top-[60px] z-40">
          {[
            { id: "dana" as const, label: "Dana" },
            {
              id: "rencana" as const,
              label: data.isTrip ? "Rencana" : "Budget",
              badge: rundownCount > 0 ? rundownCount : undefined,
            },
            {
              id: "anggota" as const,
              label: "Anggota",
              badge: data.listAnggota?.length || undefined,
            },
            {
              id: "aktivitas" as const,
              label: "Log",
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-xs font-semibold rounded-xl transition-all relative ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-400 hover:bg-slate-50"
              }`}
            >
              {tab.label}
              {"badge" in tab && tab.badge && (
                <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "dana" && (
            <DanaTab
              key="dana"
              patunganId={id as string}
              targetDana={data.targetDana}
              targetPerOrang={data.targetPerOrang}
              listAnggota={data.listAnggota || []}
              profile={profile}
              isArchived={isArchived}
            />
          )}

          {activeTab === "rencana" && (
            <RencanaTab
              key="rencana"
              patunganId={id as string}
              isTrip={data.isTrip}
              isOwner={isOwner}
              rundown={data.rundown || []}
              itinerary={data.itinerary || []}
              tasks={data.tasks || []}
              packingItems={data.packingItems || []}
              listAnggota={data.listAnggota || []}
              tanggalMulai={data.tanggalMulai}
              tanggalSelesai={data.tanggalSelesai}
              jumlahAnggota={data.listAnggota?.length || 1}
              votes={data.votes || []}
              expenses={data.expenses || []}
              currentUsername={profile?.username || ""}
              namaPatungan={data.namaPatungan}
            />
          )}

          {activeTab === "anggota" && (
            <AnggotaTab
              key="anggota"
              listAnggota={data.listAnggota || []}
              targetPerOrang={data.targetPerOrang}
              patunganId={id as string}
              usernamePembuat={data.usernamePembuat}
              pembuat={data.pembuat}
            />
          )}

          {activeTab === "aktivitas" && (
            <motion.div
              key="aktivitas"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <ActivityFeed patunganId={id as string} />
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Archive Confirm Modal */}
      <ConfirmModal
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={handleArchiveToggle}
        title={isArchived ? "Aktifkan Project?" : "Arsipkan Project?"}
        description={
          isArchived
            ? "Project akan kembali aktif dan muncul di dashboard."
            : "Project yang diarsipkan tetap bisa dilihat tapi tidak muncul di dashboard aktif."
        }
        confirmText={isArchived ? "Aktifkan" : "Arsipkan"}
        variant="default"
      />

      {/* Delete Project Confirm */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteProject}
        title="Hapus Project?"
        description="Project akan dihapus permanen. Data deposit, rundown, dan semua konten akan hilang. Tindakan ini tidak bisa dibatalkan."
        confirmText="Hapus Permanen"
        variant="danger"
      />

      {/* Edit Project Modal */}
      {isOwner && (
        <EditProjectModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          patunganId={id as string}
          currentData={{
            namaPatungan: data.namaPatungan,
            deskripsi: data.deskripsi,
            tanggalMulai: data.tanggalMulai,
            tanggalSelesai: data.tanggalSelesai,
            paymentDeadline: (data as any).paymentDeadline,
          }}
        />
      )}

      {/* Invite Modal */}
      {isOwner && (
        <InviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          patunganId={id as string}
          listAnggota={data.listAnggota || []}
        />
      )}
    </main>
  );
}