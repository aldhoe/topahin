import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

// Inisialisasi Admin SDK
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log("✅ Firebase Admin Berhasil Inisialisasi");
  } catch (error: any) {
    console.error("❌ Firebase Admin Init Error:", error.message);
  }
}

const dbAdmin = admin.firestore();

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log("📩 Webhook Masuk:", data.order_id, data.transaction_status);

    if (data.transaction_status === "settlement" || data.transaction_status === "capture") {
      
      // --- PEMBEDAHAN ORDER_ID ---
      // Format dari Frontend: IDPROJECT - USERNAME - TIMESTAMP
      const parts = data.order_id.split("-");
      const projectId = parts[0];
      const usernameDariId = parts[1] || "anonim"; // Ngambil bagian tengah

      const docRef = dbAdmin.collection("patungan").doc(projectId);
      
      // Pastiin nominal beneran angka (Number) biar gak ngerusak field 'terkumpul'
      const nominal = Number(data.gross_amount);

      await docRef.update({
        // Increment otomatis nambahin angka yang sudah ada
        terkumpul: admin.firestore.FieldValue.increment(nominal),
        
        // Simpan ke riwayat dengan username yang benar
        riwayat: admin.firestore.FieldValue.arrayUnion({
          nama: data.customer_details?.first_name || data.customer_details?.full_name || "Anggota",
          nominal: nominal,
          waktu: admin.firestore.Timestamp.now(),
          metode: data.payment_type || "transfer",
          username: usernameDariId // <--- INI BIAR TAB ANGGOTA UPDATE
        })
      });

      console.log(`🚀 SALDO BERHASIL DIUPDATE UNTUK @${usernameDariId}`);
      return NextResponse.json({ status: "OK" }, { status: 200 });
    }

    return NextResponse.json({ status: "Received" });
  } catch (error: any) {
    console.error("❌ ERROR WEBHOOK:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}