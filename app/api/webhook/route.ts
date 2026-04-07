import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, arrayUnion, Timestamp, getDoc } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log("LOG: Menerima data dari Midtrans untuk Order ID:", data.order_id);

    if (data.transaction_status === "settlement" || data.transaction_status === "capture") {
      const orderId = data.order_id;
      const projectId = orderId.split("-")[0];

      console.log("LOG: Mencoba update Project ID:", projectId);

      // CEK DULU: Dokumennya ada gak?
      const docRef = doc(db, "patungan", projectId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.error("❌ ERROR: Dokumen Project ID ini GAK ADA di Firestore!");
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      const nominal = parseFloat(data.gross_amount);

      // EKSEKUSI UPDATE
      await updateDoc(docRef, {
        terkumpul: increment(nominal),
        riwayat: arrayUnion({
          nama: data.customer_details?.full_name || "Aldo",
          nominal: nominal,
          waktu: Timestamp.now(),
          metode: data.payment_type || "transfer",
          username: "system_payment"
        })
      });

      console.log("✅ BERHASIL: Firestore Update Selesai!");
      return NextResponse.json({ message: "Success" }, { status: 200 });
    }

    return NextResponse.json({ message: "Status ignored" }, { status: 200 });

  } catch (error: any) {
    console.error("❌ ERROR ASLI DARI FIREBASE:", error.code, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}