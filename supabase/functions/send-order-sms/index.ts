// supabase/functions/send-order-sms/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID")
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")
const TWILIO_FROM = Deno.env.get("TWILIO_PHONE_NUMBER")
const DEFAULT_ADMIN = Deno.env.get("ADMIN_PHONE_NUMBER")

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8)
  console.log(`[${requestId}] 🚀 Multi-Broadcast Initiated`)

  try {
    const payload = await req.json()
    const record = payload.record || payload.data || payload
    if (!record?.id) throw new Error("Missing order record")

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    // 1. Fetch order details for the message body
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`id, total_amount, tables(table_number), order_items(quantity, menu_items(name))`)
      .eq("id", record.id)
      .single()

    if (orderErr) throw new Error(`Database Error: ${orderErr.message}`)

    // 2. Fetch all ACTIVE dynamic recipients
    const { data: recipients, error: recipErr } = await supabase
      .from("sms_recipients")
      .select("phone_number")
      .eq("is_active", true)

    // 3. Prepare the notification list
    const notificationList = new Set<string>()
    if (DEFAULT_ADMIN) notificationList.add(DEFAULT_ADMIN)
    recipients?.forEach(r => notificationList.add(r.phone_number))

    if (notificationList.size === 0) {
      console.warn(`[${requestId}] 🛑 No recipients found. Process terminated.`)
      return new Response(JSON.stringify({ sent: false, reason: "No Recipients" }), { status: 200 })
    }

    // 4. Draft the itemized alert message
    const items = order.order_items.map((i: any) => `${i.menu_items?.name || 'Dish'} x${i.quantity}`).join(", ")
    const message = `Sidhu Punjabi Order! Table ${order.tables?.table_number || '??'}: ${items}. Subtotal ₹${order.total_amount}.`

    console.log(`[${requestId}] 📡 Ready to broadcast to ${notificationList.size} numbers.`)

    // 5. Mass Broadcast via Twilio API
    const authHeader = "Basic " + btoa(`${TWILIO_SID}:${TWILIO_AUTH_TOKEN}`)
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`

    const results = await Promise.all(
      Array.from(notificationList).map(async (to) => {
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Authorization": authHeader, "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ Body: message, From: TWILIO_FROM!, To: to })
          })
          const data = await res.json()
          console.log(`[${requestId}] 🛰️ Result for ${to}: ${res.ok ? 'Success' : 'Failed (' + data.message + ')'}`)
          return { to, success: res.ok, sid: data.sid, error: data.message }
        } catch (e) {
          console.error(`[${requestId}] ❌ Transmission Error for ${to}:`, e.message)
          return { to, success: false, error: e.message }
        }
      })
    )

    return new Response(JSON.stringify({ broadcast_count: results.length, signals: results }), { 
      status: 200, headers: { "Content-Type": "application/json" }
    })

  } catch (err) {
    console.error(`[${requestId}] 🆘 System Failure:`, err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
