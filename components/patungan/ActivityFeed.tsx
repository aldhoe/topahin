"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import type { Timestamp } from "firebase/firestore";
import type { ActivityType } from "@/lib/logActivity";

interface Activity {
  id: string;
  type: ActivityType;
  actor: string;
  actorPhoto?: string;
  description: string;
  createdAt: Timestamp;
}

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  rundown_added: "📝",
  rundown_edited: "✏️",
  rundown_deleted: "🗑️",
  deposit_submitted: "💰",
  deposit_approved: "✅",
  deposit_rejected: "❌",
  member_joined: "👋",
  member_removed: "👤",
  vote_cast: "🗳️",
  task_added: "📋",
  task_completed: "✔️",
  project_edited: "⚙️",
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "baru saja";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}h lalu`;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

interface ActivityFeedProps {
  patunganId: string;
}

export default function ActivityFeed({ patunganId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "patungan", patunganId, "activities"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Activity[];
      setActivities(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [patunganId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse">
            <div className="w-8 h-8 bg-slate-100 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-slate-100 rounded w-3/4" />
              <div className="h-2.5 bg-slate-50 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-2xl mb-2">📋</p>
        <p className="text-sm font-medium text-slate-400">Belum ada aktivitas</p>
        <p className="text-[11px] text-slate-300 mt-1">
          Semua aktivitas di project ini akan tercatat di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <AnimatePresence initial={false}>
        {activities.map((activity, index) => {
          const icon = ACTIVITY_ICONS[activity.type] || "📌";
          const time = activity.createdAt?.toDate?.()
            ? timeAgo(activity.createdAt.toDate())
            : "";

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              {/* Avatar or Icon */}
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden text-sm">
                {activity.actorPhoto ? (
                  <img src={activity.actorPhoto} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span>{icon}</span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 leading-snug">
                  <span className="font-semibold text-slate-800">@{activity.actor}</span>{" "}
                  {activity.description}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{time}</p>
              </div>

              {/* Type badge */}
              <span className="text-sm shrink-0 mt-0.5">{icon}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
