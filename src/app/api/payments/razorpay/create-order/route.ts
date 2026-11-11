import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabasePublicEnv, getSupabaseServerEnv } from "@/lib/supabase/env";
import {
  createRazorpayOrder,
  getRazorpayServerConfig,
} from "@/lib/payments/razorpay";
import { checkRateLimit } from "@/lib/security/tokens";

const createPaymentSchema = z.object({
  publicToken: z.string().min(10, "Invalid order token"),
});

export async function POST(request: NextRequest) {
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rate = checkRateLimit(`rzp_create:${clientIp}`, 15, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many payment attempts. Please wait a minute." },
      { status: 429 }
    );
  }

  const { isConfigured } = getSupabasePublicEnv();
  if (!isConfigured) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 }
    );
  }

  const rzpConfig = getRazorpayServerConfig();
  if (!rzpConfig.isConfigured) {
    return NextResponse.json(
      {
        error:
          "Razorpay integration keys are not configured yet. Please pay at the counter or add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const parsed = createPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid order reference." },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: orderData, error: orderError } = await supabase.rpc(
      "get_order_by_public_token",
      { p_public_token: parsed.data.publicToken }
    );

    if (orderError || !orderData) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const order = orderData as {
      id: string;
      order_number: string;
      total: number;
      currency: string;
      payment_status: string;
    };

    if (order.payment_status === "paid") {
      return NextResponse.json(
        { error: "This order has already been paid." },
        { status: 409 }
      );
    }

    const amountMinor = Math.round(Number(order.total) * 100);
    if (amountMinor <= 0) {
      return NextResponse.json(
        { error: "Order amount must be greater than zero." },
        { status: 400 }
      );
    }

    const rzpOrder = await createRazorpayOrder({
      amountInMinorUnits: amountMinor,
      currency: order.currency || "INR",
      receipt: order.order_number,
      notes: {
        tabletap_order_id: order.id,
        order_number: order.order_number,
      },
    });

    const serverEnv = getSupabaseServerEnv();
    if (serverEnv.hasServiceRole) {
      const admin = createAdminClient();
      const { data: existingOrder } = await admin
        .from("orders")
        .select("restaurant_id")
        .eq("id", order.id)
        .single();

      await admin.from("payments").insert({
        restaurant_id: existingOrder?.restaurant_id ?? null,
        order_id: order.id,
        amount: order.total,
        currency: order.currency || "INR",
        provider: "razorpay",
        provider_order_id: rzpOrder.id,
        status: "pending",
      });

      await admin
        .from("orders")
        .update({ payment_status: "pending" })
        .eq("id", order.id);
    }

    return NextResponse.json({
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: rzpConfig.keyId,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to initiate payment.",
      },
      { status: 500 }
    );
  }
}
