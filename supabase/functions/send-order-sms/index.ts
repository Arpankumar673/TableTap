// supabase/functions/send-order-sms/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const FAST2SMS_API_KEY = Deno.env.get("FAST2SMS_API_KEY")
const DEFAULT_ADMIN = Deno.env.get("ADMIN_PHONE_NUMBER") // e.g., +919999999999

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8)
  console.log(`[${requestId}] 🚀 Fast2SMS Broadcast Channel Established`)

  try {
    const payload = await req.json()
    console.log(`[${requestId}] 📦 Entry Received:`, JSON.stringify(payload))
    
    const record = payload.record || payload.data || payload
    if (!record?.id) throw new Error("Missing order record ID")

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

    if (orderErr) throw new Error(`Order Lookup Fail: ${orderErr.message}`)

    // 2. Fetch Active Dynamic Recipients
    const { data: dbRecipients, error: recipErr } = await supabase
      .from("sms_recipients")
      .select("phone_number")
      .eq("is_active", true)

    // 3. Assemble and Format Numbers (Strip +91 or + for Fast2SMS)
    const rawNumbers = new Set<string>()
    if (DEFAULT_ADMIN) rawNumbers.add(DEFAULT_ADMIN)
    dbRecipients?.forEach(r => rawNumbers.add(r.phone_number))

    const formattedNumbers = Array.from(rawNumbers)
      .map(num => num.replace(/^\+91/, "").replace(/^\+/, "").trim())
      .filter(num => num.length === 10) // Only 10-digit Indian numbers
      .join(",")

    if (!formattedNumbers) {
      console.warn(`[${requestId}] 🛑 Zero Authorized Terminals detected. SMS Cancelled.`)
      return new Response(JSON.stringify({ success: false, reason: "No active 10-digit numbers found" }), { status: 200 })
    }

    // 4. Draft Itemized Signal
    const dishSummary = order.order_items?.map((i: any) => 
       `${i.menu_items?.name || 'Dish'} x${i.quantity}`
    ).join(", ") || "No items detected"
    
    const message = `Sidhu Punjabi Alert! Order Received from Table ${order.tables?.table_number || '??'}. Items: ${dishSummary}. Total: ₹${order.total_amount}.`

    // 5. Final Gateway Activation (Fast2SMS)
    if (!FAST2SMS_API_KEY) {
       console.error(`[${requestId}] 🛑 Gateway Interrupted: Missing FAST2SMS_API_KEY!`)
       return new Response(JSON.stringify({ error: "API Key Missing" }), { status: 200 })
    }

    console.log(`[${requestId}] 📡 Transmitting to Fast2SMS: [${formattedNumbers}]`)

    const endpoint = "https://www.fast2sms.com/dev/bulkV2"
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { 
         "authorization": FAST2SMS_API_KEY, 
         "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        route: "q",
        message: message,
        language: "english",
        flash: 0,
        numbers: formattedNumbers
      })
    })

    const result = await response.json()
    console.log(`[${requestId}] 🛰️ Fast2SMS Response (${response.status}):`, JSON.stringify(result))

    return new Response(JSON.stringify({ 
      success: response.ok && result.return === true, 
      status: response.status,
      result: result 
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    })

  } catch (err) {
    console.error(`[${requestId}] 🆘 Fatal Transmission Failure:`, err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
