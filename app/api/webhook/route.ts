import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, arrayUnion, getDoc } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log("Dapet notifikasi dari Midtrans:", data);

    // 1. Cek statusnya. 'settlement' artinya duit beneran udah masuk/lunas.
    if (data.transaction_status === "settlement") {
      
      // Ingat tadi kita bikin order_id formatnya "${id}-${Date.now()}"?
      // Kita pecah lagi buat dapetin ID Project aslinya.
      const orderIdParts = data.order_id.split("-");
      const projectId = orderIdParts[0]; // ID project Firestore

      const docRef = doc(db, "patungan", projectId);
      const projectSnap = await getDoc(docRef);

      if (projectSnap.exists()) {
        // 2. UPDATE FIRESTORE OTOMATIS
        await updateDoc(docRef, {
          terkumpul: increment(Number(data.gross_amount)), // Nambahin saldo terkumpul
          riwayat: arrayUnion({
            nama: data.customer_details?.first_name || "Anggota",
            nominal: Number(data.gross_amount),
            waktu: new Date(), // Simpan waktu bayar
            metode: data.payment_type // 'credit_card', 'gopay', 'qris', dll
          })
        });
        
        console.log("Firestore berhasil diupdate otomatis! 💸");
      }
    }

    // 3. Kasih tau Midtrans kalau datanya udah kita terima (Wajib)
    return NextResponse.json({ status: "OK" });

  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Gagal proses webhook" }, { status: 500 });
  }
}