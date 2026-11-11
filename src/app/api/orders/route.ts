import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { checkRateLimit } from "@/lib/security/tokens";
import { orderSubmissionSchema } from "@/lib/validation/order";

export async function POST(request: NextRequest) {
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rate = checkRateLimit(`order_submit:${clientIp}`, 20, 60_000);

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before placing another order." },
      { status: 429 }
    );
  }

  const { isConfigured } = getSupabasePublicEnv();
  if (!isConfigured) {
    return NextResponse.json(
      { error: "Database connection is not configured yet." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const parsed = orderSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.errors[0]?.message ?? "Invalid order request payload.",
        },
        { status: 400 }
      );
    }

    const { sessionToken, idempotencyKey, items, customerNotes } = parsed.data;

    const sqlItemsPayload = items.map((item) => ({
      product_id: item.productId,
      variant_id: item.variantId ?? null,
      quantity: item.quantity,
      option_value_ids: item.optionValueIds,
      notes: item.notes ?? null,
    }));

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("create_customer_order", {
      p_session_token: sessionToken,
      p_idempotency_key: idempotencyKey,
      p_items: sqlItemsPayload,
      p_customer_notes: customerNotes ?? null,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to submit order." },
        { status: 400 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Unexpected server error placing order.",
      },
      { status: 500 }
    );
  }
}
