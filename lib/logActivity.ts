import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export type ActivityType =
  | "rundown_added"
  | "rundown_edited"
  | "rundown_deleted"
  | "deposit_submitted"
  | "deposit_approved"
  | "deposit_rejected"
  | "member_joined"
  | "member_removed"
  | "vote_cast"
  | "task_added"
  | "task_completed"
  | "project_edited";

interface LogActivityParams {
  patunganId: string;
  type: ActivityType;
  actor: string; // username
  actorPhoto?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an activity to the project's activity feed.
 * Fire-and-forget — does not throw on failure.
 */
export async function logActivity({
  patunganId,
  type,
  actor,
  actorPhoto,
  description,
  metadata,
}: LogActivityParams) {
  try {
    await addDoc(collection(db, "patungan", patunganId, "activities"), {
      type,
      actor,
      actorPhoto: actorPhoto || "",
      description,
      metadata: metadata || {},
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Fire-and-forget: don't block main action
    console.warn("[logActivity] Failed:", error);
  }
}
