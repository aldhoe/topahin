import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

// Inisialisasi Admin SDK (Cek biar gak dobel)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace \n biar line break-nya bener di Vercel
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
      // Potong order_id buat dapet ID Dokumen (ID-TIMESTAMP)
      const projectId = data.order_id.split("-")[0];
      
      const docRef = dbAdmin.collection("patungan").doc(projectId);
      const nominal = parseFloat(data.gross_amount);

      // Pake Admin SDK: Gak peduli Rules, PASTI TEMBUS
      await docRef.update({
        terkumpul: admin.firestore.FieldValue.increment(nominal),
        riwayat: admin.firestore.FieldValue.arrayUnion({
          nama: data.customer_details?.full_name || "Anggota",
          nominal: nominal,
          waktu: admin.firestore.Timestamp.now(),
          metode: data.payment_type || "transfer",
          username: "system_payment"
        })
      });

      console.log("🚀 SALDO BERHASIL DIUPDATE!");
      return NextResponse.json({ status: "OK" }, { status: 200 });
    }

    return NextResponse.json({ status: "Received" });
  } catch (error: any) {
    console.error("❌ ERROR WEBHOOK:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}