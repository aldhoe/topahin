"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { motion } from "framer-motion";
import type { UserProfile, Deposit } from "@/types";

interface AnggotaTabProps {
  listAnggota: string[];
  targetPerOrang: number;
  patunganId: string;
  usernamePembuat: string;
  pembuat: string;
}

export default function AnggotaTab({
  listAnggota,
  targetPerOrang,
  patunganId,
  usernamePembuat,
  pembuat,
}: AnggotaTabProps) {
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);

  // Fetch only relevant users (members of this project)
  useEffect(() => {
    if (!listAnggota.length) return;

    // Query users whose username is in the listAnggota
    // Firestore 'in' query supports up to 30 items
    const q = query(
      collection(db, "users"),
      where("username", "in", listAnggota.slice(0, 30))
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setAllUsers(snapshot.docs.map((d) => d.data() as UserProfile));
    });

    return () => unsub();
  }, [listAnggota]);

  // Listen to approved deposits
  useEffect(() => {
    const q = query(
      collection(db, "patungan", patunganId, "deposits"),
      where("status", "==", "approved")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setDeposits(snapshot.docs.map((d) => d.data() as Deposit));
    });

    return () => unsub();
  }, [patunganId]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 mb-4 flex justify-between items-center">
        <div>
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
            Target Per Orang
          </p>
          <p className="text-lg font-bold text-slate-800">
            Rp {targetPerOrang.toLocaleString("id-ID")}
          </p>
        </div>
        <span className="text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg">
          {listAnggota.length} orang
        </span>
      </div>

      <h3 className="text-sm font-semibold text-slate-800 mb-4 pl-1">
        Status Pembayaran
      </h3>

      {/* Member List */}
      <div className="space-y-3">
        {listAnggota.map((username) => {
          const userDetail = allUsers.find(
            (u) => u.username?.toLowerCase() === username.toLowerCase()
          );

          // Calculate total setoran from approved deposits
          const totalSetoran = deposits
            .filter(
              (d) => d.username?.toLowerCase() === username.toLowerCase()
            )
            .reduce((acc, d) => acc + (d.nominal || 0), 0);

          const progress = Math.min(
            Math.floor((totalSetoran / targetPerOrang) * 100),
            100
          );
          const isLunas = totalSetoran >= targetPerOrang;

          // Display name logic
          const displayName =
            userDetail?.displayName ||
            (username === usernamePembuat ? pembuat : null) ||
            username.charAt(0).toUpperCase() + username.slice(1);

          return (
            <div
              key={username}
              className="bg-white p-4 rounded-2xl border border-slate-100 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden shrink-0 text-xs font-bold ${
                      isLunas
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {userDetail?.photoURL ? (
                      <img
                        src={userDetail.photoURL}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      displayName.charAt(0)
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-slate-400">@{username}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className={`text-sm font-bold ${
                      isLunas ? "text-emerald-600" : "text-slate-800"
                    }`}
                  >
                    Rp {totalSetoran.toLocaleString("id-ID")}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {isLunas
                      ? "Lunas ✓"
                      : `Sisa Rp ${(targetPerOrang - totalSetoran).toLocaleString("id-ID")}`}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    isLunas ? "bg-emerald-500" : "bg-cyan-500"
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
