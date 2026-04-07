import { NextResponse } from "next/server";
const Midtrans = require("midtrans-client");

export async function POST(request: Request) {
  try {
    const { orderId, amount, itemDetails, customerDetails } = await request.json();

    // Pastiin Server Key ada
    if (!process.env.MIDTRANS_SERVER_KEY) {
      throw new Error("MIDTRANS_SERVER_KEY is missing in environment variables");
    }

    let snap = new Midtrans.Snap({
      isProduction: false, // Tetap false buat Sandbox
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
    });

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      item_details: itemDetails,
      customer_details: customerDetails,
      usage_limit: 1,
    };

    const transaction = await snap.createTransaction(parameter);
    return NextResponse.json({ token: transaction.token });

  } catch (error: any) {
    console.error("Midtrans Checkout Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}