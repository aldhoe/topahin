import { NextResponse } from "next/server";
import { admin, dbAdmin } from "@/lib/firebaseAdmin";

// POST: Reject a deposit
export async function POST(
  request: Request,
  { params }: { params: Promise<{ depositId: string }> }
) {
  try {
    const { depositId } = await params;
    const { patunganId, adminUid, reason } = await request.json();

    if (!patunganId || !adminUid) {
      return NextResponse.json(
        { error: "Missing patunganId or adminUid" },
        { status: 400 }
      );
    }

    // Verify admin role
    const adminDoc = await dbAdmin.collection("users").doc(adminUid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get the deposit
    const depositRef = dbAdmin
      .collection("patungan")
      .doc(patunganId)
      .collection("deposits")
      .doc(depositId);

    const depositSnap = await depositRef.get();
    if (!depositSnap.exists) {
      return NextResponse.json(
        { error: "Deposit not found" },
        { status: 404 }
      );
    }

    const depositData = depositSnap.data();
    if (depositData?.status !== "pending") {
      return NextResponse.json(
        { error: "Deposit already processed" },
        { status: 400 }
      );
    }

    // Update deposit status to rejected
    await depositRef.update({
      status: "rejected",
      rejectedReason: reason || "Bukti transfer tidak valid",
      approvedBy: adminDoc.data()?.username || "admin",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ status: "rejected" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Reject Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
