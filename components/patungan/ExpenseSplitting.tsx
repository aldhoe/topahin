"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/components/providers/ToastProvider";
import EmptyState from "@/components/ui/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Receipt, ArrowRight, ArrowLeft, Trash2, Users, X } from "lucide-react";

interface Expense {
  id: string;
  deskripsi: string;
  nominal: number;
  paidBy: string; // username who paid
  splitWith: string[]; // usernames to split with
  createdAt: Date;
}

interface ExpenseSplittingProps {
  patunganId: string;
  expenses: Expense[];
  listAnggota: string[];
  currentUsername: string;
}

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export default function ExpenseSplitting({
  patunganId,
  expenses = [],
  listAnggota,
  currentUsername,
}: ExpenseSplittingProps) {
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [deskripsi, setDeskripsi] = useState("");
  const [nominal, setNominal] = useState("");
  const [paidBy, setPaidBy] = useState(currentUsername);
  const [splitWith, setSplitWith] = useState<string[]>(listAnggota);

  const handleAdd = async () => {
    if (!deskripsi.trim() || !nominal) return showToast("Isi semua field.", "error");
    try {
      const newExpense: Expense = {
        id: Date.now().toString(),
        deskripsi: deskripsi.trim(),
        nominal: parseInt(nominal.replace(/\D/g, "")),
        paidBy,
        splitWith: splitWith.length > 0 ? splitWith : listAnggota,
        createdAt: new Date(),
      };

      await updateDoc(doc(db, "patungan", patunganId), {
        expenses: [...expenses, newExpense],
      });

      setDeskripsi("");
      setNominal("");
      setShowForm(false);
      showToast("Pengeluaran ditambahkan!", "success");
    } catch {
      showToast("Gagal menyimpan.", "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const updated = expenses.filter((e) => e.id !== id);
      await updateDoc(doc(db, "patungan", patunganId), { expenses: updated });
      showToast("Dihapus.", "success");
    } catch {
      showToast("Gagal hapus.", "error");
    }
  };

  const toggleSplitWith = (username: string) => {
    setSplitWith((prev) =>
      prev.includes(username)
        ? prev.filter((u) => u !== username)
        : [...prev, username]
    );
  };

  // Calculate settlements
  const calculateSettlements = (): Settlement[] => {
    // Calculate net balance for each person
    const balances: Record<string, number> = {};
    listAnggota.forEach((u) => (balances[u] = 0));

    expenses.forEach((expense) => {
      const perPerson = expense.nominal / expense.splitWith.length;
      // Person who paid gets credited
      balances[expense.paidBy] = (balances[expense.paidBy] || 0) + expense.nominal;
      // Each person who shares gets debited
      expense.splitWith.forEach((u) => {
        balances[u] = (balances[u] || 0) - perPerson;
      });
    });

    // Simplify debts
    const settlements: Settlement[] = [];
    const debtors = Object.entries(balances)
      .filter(([, b]) => b < -0.5)
      .sort((a, b) => a[1] - b[1]);
    const creditors = Object.entries(balances)
      .filter(([, b]) => b > 0.5)
      .sort((a, b) => b[1] - a[1]);

    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const amount = Math.min(-debtors[i][1], creditors[j][1]);
      if (amount > 0.5) {
        settlements.push({
          from: debtors[i][0],
          to: creditors[j][0],
          amount: Math.round(amount),
        });
      }
      debtors[i][1] += amount;
      creditors[j][1] -= amount;
      if (Math.abs(debtors[i][1]) < 0.5) i++;
      if (Math.abs(creditors[j][1]) < 0.5) j++;
    }

    return settlements;
  };

  const totalExpenses = expenses.reduce((acc, e) => acc + e.nominal, 0);
  const settlements = calculateSettlements();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Receipt size={16} className="text-emerald-500" />
          <h3 className="text-sm font-semibold text-slate-800">Expense Splitting</h3>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
          {showForm ? "Batal" : "+ Tambah"}
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
              <input type="text" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Deskripsi (makan siang, taxi, dll)"
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-emerald-500" />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rp</span>
                <input type="text" inputMode="numeric"
                  value={nominal ? parseInt(nominal).toLocaleString("id-ID") : ""}
                  onChange={(e) => setNominal(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  className="w-full p-3 pl-10 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-emerald-500" />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Dibayar oleh</label>
                <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-emerald-500">
                  {listAnggota.map((u) => (
                    <option key={u} value={u}>@{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1.5 block">Split dengan</label>
                <div className="flex flex-wrap gap-2">
                  {listAnggota.map((u) => (
                    <button key={u} onClick={() => toggleSplitWith(u)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all border ${
                        splitWith.includes(u)
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                          : "bg-slate-50 text-slate-400 border-slate-200"
                      }`}>
                      @{u}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleAdd}
                className="w-full py-3 bg-emerald-500 text-white font-semibold rounded-xl active:scale-[0.98] transition-all text-sm">
                Simpan
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expenses List */}
      {expenses.length > 0 ? (
        <>
          {/* Total */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 rounded-xl text-white flex justify-between items-center">
            <div>
              <span className="text-[11px] font-medium text-emerald-100">Total Pengeluaran</span>
              <p className="text-lg font-bold">Rp {totalExpenses.toLocaleString("id-ID")}</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-medium text-emerald-100">Rata-rata</span>
              <p className="text-sm font-bold">Rp {Math.ceil(totalExpenses / listAnggota.length).toLocaleString("id-ID")}/orang</p>
            </div>
          </div>

          {/* List */}
          <div className="space-y-2">
            {expenses.map((expense, i) => (
              <motion.div key={expense.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center group">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{expense.deskripsi}</p>
                  <p className="text-[11px] text-slate-400">
                    Dibayar @{expense.paidBy} · Split {expense.splitWith.length} orang
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-700">Rp {expense.nominal.toLocaleString("id-ID")}</p>
                  {expense.paidBy === currentUsername && (
                    <button onClick={() => handleDelete(expense.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Settlements */}
          {settlements.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-600 mb-3 flex items-center gap-2">
                <ArrowRight size={14} /> Siapa Bayar Siapa
              </h4>
              <div className="space-y-2">
                {settlements.map((s, i) => (
                  <div key={i} className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-center gap-3">
                    <span className="text-xs font-semibold text-amber-700">@{s.from}</span>
                    <ArrowRight size={14} className="text-amber-400" />
                    <span className="text-xs font-semibold text-amber-700">@{s.to}</span>
                    <span className="text-xs font-bold text-amber-600 ml-auto">
                      Rp {s.amount.toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyState title="Belum ada pengeluaran" description="Catat pengeluaran aktual selama trip biar bisa dihitung split-nya." />
      )}
    </div>
  );
}
