import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerEnv } from "@/lib/supabase/env";
import {
  getRazorpayServerConfig,
  verifyRazorpayPaymentSignature,
} from "@/lib/payments/razorpay";

const verifySchema = z.object({
  publicToken: z.string().min(10),
  razorpayOrderId: z.string().min(4),
  razorpayPaymentId: z.string().min(4),
  razorpaySignature: z.string().min(10),
});

export async function POST(request: NextRequest) {
  const rzpConfig = getRazorpayServerConfig();
  if (!rzpConfig.isConfigured) {
    return NextResponse.json(
      { error: "Razorpay keys not configured." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payment verification payload." },
        { status: 400 }
      );
    }

    const isValid = verifyRazorpayPaymentSignature({
      razorpayOrderId: parsed.data.razorpayOrderId,
      razorpayPaymentId: parsed.data.razorpayPaymentId,
      razorpaySignature: parsed.data.razorpaySignature,
      keySecret: rzpConfig.keySecret,
    });

    if (!isValid) {
      return NextResponse.json(
        { verified: false, error: "Invalid payment signature detected." },
        { status: 400 }
      );
    }

    const serverEnv = getSupabaseServerEnv();
    if (!serverEnv.hasServiceRole) {
      return NextResponse.json(
        {
          verified: false,
          error: "SUPABASE_SERVICE_ROLE_KEY is required to settle payment state.",
        },
        { status: 503 }
      );
    }

    const admin = createAdminClient();
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, payment_status")
      .eq("public_token", parsed.data.publicToken)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    await admin
      .from("payments")
      .update({
        provider_payment_id: parsed.data.razorpayPaymentId,
        provider_signature: parsed.data.razorpaySignature,
        status: "successful",
      })
      .eq("order_id", order.id)
      .eq("provider_order_id", parsed.data.razorpayOrderId);

    await admin
      .from("orders")
      .update({ payment_status: "paid" })
      .eq("id", order.id);

    return NextResponse.json({ verified: true, status: "paid" });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Payment verification error.",
      },
      { status: 500 }
    );
  }
}
