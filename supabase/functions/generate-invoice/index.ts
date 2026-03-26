// supabase/functions/generate-invoice/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1"

serve(async (req) => {
  try {
    const { order_id } = await req.json()

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Fetch order details
    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        id, 
        total_amount, 
        payment_method, 
        created_at,
        tables(table_number),
        order_items(
          quantity, 
          menu_items(name),
          variant_id (name)
        )
      `)
      .eq("id", order_id)
      .single()

    if (error || !order) throw new Error("Order not found")

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([400, 600])
    const { width, height } = page.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Header
    page.drawText('SIDHU PUNJABI RESTAURANT', { x: 50, y: height - 50, size: 20, font: boldFont })
    page.drawText(`Invoice #${order.id.slice(0, 8)}`, { x: 50, y: height - 80, size: 12, font })
    page.drawText(`Table Number: ${order.tables.table_number}`, { x: 50, y: height - 100, size: 12, font })
    page.drawText(`Date: ${new Date(order.created_at).toLocaleString()}`, { x: 50, y: height - 120, size: 12, font })

    // Items Header
    let y = height - 160
    page.drawText('Item', { x: 50, y, size: 12, font: boldFont })
    page.drawText('Qty', { x: 250, y, size: 12, font: boldFont })
    page.drawLine({ start: { x: 50, y: y - 5 }, end: { x: 350, y: y - 5 }, thickness: 1 })

    // Items
    y -= 25
    order.order_items.forEach((item: any) => {
      const name = `${item.menu_items.name}${item.variant_id ? ` (${item.variant_id.name})` : ''}`
      page.drawText(name, { x: 50, y, size: 10, font })
      page.drawText(`${item.quantity}`, { x: 250, y, size: 10, font })
      y -= 20
    })

    // Total
    y -= 20
    page.drawLine({ start: { x: 50, y: y + 10 }, end: { x: 350, y: y + 10 }, thickness: 1 })
    page.drawText('Total Amount', { x: 50, y, size: 14, font: boldFont })
    page.drawText(`Rs. ${order.total_amount}`, { x: 250, y, size: 14, font: boldFont })
    page.drawText(`Payment: ${order.payment_method.toUpperCase()}`, { x: 50, y: y - 25, size: 10, font })

    const pdfBytes = await pdfDoc.save()

    // Upload to Supabase Storage
    const fileName = `invoices/${order.id}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from("invoices")
      .getPublicUrl(fileName)

    // Update order with invoice URL
    await supabase
      .from("orders")
      .update({ invoice_url: publicUrl })
      .eq("id", order_id)

    return new Response(JSON.stringify({ url: publicUrl }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
})
