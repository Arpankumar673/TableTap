// supabase/functions/verify-payment/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createHmac } from "node:crypto"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  // CORS handles
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }})
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = await req.json()
    const secret = Deno.env.get("RAZORPAY_KEY_SECRET")!

    // 1. Generate signature locally
    const generated_signature = createHmac("sha256", secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex")

    if (generated_signature !== razorpay_signature) {
      throw new Error("Invalid payment signature")
    }

    // 2. Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // 3. Update Order Status
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ 
        payment_status: "paid", 
        razorpay_payment_id: razorpay_payment_id,
        payment_method: 'online'
      })
      .eq("id", order_id)

    if (error) throw error

    return new Response(JSON.stringify({ status: "success" }), { 
      status: 200,
      headers: {
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({ status: "failed", error: error.message }), { 
      status: 400,
      headers: {
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
      }
    })
  }
})
