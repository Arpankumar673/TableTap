// supabase/functions/send-order-sms/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID")
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")
const ADMIN_PHONE = Deno.env.get("ADMIN_PHONE_NUMBER")

serve(async (req) => {
  try {
    const payload = await req.json()
    const { record } = payload // Webhook payload format

    if (!record) throw new Error("No record found in payload")

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    // Fetch table number and items
    const { data: orderData, error } = await supabase
      .from("orders")
      .select(`
        id, 
        total_amount, 
        table_id,
        tables(table_number), 
        order_items(
          quantity, 
          menu_items(name)
        )
      `)
      .eq("id", record.id)
      .single()

    if (error || !orderData) throw new Error(error?.message || "Order not found")

    const itemsList = orderData.order_items.map((i: any) => 
      `${i.menu_items.name} x${i.quantity}`
    ).join(", ")
    
    const messageBody = `New Order! Table ${orderData.tables.table_number}: ${itemsList}. Total: ₹${orderData.total_amount}`

    console.log(`Sending SMS to admin: ${messageBody}`)

    if (!TWILIO_SID || !TWILIO_AUTH_TOKEN) {
      console.warn("Twilio credentials missing. SMS skipped.")
      return new Response(JSON.stringify({ sent: false, skipped: true }), { status: 200 })
    }

    // Sending via Twilio
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${TWILIO_SID}:${TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        Body: messageBody,
        From: Deno.env.get("TWILIO_PHONE_NUMBER")!,
        To: ADMIN_PHONE!,
      }),
    })

    const result = await response.json()

    return new Response(JSON.stringify({ sent: response.ok, result }), { 
      status: response.ok ? 200 : 400,
      headers: { "Content-Type": "application/json" }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
})
