import { Timestamp } from "firebase/firestore";

// ========================
// USER
// ========================
export interface UserProfile {
  uid: string;
  displayName: string;
  username: string; // lowercase, unique
  photoURL: string;
  email: string;
  role: "admin" | "member";
  createdAt: Timestamp | Date;
}

// ========================
// PATUNGAN (PROJECT)
// ========================
export type PatunganStatus = "active" | "archived";

export type BudgetCategory = "transport" | "makan" | "aktivitas" | "akomodasi" | "lainnya";

export interface Patungan {
  id: string;
  namaPatungan: string;
  deskripsi: string;
  isTrip: boolean;
  targetPerOrang: number;
  targetDana: number; // targetPerOrang * jumlah anggota
  terkumpul: number;

  // Trip-specific
  tanggalMulai?: Timestamp | Date | null;
  tanggalSelesai?: Timestamp | Date | null;
  paymentDeadline?: Timestamp | Date | string | null;

  // Owner info
  pembuat: string; // display name
  usernamePembuat: string;
  fotoPembuat: string;
  uidPembuat: string;

  // Members
  listAnggota: string[]; // usernames, lowercase

  // State
  status: PatunganStatus;
  createdAt: Timestamp;

  // Embedded arrays (optional — added by features)
  rundown?: RundownItem[];
  itinerary?: ItineraryItem[];
  tasks?: Task[];
  packingItems?: PackingCategory[];
  votes?: VoteOption[];
  expenses?: any[];
}

// ========================
// DEPOSIT (replaces riwayat)
// ========================
export type DepositStatus = "pending" | "approved" | "rejected";

export interface Deposit {
  id: string;
  patunganId: string;
  namaPatungan?: string; // denormalized for admin panel performance
  username: string;
  displayName: string;
  photoURL: string;
  nominal: number;
  buktiUrl: string; // screenshot proof of transfer
  status: DepositStatus;
  approvedBy?: string;
  rejectedReason?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ========================
// RUNDOWN (ITINERARY ITEMS)
// ========================
export interface RundownItem {
  id: string;
  tanggal: string; // ISO date string "2026-12-25"
  waktu: string; // "08:00"
  aktivitas: string;
  lokasi: string;
  biaya: number;
  kategori?: BudgetCategory;
  transport: string;
  foto: string;
  location?: {
    address: string;
    lat: number;
    lng: number;
  };
  linkExternal: string;
  catatan: string;
  reactions?: Record<string, string[]>; // { "👍": ["aldhoe", "john"] }
  comments?: {
    id: string;
    username: string;
    photoURL?: string;
    text: string;
    createdAt: string;
  }[];
  createdAt: Timestamp | Date;
}

// ========================
// ITINERARY (BUDGET ITEMS for non-trip)
// ========================
export interface ItineraryItem {
  kegiatan: string;
  estimasiBiaya: number;
  waktu: Timestamp | Date;
}

// ========================
// DAY NOTES (separate from rundown items)
// ========================
export interface DayNote {
  tanggal: string; // ISO date string — acts as doc ID
  content: string;
  updatedAt?: Timestamp;
}

// ========================
// VOTING
// ========================
export interface VoteOption {
  id: string;
  tanggal: string; // which day this vote belongs to
  waktu: string;
  opsi: string; // description of the option
  createdBy: string; // username
  votes: string[]; // array of usernames who voted
  createdAt: Timestamp | Date;
}

// ========================
// TASKS
// ========================
export interface Task {
  id: number;
  text: string;
  pic: string; // username or "Semua Orang"
  isDone: boolean;
}

// ========================
// PACKING
// ========================
export interface PackingItem {
  id: number;
  name: string;
  pic: string;
  isDone: boolean;
}

export interface PackingCategory {
  category: string;
  items: PackingItem[];
}

// ========================
// BANK SETTINGS
// ========================
export interface BankSettings {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  bankIcon?: string; // path to icon file
}

// ========================
// NOTIFICATIONS
// ========================
export type NotificationType = "deposit_approved" | "deposit_rejected" | "member_joined" | "task_added" | "vote_created";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  patunganId?: string;
  isRead: boolean;
  createdAt: Timestamp | Date;
}

// ========================
// TOAST
// ========================
export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

// ========================
// BUDGET CATEGORY CONFIG
// ========================
export const BUDGET_CATEGORIES: Record<BudgetCategory, { label: string; icon: string; color: string }> = {
  transport: { label: "Transport", icon: "🚗", color: "bg-blue-50 text-blue-600 border-blue-100" },
  makan: { label: "Makan", icon: "🍽️", color: "bg-orange-50 text-orange-600 border-orange-100" },
  aktivitas: { label: "Aktivitas", icon: "🎯", color: "bg-purple-50 text-purple-600 border-purple-100" },
  akomodasi: { label: "Akomodasi", icon: "🏨", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  lainnya: { label: "Lainnya", icon: "📦", color: "bg-slate-50 text-slate-600 border-slate-100" },
};
