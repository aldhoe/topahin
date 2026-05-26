"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/components/providers/ToastProvider";
import EmptyState from "@/components/ui/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, CheckCircle2, Circle, Trash2 } from "lucide-react";
import type { Task } from "@/types";

interface TugasSectionProps {
  patunganId: string;
  tasks: Task[];
  isOwner: boolean;
  listAnggota: string[];
}

export default function TugasSection({
  patunganId,
  tasks,
  isOwner,
  listAnggota,
}: TugasSectionProps) {
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState("");
  const [pic, setPic] = useState("Semua Orang");

  const handleAdd = async () => {
    if (!text.trim()) return showToast("Tulis tugasnya.", "error");
    try {
      // Optimistic update: don't await
      updateDoc(doc(db, "patungan", patunganId), {
        tasks: [...tasks, {
          id: Date.now(),
          text: text.trim(),
          pic,
          isDone: false,
        }],
      }).catch(err => {
        console.error(err);
        showToast("Gagal menyimpan tugas.", "error");
      });
      setText("");
      setShowForm(false);
      showToast("Tugas ditambahkan!", "success");
    } catch {
      showToast("Gagal menambah tugas.", "error");
    }
  };

  // Any member can toggle tasks (#4)
  const handleToggle = async (task: Task) => {
    try {
      const updated = tasks.map((t) =>
        t.id === task.id ? { ...t, isDone: !t.isDone } : t
      );
      // Optimistic update
      updateDoc(doc(db, "patungan", patunganId), { tasks: updated }).catch(err => {
        showToast("Gagal update tugas.", "error");
      });
    } catch {
      showToast("Terjadi kesalahan.", "error");
    }
  };

  // Delete task (#8)
  const handleDelete = async (taskId: number) => {
    try {
      const updated = tasks.filter((t) => t.id !== taskId);
      // Optimistic update
      updateDoc(doc(db, "patungan", patunganId), { tasks: updated }).catch(() => {
        showToast("Gagal hapus tugas.", "error");
      });
      showToast("Tugas dihapus.", "success");
    } catch {
      showToast("Terjadi kesalahan.", "error");
    }
  };

  const doneCount = tasks.filter((t) => t.isDone).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Daftar Tugas</h3>
          {tasks.length > 0 && (
            <p className="text-[11px] text-slate-400">{doneCount}/{tasks.length} selesai</p>
          )}
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="text-xs font-medium text-cyan-600 bg-cyan-50 px-3 py-1.5 rounded-lg">
          {showForm ? "Batal" : "+ Tambah"}
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
              <input type="text" value={text} onChange={(e) => setText(e.target.value)}
                placeholder="Pesan hotel, beli tiket pesawat..."
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-cyan-500" />
              <select value={pic} onChange={(e) => setPic(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-cyan-500">
                <option value="Semua Orang">Semua Orang</option>
                {listAnggota.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <button onClick={handleAdd}
                className="w-full py-3 bg-cyan-500 text-white font-semibold rounded-xl active:scale-[0.98] transition-all text-sm">
                Simpan
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task List */}
      {tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`w-full flex items-start gap-3 p-4 bg-white rounded-xl border transition-all group ${
                task.isDone ? "border-emerald-100 bg-emerald-50/50" : "border-slate-100"
              }`}
            >
              <button
                onClick={() => handleToggle(task)}
                className="mt-0.5 shrink-0"
              >
                {task.isDone ? (
                  <CheckCircle2 size={18} className="text-emerald-500" />
                ) : (
                  <Circle size={18} className="text-slate-300 hover:text-cyan-400 transition-colors" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${task.isDone ? "text-slate-400 line-through" : "text-slate-800"}`}>
                  {task.text}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">PIC: {task.pic}</p>
              </div>
              <button
                onClick={() => handleDelete(task.id)}
                className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                title="Hapus tugas"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Belum ada tugas" description="Bagi tugas persiapan ke anggota." />
      )}
    </div>
  );
}
