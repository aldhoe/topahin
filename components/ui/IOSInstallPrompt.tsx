"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share, PlusSquare } from "lucide-react";

const STORAGE_KEY = "topahin-ios-prompt-dismissed";

export default function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };

    const isStandalone = () => {
      return (
        "standalone" in window.navigator &&
        (window.navigator as any).standalone === true
      );
    };

    // Show if it's iOS and NOT in standalone (PWA) mode, and user hasn't dismissed it
    if (isIos() && !isStandalone()) {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        // Delay to not bombard the user immediately
        const timer = setTimeout(() => setShowPrompt(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[200]"
        >
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/50 p-4 rounded-2xl shadow-2xl relative">
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1.5 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={14} />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-slate-900 rounded-xl shrink-0 flex items-center justify-center shadow-inner">
                <img src="/icon-192x192.png" alt="Icon" className="w-8 h-8 rounded-lg" />
              </div>
              <div className="flex-1 pt-0.5">
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  Install Topahin
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                  Install app ini di iPhone kamu biar lebih gampang diakses dan kerasa kayak aplikasi beneran.
                </p>
                <div className="flex flex-col gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                    <span>1. Tap icon</span>
                    <Share size={14} className="text-blue-500" />
                    <span>di bawah Safari</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                    <span>2. Scroll ke bawah, pilih</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                    <PlusSquare size={14} className="text-slate-700" />
                    <span>"Add to Home Screen"</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Triangle pointer pointing down towards the Safari share button */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/80 backdrop-blur-xl border-b border-r border-slate-200/50 rotate-45" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
