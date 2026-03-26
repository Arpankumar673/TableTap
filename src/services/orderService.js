import { supabase } from './supabaseClient';

export const createOrder = async ({ 
  table_id, 
  subtotal, 
  tax_amount, 
  discount_amount, 
  total_amount, 
  payment_method, 
  payment_status, 
  items 
}) => {
  try {
    // 1. Insert Order record with full financial breakdown
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        table_id,
        subtotal,
        tax_amount,
        discount_amount,
        total_amount,
        payment_method,
        payment_status: payment_status || 'pending',
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Insert order items
    const orderItems = items.map((item) => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      variant_id: item.variant_id || null,
      quantity: item.quantity,
      instructions: item.instructions || '',
      price_at_time: item.price_at_time, // Snapshotted price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    return order;
  } catch (err) {
    console.error('Order creation failed:', err);
    throw err;
  }
};
