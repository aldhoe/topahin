"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/providers/ToastProvider";
import { X, UserPlus, CheckCircle2 } from "lucide-react";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  patunganId: string;
  listAnggota: string[];
}

interface UserSuggestion {
  username: string;
  displayName: string;
  photoURL?: string;
}

export default function InviteModal({
  isOpen,
  onClose,
  patunganId,
  listAnggota,
}: InviteModalProps) {
  const { showToast } = useToast();
  const [username, setUsername] = useState("");
  const [adding, setAdding] = useState(false);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSuggestion | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const searchTerm = username.toLowerCase().replace(/[^a-z0-9._]/g, "").replace("@", "");

    if (!searchTerm || searchTerm.length < 1) {
      setSuggestions([]);
      setSelectedUser(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        // Query usernames that start with the search term
        const q = query(
          collection(db, "users"),
          where("username", ">=", searchTerm),
          where("username", "<=", searchTerm + "\uf8ff"),
          limit(6)
        );
        const snap = await getDocs(q);
        const results: UserSuggestion[] = [];
        snap.forEach((d) => {
          const data = d.data();
          // Don't show users already in the group
          if (!listAnggota.includes(data.username?.toLowerCase())) {
            results.push({
              username: data.username,
              displayName: data.displayName || data.username,
              photoURL: data.photoURL,
            });
          }
        });
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username, listAnggota]);

  const handleSelectUser = (user: UserSuggestion) => {
    setSelectedUser(user);
    setUsername(user.username);
    setSuggestions([]);
  };

  const handleInvite = async () => {
    const target = selectedUser?.username || username.toLowerCase().replace(/[^a-z0-9._]/g, "").replace("@", "");
    if (!target) return;

    // Check if already member
    if (listAnggota.includes(target)) {
      showToast("User ini sudah jadi anggota.", "info");
      return;
    }

    setAdding(true);
    try {
      // Verify user exists if not from suggestions
      if (!selectedUser) {
        const q = query(collection(db, "users"), where("username", "==", target));
        const snap = await getDocs(q);
        if (snap.empty) {
          showToast("Username tidak ditemukan.", "error");
          setAdding(false);
          return;
        }
      }

      await updateDoc(doc(db, "patungan", patunganId), {
        listAnggota: arrayUnion(target),
      });
      showToast(`@${target} berhasil ditambahkan!`, "success");
      setUsername("");
      setSelectedUser(null);
      setSuggestions([]);
      onClose();
    } catch {
      showToast("Gagal menambahkan anggota.", "error");
    } finally {
      setAdding(false);
    }
  };

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setUsername("");
      setSelectedUser(null);
      setSuggestions([]);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 12 }}
            className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-cyan-500" />
                <h3 className="text-base font-bold text-slate-800">Invite Anggota</h3>
              </div>
              <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 text-sm">
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              <div className="relative">
                <span className="absolute left-4 top-[14px] text-sm text-slate-400">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setSelectedUser(null);
                  }}
                  placeholder="Cari username..."
                  className="w-full p-3.5 pl-9 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-cyan-500 transition-colors"
                  autoComplete="off"
                />
                {selectedUser && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  </span>
                )}
                {searching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="text-[11px] text-slate-400 animate-pulse">...</span>
                  </span>
                )}

                {/* Autocomplete dropdown */}
                <AnimatePresence>
                  {suggestions.length > 0 && !selectedUser && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute left-0 right-0 top-[calc(100%+4px)] bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden z-50"
                    >
                      {suggestions.map((user) => (
                        <button
                          key={user.username}
                          onClick={() => handleSelectUser(user)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden shrink-0">
                            {user.photoURL && (
                              <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{user.displayName}</p>
                            <p className="text-[11px] text-slate-400">@{user.username}</p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* No results */}
                {username.length >= 2 && !searching && suggestions.length === 0 && !selectedUser && (
                  <p className="text-[11px] text-slate-400 mt-2">Tidak ada user yang cocok. Pastikan username benar.</p>
                )}
              </div>

              {/* Selected user preview */}
              {selectedUser && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl"
                >
                  <div className="w-9 h-9 rounded-full bg-emerald-100 overflow-hidden shrink-0">
                    {selectedUser.photoURL && (
                      <img src={selectedUser.photoURL} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">{selectedUser.displayName}</p>
                    <p className="text-[11px] text-emerald-600">@{selectedUser.username} · Siap diundang</p>
                  </div>
                </motion.div>
              )}

              {/* Current members */}
              <div>
                <p className="text-[11px] font-medium text-slate-400 mb-2 uppercase tracking-wider">
                  Anggota Saat Ini ({listAnggota.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {listAnggota.map((u) => (
                    <span key={u} className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      @{u}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 border-t border-slate-100 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-semibold rounded-2xl transition-colors text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleInvite}
                disabled={!username.trim() || adding}
                className="flex-1 py-3.5 bg-cyan-500 text-white font-semibold rounded-2xl transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                <UserPlus size={16} />
                {adding ? "Menambahkan..." : "Undang"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
