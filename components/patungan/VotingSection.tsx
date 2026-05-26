"use client";

import { useState } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { useToast } from "@/components/providers/ToastProvider";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Vote, ThumbsUp, Trash2, X, Trophy } from "lucide-react";
import type { VoteOption } from "@/types";

interface VotingSectionProps {
  patunganId: string;
  votes: VoteOption[];
  currentUsername: string;
  listAnggota: string[];
}

export default function VotingSection({
  patunganId,
  votes = [],
  currentUsername,
  listAnggota,
}: VotingSectionProps) {
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [opsi, setOpsi] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [waktu, setWaktu] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleAddVote = async () => {
    if (!opsi.trim()) return showToast("Tulis opsi dulu.", "error");
    try {
      await updateDoc(doc(db, "patungan", patunganId), {
        votes: arrayUnion({
          id: Date.now().toString(),
          tanggal: tanggal || "",
          waktu: waktu || "",
          opsi: opsi.trim(),
          createdBy: currentUsername,
          votes: [],
          createdAt: new Date(),
        }),
      });
      setOpsi("");
      setTanggal("");
      setWaktu("");
      setShowForm(false);
      showToast("Opsi ditambahkan!", "success");
    } catch {
      showToast("Gagal menambah opsi.", "error");
    }
  };

  const handleVote = async (voteOption: VoteOption) => {
    const hasVoted = voteOption.votes?.includes(currentUsername);

    try {
      // Update the specific vote option in the array
      const updated = votes.map((v) => {
        if (v.id === voteOption.id) {
          return {
            ...v,
            votes: hasVoted
              ? v.votes.filter((u) => u !== currentUsername)
              : [...(v.votes || []), currentUsername],
          };
        }
        return v;
      });

      await updateDoc(doc(db, "patungan", patunganId), { votes: updated });
    } catch {
      showToast("Gagal vote.", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const updated = votes.filter((v) => v.id !== deleteTarget);
      await updateDoc(doc(db, "patungan", patunganId), { votes: updated });
      setDeleteTarget(null);
      showToast("Opsi dihapus.", "success");
    } catch {
      showToast("Gagal hapus.", "error");
    }
  };

  // Group votes by date
  const groupedVotes: Record<string, VoteOption[]> = {};
  votes.forEach((v) => {
    const key = v.tanggal || "Umum";
    if (!groupedVotes[key]) groupedVotes[key] = [];
    groupedVotes[key].push(v);
  });

  const maxVotes = Math.max(...votes.map((v) => v.votes?.length || 0), 1);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Vote size={16} className="text-purple-500" />
          <h3 className="text-sm font-semibold text-slate-800">Voting</h3>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg">
          {showForm ? "Batal" : "+ Tambah Opsi"}
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
              <input type="text" value={opsi} onChange={(e) => setOpsi(e.target.value)}
                placeholder="Contoh: Snorkeling di Coral Island"
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-purple-500" />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-purple-500" />
                <input type="time" value={waktu} onChange={(e) => setWaktu(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-purple-500" />
              </div>
              <button onClick={handleAddVote}
                className="w-full py-3 bg-purple-500 text-white font-semibold rounded-xl active:scale-[0.98] transition-all text-sm">
                Tambah Opsi
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vote Cards */}
      {votes.length > 0 ? (
        <div className="space-y-3">
          {votes.map((voteOption, i) => {
            const voteCount = voteOption.votes?.length || 0;
            const hasVoted = voteOption.votes?.includes(currentUsername);
            const percentage = Math.round((voteCount / listAnggota.length) * 100);
            const isWinning = voteCount > 0 && voteCount === maxVotes;

            return (
              <motion.div
                key={voteOption.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`bg-white p-4 rounded-2xl border transition-all relative overflow-hidden ${
                  hasVoted ? "border-purple-200" : "border-slate-100"
                }`}
              >
                {/* Background vote bar */}
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                    hasVoted ? "bg-purple-50" : "bg-slate-50/50"
                  }`}
                  style={{ width: `${percentage}%` }}
                />

                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isWinning && voteCount > 0 && (
                        <Trophy size={12} className="text-amber-500" />
                      )}
                      <p className="text-sm font-semibold text-slate-800">
                        {voteOption.opsi}
                      </p>
                    </div>
                    {(voteOption.tanggal || voteOption.waktu) && (
                      <p className="text-[11px] text-slate-400">
                        {voteOption.tanggal} {voteOption.waktu}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">
                      oleh @{voteOption.createdBy}
                      {voteOption.votes?.length > 0 && (
                        <span className="ml-2 text-purple-500">
                          • {voteOption.votes.map((u) => `@${u}`).join(", ")}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-slate-500">
                      {voteCount}/{listAnggota.length}
                    </span>
                    <button
                      onClick={() => handleVote(voteOption)}
                      className={`p-2 rounded-xl transition-all active:scale-90 ${
                        hasVoted
                          ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                          : "bg-slate-100 text-slate-400 hover:bg-purple-100 hover:text-purple-500"
                      }`}
                    >
                      <ThumbsUp size={16} />
                    </button>
                    {voteOption.createdBy === currentUsername && (
                      <button
                        onClick={() => setDeleteTarget(voteOption.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Belum ada voting" description="Buat opsi dan ajak anggota vote." />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Opsi?"
        description="Opsi voting ini akan dihapus."
        confirmText="Hapus"
        variant="danger"
      />
    </div>
  );
}
