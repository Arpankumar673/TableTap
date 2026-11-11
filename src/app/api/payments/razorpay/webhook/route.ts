import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerEnv } from "@/lib/supabase/env";
import {
  getRazorpayServerConfig,
  verifyRazorpayWebhookSignature,
} from "@/lib/payments/razorpay";

export async function POST(request: NextRequest) {
  const rzpConfig = getRazorpayServerConfig();
  if (!rzpConfig.webhookSecret) {
    return NextResponse.json(
      { error: "Razorpay webhook secret not configured." },
      { status: 503 }
    );
  }

  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("x-razorpay-signature") || "";

    const isValid = verifyRazorpayWebhookSignature({
      rawBody,
      signatureHeader,
      webhookSecret: rzpConfig.webhookSecret,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid webhook signature." },
        { status: 400 }
      );
    }

    const event = JSON.parse(rawBody) as {
      event?: string;
      payload?: {
        payment?: {
          entity?: {
            id?: string;
            order_id?: string;
            notes?: { tabletap_order_id?: string };
          };
        };
      };
    };

    const serverEnv = getSupabaseServerEnv();
    if (!serverEnv.hasServiceRole) {
      return NextResponse.json({ received: true, processed: false });
    }

    const paymentEntity = event.payload?.payment?.entity;
    const providerOrderId = paymentEntity?.order_id;
    const providerPaymentId = paymentEntity?.id;
    const tabletapOrderId = paymentEntity?.notes?.tabletap_order_id;

    if (!providerOrderId && !tabletapOrderId) {
      return NextResponse.json({ received: true });
    }

    const admin = createAdminClient();

    if (event.event === "payment.captured") {
      if (providerOrderId) {
        await admin
          .from("payments")
          .update({
            provider_payment_id: providerPaymentId ?? null,
            status: "successful",
          })
          .eq("provider_order_id", providerOrderId);
      }

      if (tabletapOrderId) {
        await admin
          .from("orders")
          .update({ payment_status: "paid" })
          .eq("id", tabletapOrderId);
      }
    } else if (event.event === "payment.failed") {
      if (providerOrderId) {
        await admin
          .from("payments")
          .update({
            provider_payment_id: providerPaymentId ?? null,
            status: "failed",
          })
          .eq("provider_order_id", providerOrderId);
      }

      if (tabletapOrderId) {
        await admin
          .from("orders")
          .update({ payment_status: "failed" })
          .eq("id", tabletapOrderId)
          .neq("payment_status", "paid");
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}
