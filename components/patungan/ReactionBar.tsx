"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const REACTIONS = ["👍", "🔥", "❤️", "😂", "🤔"];

interface ReactionBarProps {
  reactions: Record<string, string[]>; // { "👍": ["aldhoe", "john"], "🔥": ["doe"] }
  currentUsername: string;
  onToggleReaction: (emoji: string) => void;
}

export default function ReactionBar({
  reactions,
  currentUsername,
  onToggleReaction,
}: ReactionBarProps) {
  const [showPicker, setShowPicker] = useState(false);

  // Active reactions (ones that have at least 1 vote)
  const activeReactions = REACTIONS.filter(
    (emoji) => reactions[emoji] && reactions[emoji].length > 0
  );

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Existing reactions */}
      {activeReactions.map((emoji) => {
        const users = reactions[emoji] || [];
        const isMine = users.includes(currentUsername);

        return (
          <motion.button
            key={emoji}
            whileTap={{ scale: 0.9 }}
            onClick={() => onToggleReaction(emoji)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all border ${
              isMine
                ? "bg-cyan-50 border-cyan-200 text-cyan-700"
                : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
            }`}
            title={users.join(", ")}
          >
            <span className="text-sm">{emoji}</span>
            <span className="font-semibold">{users.length}</span>
          </motion.button>
        );
      })}

      {/* Add reaction button */}
      <div className="relative">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowPicker(!showPicker)}
          className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors text-xs"
        >
          +
        </motion.button>

        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 4 }}
              className="absolute left-0 bottom-full mb-1 bg-white rounded-xl border border-slate-200 shadow-lg p-1.5 flex gap-0.5 z-50"
            >
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onToggleReaction(emoji);
                    setShowPicker(false);
                  }}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
