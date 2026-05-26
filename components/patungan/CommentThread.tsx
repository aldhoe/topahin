"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";

export interface Comment {
  id: string;
  username: string;
  photoURL?: string;
  text: string;
  createdAt: string; // ISO string
}

interface CommentThreadProps {
  comments: Comment[];
  currentUsername: string;
  currentPhotoURL?: string;
  onAddComment: (text: string) => void;
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "baru";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j`;
  const days = Math.floor(hours / 24);
  return `${days}h`;
}

export default function CommentThread({
  comments,
  currentUsername,
  currentPhotoURL,
  onAddComment,
}: CommentThreadProps) {
  const [newComment, setNewComment] = useState("");
  const [showAll, setShowAll] = useState(false);

  const displayComments = showAll ? comments : comments.slice(-3);
  const hasMore = comments.length > 3 && !showAll;

  const handleSubmit = () => {
    const text = newComment.trim();
    if (!text) return;
    onAddComment(text);
    setNewComment("");
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      {/* Comments list */}
      {comments.length > 0 && (
        <div className="space-y-2 mb-3">
          {hasMore && (
            <button
              onClick={() => setShowAll(true)}
              className="text-[11px] font-medium text-cyan-500 hover:text-cyan-600 transition-colors"
            >
              Lihat {comments.length - 3} komentar lainnya
            </button>
          )}

          <AnimatePresence initial={false}>
            {displayComments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2"
              >
                <div className="w-6 h-6 rounded-full bg-slate-100 overflow-hidden shrink-0 mt-0.5">
                  {comment.photoURL && (
                    <img src={comment.photoURL} alt="" className="w-full h-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-slate-700 leading-snug">
                    <span className="font-semibold text-slate-800">@{comment.username}</span>{" "}
                    {comment.text}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {timeAgo(comment.createdAt)}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-slate-100 overflow-hidden shrink-0">
          {currentPhotoURL && (
            <img src={currentPhotoURL} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="flex-1 flex items-center gap-1 bg-slate-50 rounded-lg border border-slate-100">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Tulis komentar..."
            className="flex-1 px-3 py-2 bg-transparent text-sm outline-none placeholder:text-slate-300"
          />
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim()}
            className="p-2 text-cyan-500 disabled:text-slate-200 transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
