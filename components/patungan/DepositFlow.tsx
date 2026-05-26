"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from "@/components/providers/ToastProvider";
import { compressImage } from "@/lib/utils";
import { Upload, ArrowRight, ArrowLeft, Building2, CheckCircle2, Copy, Check } from "lucide-react";
import { logActivity } from "@/lib/logActivity";
import type { UserProfile, BankSettings } from "@/types";

interface DepositFlowProps {
  patunganId: string;
  targetPerOrang: number;
  sudahDibayar: number;
  profile: UserProfile | null;
  bankSettings: BankSettings;
  onClose: () => void;
  namaPatungan?: string;
}

type Step = "amount" | "transfer" | "confirming" | "upload" | "done";

export default function DepositFlow({
  patunganId,
  targetPerOrang,
  sudahDibayar,
  profile,
  bankSettings,
  onClose,
  namaPatungan,
}: DepositFlowProps) {
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>("amount");
  const [nominal, setNominal] = useState<number>(0);
  const [buktiFile, setBuktiFile] = useState<File | null>(null);
  const [buktiPreview, setBuktiPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      cooldownRef.current = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => { if (cooldownRef.current) clearTimeout(cooldownRef.current); };
    }
  }, [cooldown]);

  const sisaTagihan = Math.max(targetPerOrang - sudahDibayar, 0);

  const handleCopyRekening = async () => {
    try {
      await navigator.clipboard.writeText(bankSettings.accountNumber);
      setCopied(true);
      showToast("Nomor rekening disalin!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Gagal menyalin.", "error");
    }
  };

  const handleTransferConfirm = () => {
    setStep("confirming");
    // Brief animation before proceeding to upload
    setTimeout(() => setStep("upload"), 1200);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Compress image before storing
      const compressed = await compressImage(file, 1200, 0.8);
      setBuktiFile(compressed);
      setBuktiPreview(URL.createObjectURL(compressed));
    }
  };

  const handleSubmit = async () => {
    if (!buktiFile || !auth.currentUser || !profile) return;
    if (cooldown > 0) return showToast(`Tunggu ${cooldown} detik lagi.`, "error");

    setUploading(true);
    try {
      // 1. Upload bukti transfer to Storage
      const storageRef = ref(
        storage,
        `deposits/${patunganId}/${Date.now()}-${buktiFile.name}`
      );
      const snapshot = await uploadBytes(storageRef, buktiFile);
      const buktiUrl = await getDownloadURL(snapshot.ref);

      // 2. Create deposit document in subcollection
      await addDoc(collection(db, "patungan", patunganId, "deposits"), {
        patunganId,
        namaPatungan: namaPatungan || "", // denormalized for admin performance (#3)
        username: profile.username,
        displayName: profile.displayName,
        photoURL: profile.photoURL || "",
        nominal,
        buktiUrl,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      setStep("done");
      setCooldown(30); // 30 second cooldown
      showToast("Deposit berhasil dikirim!", "success");

      logActivity({
        patunganId,
        type: "deposit_submitted",
        actor: profile.username,
        actorPhoto: profile.photoURL || "",
        description: `menyetorkan dana Rp ${nominal.toLocaleString("id-ID")}`,
      });
    } catch (error) {
      console.error("Deposit error:", error);
      showToast("Gagal mengirim deposit, coba lagi.", "error");
    } finally {
      setUploading(false);
    }
  };

  // Format number as Rp currency
  const formatCurrency = (value: string) => {
    const num = value.replace(/\D/g, "");
    return num ? parseInt(num).toLocaleString("id-ID") : "";
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
      {/* Step Indicator */}
      <div className="flex items-center gap-1 p-4 border-b border-slate-100">
        {["amount", "transfer", "upload"].map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={`h-1 flex-1 rounded-full transition-colors ${
                ["amount", "transfer", "confirming", "upload", "done"].indexOf(step) >= i
                  ? "bg-cyan-500"
                  : "bg-slate-100"
              }`}
            />
          </div>
        ))}
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Amount */}
          {step === "amount" && (
            <motion.div
              key="amount"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h3 className="text-base font-bold text-slate-800 mb-1">
                  Nominal Setoran
                </h3>
                <p className="text-xs text-slate-400">
                  Sisa tagihan: Rp {sisaTagihan.toLocaleString("id-ID")}
                </p>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-lg">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={nominal ? nominal.toLocaleString("id-ID") : ""}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    const val = Number(raw);
                    setNominal(val > sisaTagihan ? sisaTagihan : val);
                  }}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-2xl font-bold text-slate-800 outline-none focus:border-cyan-500 focus:bg-white transition-all"
                />
              </div>

              {/* Quick amount button */}
              <button
                onClick={() => setNominal(sisaTagihan)}
                className="w-full py-2.5 bg-cyan-50 hover:bg-cyan-100 text-xs font-semibold text-cyan-600 rounded-xl transition-colors border border-cyan-100"
              >
                Lunasin — Rp {sisaTagihan.toLocaleString("id-ID")}
              </button>

              <button
                onClick={() => setStep("transfer")}
                disabled={!nominal || nominal <= 0}
                className="w-full py-4 bg-slate-900 text-white font-semibold rounded-2xl transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Lanjut
                <ArrowRight size={16} />
              </button>
            </motion.div>
          )}

          {/* Step 2: Bank Info */}
          {step === "transfer" && (
            <motion.div
              key="transfer"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h3 className="text-base font-bold text-slate-800 mb-1">
                  Transfer ke Rekening
                </h3>
                <p className="text-xs text-slate-400">
                  Nominal: Rp {nominal.toLocaleString("id-ID")}
                </p>
              </div>

              {/* Bank Card */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-2xl text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <Building2 size={20} className="text-cyan-400" />
                  </div>
                  <span className="text-sm font-semibold text-slate-300">
                    {bankSettings.bankName}
                  </span>
                </div>

                {/* Account number with copy button */}
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-2xl font-bold tracking-wider font-mono flex-1">
                    {bankSettings.accountNumber}
                  </p>
                  <button
                    onClick={handleCopyRekening}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors shrink-0"
                    title="Salin nomor rekening"
                  >
                    {copied ? (
                      <Check size={16} className="text-emerald-400" />
                    ) : (
                      <Copy size={16} className="text-slate-300" />
                    )}
                  </button>
                </div>
                <p className="text-sm text-slate-400">
                  a.n.{" "}
                  <span className="text-white font-semibold">
                    {bankSettings.accountHolder}
                  </span>
                </p>
              </div>

              <p className="text-xs text-slate-400 text-center leading-relaxed">
                Transfer tepat{" "}
                <span className="font-semibold text-slate-700">
                  Rp {nominal.toLocaleString("id-ID")}
                </span>{" "}
                lalu screenshot bukti transfernya.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("amount")}
                  className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={16} />
                  Kembali
                </button>
                <button
                  onClick={handleTransferConfirm}
                  className="flex-1 py-3.5 bg-slate-900 text-white font-semibold rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  Sudah Transfer
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2.5: Confirming Animation (#19) */}
          {step === "confirming" && (
            <motion.div
              key="confirming"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center py-10 space-y-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, ease: "linear", repeat: Infinity }}
                className="w-12 h-12 border-2 border-slate-100 border-t-cyan-500 rounded-full mx-auto"
              />
              <p className="text-sm font-semibold text-slate-600">Memverifikasi...</p>
            </motion.div>
          )}

          {/* Step 3: Upload Proof */}
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h3 className="text-base font-bold text-slate-800 mb-1">
                  Upload Bukti Transfer
                </h3>
                <p className="text-xs text-slate-400">
                  Screenshot bukti pembayaran dari m-banking
                </p>
              </div>

              {/* Upload Area */}
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {buktiPreview ? (
                  <div className="relative w-full aspect-[3/4] max-h-[320px] rounded-2xl overflow-hidden border border-slate-200 group">
                    <img
                      src={buktiPreview}
                      alt="Bukti transfer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs font-semibold text-white bg-slate-900/60 px-4 py-2 rounded-xl">
                        Ganti Foto
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full py-12 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center gap-3 hover:border-cyan-400 hover:bg-cyan-50/30 transition-all">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                      <Upload size={24} />
                    </div>
                    <span className="text-xs font-medium text-slate-400">
                      Tap untuk upload screenshot
                    </span>
                  </div>
                )}
              </label>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("transfer")}
                  className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={16} />
                  Kembali
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!buktiFile || uploading}
                  className="flex-1 py-3.5 bg-cyan-500 text-white font-semibold rounded-2xl transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {uploading ? "Mengirim..." : "Kirim Deposit"}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Done */}
          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6 space-y-4"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 mb-1">
                  Deposit Terkirim!
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Menunggu admin verifikasi bukti transfer kamu.
                  Status akan terupdate otomatis.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3.5 bg-slate-100 text-slate-600 font-semibold rounded-2xl transition-colors"
              >
                Tutup
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
