"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Sparkles } from "lucide-react";

interface TourStep {
  title: string;
  description: string;
  emoji: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    emoji: "👋",
    title: "Selamat datang di Topahin!",
    description: "Platform patungan & trip planner buat kamu dan temen-temen. Yuk kenalan dulu sama fitur-fiturnya.",
  },
  {
    emoji: "💰",
    title: "Bikin Project",
    description: "Klik 'Bikin Project' buat mulai. Bisa patungan biasa, atau trip lengkap dengan itinerary & packing list.",
  },
  {
    emoji: "📋",
    title: "Atur Itinerary",
    description: "Rencanain jadwal perjalanan hari per hari, lengkap dengan budget, lokasi, dan transport.",
  },
  {
    emoji: "💳",
    title: "Deposit & Tracking",
    description: "Anggota bisa upload bukti bayar, admin approve, dan semua orang bisa lihat progress secara real-time.",
  },
  {
    emoji: "🚀",
    title: "Siap Gas!",
    description: "Share project ke temen, react & komentar di timeline, dan export itinerary kapan aja. Have fun!",
  },
];

const STORAGE_KEY = "topahin-onboarding-done";

export default function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Delay a bit so the dashboard renders first
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const step = TOUR_STEPS[currentStep];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Skip */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 z-10"
            >
              <X size={14} />
            </button>

            {/* Content */}
            <div className="p-8 pt-10 text-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-5xl mb-4">{step.emoji}</div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {step.description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 pb-4">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentStep
                      ? "bg-cyan-500 w-5"
                      : i < currentStep
                      ? "bg-cyan-200"
                      : "bg-slate-200"
                  }`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-slate-100 flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                  className="px-4 py-3 bg-slate-100 text-slate-600 font-semibold rounded-2xl text-sm"
                >
                  Kembali
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex-1 py-3 bg-cyan-500 text-white font-semibold rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
              >
                {currentStep === TOUR_STEPS.length - 1 ? (
                  <>
                    <Sparkles size={16} /> Mulai!
                  </>
                ) : (
                  <>
                    Lanjut <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
