import { NextResponse } from "next/server";
const Midtrans = require("midtrans-client");

let snap = new Midtrans.Snap({
  isProduction: true, // Set ke true kalau udah mau pake duit beneran
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});

export async function POST(request: Request) {
  const { orderId, amount, itemDetails, customerDetails } = await request.json();

  try {
    const parameter = {
      transaction_details: {
        order_id: orderId, // ID Unik buat transaksi ini
        gross_amount: amount,
      },
      item_details: itemDetails,
      customer_details: customerDetails,
      // Biar setelah bayar balik lagi ke web kita
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_APP_URL}/patungan/${orderId.split('-')[0]}`,
      },
    };

    const transaction = await snap.createTransaction(parameter);
    return NextResponse.json({ token: transaction.token });
  } catch (error) {
    console.error("Midtrans Error:", error);
    return NextResponse.json({ error: "Gagal membuat transaksi" }, { status: 500 });
  }
}