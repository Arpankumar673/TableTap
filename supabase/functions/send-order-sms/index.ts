// supabase/functions/send-order-sms/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID")
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")
const TWILIO_FROM = Deno.env.get("TWILIO_PHONE_NUMBER")
const DEFAULT_ADMIN = Deno.env.get("ADMIN_PHONE_NUMBER")

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8)
  console.log(`[${requestId}] 🚀 Broadcast Channel Established`)

  try {
    const payload = await req.json()
    console.log(`[${requestId}] 📦 Entry Received:`, JSON.stringify(payload))
    
    // Support all Supabase Trigger formats (record, data, or direct body)
    const record = payload.record || payload.data || payload
    if (!record || !record.id) {
       console.error(`[${requestId}] ⚠️ Critical: No record ID found in payload. Skipping.`)
       return new Response(JSON.stringify({ error: "Missing ID" }), { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    // 1. Fetch Itemized Order Details
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`id, total_amount, tables(table_number), order_items(quantity, menu_items(name))`)
      .eq("id", record.id)
      .single()

    if (orderErr) {
       throw new Error(`Order Lookup Fail: ${orderErr.message}`)
    }

    // 2. Fetch Active Dynamic Recipients
    const { data: dbRecipients, error: recipErr } = await supabase
      .from("sms_recipients")
      .select("phone_number")
      .eq("is_active", true)

    if (recipErr) {
       console.warn(`[${requestId}] ⚠️ SMS Table Lookup Issue: ${recipErr.message}. Checking defaults.`)
    }

    // 3. Assemble Authorized Broadcast List
    const deliveryMatrix = new Set<string>()
    if (DEFAULT_ADMIN) deliveryMatrix.add(DEFAULT_ADMIN)
    dbRecipients?.forEach(r => deliveryMatrix.add(r.phone_number))

    if (deliveryMatrix.size === 0) {
      console.warn(`[${requestId}] 🛑 Zero Authorized Terminals detected. SMS Broadcast Cancelled.`)
      return new Response(JSON.stringify({ success: false, reason: "No active numbers found" }), { status: 200 })
    }

    // 4. Draft Itemized Signal
    const dishSummary = order.order_items?.map((i: any) => 
       `${i.menu_items?.name || 'Dish'} x${i.quantity}`
    ).join(", ") || "No items detected"
    
    const message = `Sidhu Punjabi Alert! Order Received from Table ${order.tables?.table_number || '??'}. Items: ${dishSummary}. Total: ₹${order.total_amount}.`

    // 5. Final Gateway Activation
    if (!TWILIO_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
       console.error(`[${requestId}] 🛑 Gateway Interrupted: Missing Twilio Credentials!`)
       return new Response(JSON.stringify({ error: "Gateway Missing" }), { status: 500 })
    }

    console.log(`[${requestId}] 📡 Transmitting Signal to ${deliveryMatrix.size} authorized stations...`)

    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`
    const gatewayAuth = btoa(`${TWILIO_SID}:${TWILIO_AUTH_TOKEN}`)

    const transmissions = await Promise.all(
      Array.from(deliveryMatrix).map(async (to) => {
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { 
               "Authorization": `Basic ${gatewayAuth}`, 
               "Content-Type": "application/x-www-form-urlencoded" 
            },
            body: new URLSearchParams({ Body: message, From: TWILIO_FROM, To: to })
          })
          const details = await res.json()
          console.log(`[${requestId}] 🛰️ Response for ${to}: ${res.ok ? 'Success ✅' : 'Fail ❌ (' + details.message + ')'}`)
          return { to, success: res.ok, sid: details.sid, error: details.message }
        } catch (e) {
          console.error(`[${requestId}] ❌ Hardware Error for ${to}:`, e.message)
          return { to, success: false, error: e.message }
        }
      })
    )

    return new Response(JSON.stringify({ broadcast: true, signals: transmissions }), { 
      status: 200, headers: { "Content-Type": "application/json" }
    })

  } catch (err) {
    console.error(`[${requestId}] 🆘 Fatal Transmission Failure:`, err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
