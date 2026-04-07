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
      
      const parts = data.order_id.split("-");
      const projectId = parts[0];
      const usernameDariId = parts[1] || "anonim";

      const docRef = dbAdmin.collection("patungan").doc(projectId);
      
      // 1. AMBIL DATA DULU BUAT CEK BIAR GAK DOUBLE
      const docSnap = await docRef.get();
      if (!docSnap.exists) return NextResponse.json({ error: "Project Not Found" }, { status: 404 });
      
      const projectData = docSnap.data();
      // Cek apakah Order ID ini sudah pernah diproses sebelumnya
      const sudahAda = projectData?.riwayat?.some((r: any) => r.order_id === data.order_id);

      if (sudahAda) {
        console.log("⚠️ Transaksi sudah pernah dicatat, skip!");
        return NextResponse.json({ status: "Already Processed" }, { status: 200 });
      }

      const nominal = Number(data.gross_amount);
      const namaAsli = data.customer_details?.first_name || data.customer_details?.full_name || (usernameDariId.charAt(0).toUpperCase() + usernameDariId.slice(1));

      // 2. UPDATE CUMA SEKALI AJA (GABUNGIN SEMUA DI SINI)
      await docRef.update({
        terkumpul: admin.firestore.FieldValue.increment(nominal),
        riwayat: admin.firestore.FieldValue.arrayUnion({
          order_id: data.order_id, // Simpan ID biar bisa dicek sama "SATPAM" di atas
          nama: namaAsli, 
          username: usernameDariId, 
          nominal: nominal,
          waktu: admin.firestore.Timestamp.now(),
          metode: data.payment_type || "transfer"
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