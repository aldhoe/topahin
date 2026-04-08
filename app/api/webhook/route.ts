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
      const usernameRaw = parts[1] || "anonim";
      // Paksa username ke lowercase agar cocok dengan database
      const usernameDariId = usernameRaw.toLowerCase().trim();

      const docRef = dbAdmin.collection("patungan").doc(projectId);
      
      const docSnap = await docRef.get();
      if (!docSnap.exists) return NextResponse.json({ error: "Project Not Found" }, { status: 404 });
      
      const projectData = docSnap.data();
      const sudahAda = projectData?.riwayat?.some((r: any) => r.order_id === data.order_id);

      if (sudahAda) {
        console.log("⚠️ Transaksi sudah pernah dicatat, skip!");
        return NextResponse.json({ status: "Already Processed" }, { status: 200 });
      }

      // --- LOGIKA CARI FOTO USER (SATU TEMPAT SAJA) ---
      let userPhotoURL = "";
      console.log("🔍 Mencari foto untuk username:", usernameDariId);

      try {
        const userQuery = await dbAdmin.collection("users")
          .where("username", "==", usernameDariId)
          .limit(1)
          .get();
        
        if (!userQuery.empty) {
          const userData = userQuery.docs[0].data();
          userPhotoURL = userData.photoURL || "";
          console.log("✅ Foto Ketemu:", userPhotoURL);
        } else {
          console.log("❌ User tidak ditemukan di koleksi users untuk:", usernameDariId);
        }
      } catch (err) {
        console.error("❌ Error Query User:", err);
      }

      // --- LOGIKA POTONG ADMIN ---
      const BIAYA_ADMIN = 7000;
      const grossAmount = Number(data.gross_amount);
      const nominalBersih = Math.max(grossAmount - BIAYA_ADMIN, 0); 

      // Fallback Nama
      const namaAsli = data.customer_details?.first_name || 
                       data.customer_details?.full_name || 
                       (usernameDariId.charAt(0).toUpperCase() + usernameDariId.slice(1));

      // UPDATE KE FIRESTORE
      await docRef.update({
        terkumpul: admin.firestore.FieldValue.increment(nominalBersih),
        riwayat: admin.firestore.FieldValue.arrayUnion({
          order_id: data.order_id,
          nama: namaAsli, 
          username: usernameDariId, 
          photoURL: userPhotoURL, // Sekarang harusnya sudah terisi
          nominal: nominalBersih, 
          waktu: admin.firestore.Timestamp.now(),
          metode: data.payment_type || "transfer"
        })
      });

      console.log(`🚀 UPDATE BERHASIL: (+Rp ${nominalBersih}) UNTUK @${usernameDariId}`);
      return NextResponse.json({ status: "OK" }, { status: 200 });
    }

    return NextResponse.json({ status: "Received" });
  } catch (error: any) {
    console.error("❌ ERROR WEBHOOK:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}