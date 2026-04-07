import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, arrayUnion, Timestamp } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log("=== LOG WEBHOOK MASUK ===");
    console.log("Order ID:", data.order_id);
    console.log("Status:", data.transaction_status);

    // Kunci utama: Hanya proses kalau statusnya SETTLEMENT (Lunas)
    if (data.transaction_status === "settlement" || data.transaction_status === "capture") {
      
      // Ambil ID Project dari order_id (Format: IDPROJECT-TIMESTAMP)
      const orderId = data.order_id;
      const projectId = orderId.split("-")[0];

      if (!projectId) {
        console.error("❌ ERROR: ID Project gak ketemu di order_id!");
        return NextResponse.json({ error: "Invalid Project ID" }, { status: 400 });
      }

      const docRef = doc(db, "patungan", projectId);
      
      // Hitung nominal (mastiin dia angka)
      const nominal = parseFloat(data.gross_amount);

      // UPDATE FIRESTORE
      await updateDoc(docRef, {
        terkumpul: increment(nominal),
        riwayat: arrayUnion({
          nama: data.customer_details?.first_name || "Anggota",
          nominal: nominal,
          waktu: Timestamp.now(), // Pake Timestamp Firestore biar gak error di server
          metode: data.payment_type || "transfer",
          username: "system_payment" // Biar gak kosong di UI
        })
      });

      console.log("✅ BERHASIL: Firestore Update Selesai!");
      return NextResponse.json({ message: "Webhook Success" }, { status: 200 });
    }

    return NextResponse.json({ message: "Status ignored" }, { status: 200 });

  } catch (error: any) {
    console.error("❌ ERROR WEBHOOK:", error.message);
    // Kita tetep kasih 200 biar Midtrans gak nyepam, tapi kita tau ada yang salah
    return NextResponse.json({ error: error.message }, { status: 200 }); 
  }
}