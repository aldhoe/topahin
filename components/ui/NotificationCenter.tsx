"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, limit, updateDoc, doc, writeBatch } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, CheckCircle2, XCircle, UserPlus, ListChecks, Vote as VoteIcon } from "lucide-react";
import type { AppNotification } from "@/types";

interface NotificationCenterProps {
  userId: string;
}

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  deposit_approved: <CheckCircle2 size={14} className="text-emerald-500" />,
  deposit_rejected: <XCircle size={14} className="text-red-500" />,
  member_joined: <UserPlus size={14} className="text-cyan-500" />,
  task_added: <ListChecks size={14} className="text-blue-500" />,
  vote_created: <VoteIcon size={14} className="text-purple-500" />,
};

export default function NotificationCenter({ userId }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Listen to user's notifications
  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "users", userId, "notifications"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      const notifs = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AppNotification[];
      setNotifications(notifs);
    });

    return () => unsub();
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications
        .filter((n) => !n.isRead)
        .forEach((n) => {
          const ref = doc(db, "users", userId, "notifications", n.id);
          batch.update(ref, { isRead: true });
        });
      await batch.commit();
    } catch {
      // ignore
    }
  };

  const handleMarkRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, "users", userId, "notifications", notifId), {
        isRead: true,
      });
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon with badge (#12) */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && unreadCount > 0) {
            handleMarkAllRead();
          }
        }}
        className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        title="Notifikasi"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h4 className="text-sm font-bold text-slate-800">Notifikasi</h4>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              {/* Notifications */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => {
                        handleMarkRead(notif.id);
                        // Could navigate to patunganId here
                      }}
                      className={`w-full text-left p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                        !notif.isRead ? "bg-cyan-50/50" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {NOTIF_ICONS[notif.type] || <Bell size={14} className="text-slate-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800">{notif.title}</p>
                          <p className="text-[11px] text-slate-400 line-clamp-2">{notif.message}</p>
                          <p className="text-[10px] text-slate-300 mt-1">
                            {(notif.createdAt as any)?.toDate
                              ? (notif.createdAt as any).toDate().toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </p>
                        </div>
                        {!notif.isRead && (
                          <div className="w-2 h-2 bg-cyan-500 rounded-full shrink-0 mt-1" />
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <Bell size={24} className="text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">Belum ada notifikasi</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
