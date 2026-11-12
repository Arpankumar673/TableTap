/**
 * TableTap Order Lifecycle Types (Single-Restaurant Architecture)
 * Status transitions:
 * new -> accepted -> preparing -> ready -> completed
 * Any non-completed status can transition to cancelled with a valid reason.
 */

export type OrderStatus =
  | "new"         // Submitted by customer, awaiting kitchen acceptance
  | "accepted"    // Acknowledged by kitchen
  | "preparing"   // Food preparation actively in progress
  | "ready"       // Prepared and plated, ready for table delivery
  | "completed"   // Order fulfilled and finalized
  | "cancelled";  // Cancelled by kitchen or admin

export type OrderItemStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "cancelled";

export type PaymentStatus =
  | "unpaid"
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded";

export interface PreparationStation {
  id: string;
  name: string; // e.g., 'Main Kitchen', 'Pizza', 'Grill', 'Beverages', 'Desserts'
  description?: string | null;
  color_hex: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface OrderItemOptionSnapshot {
  id: string;
  order_item_id: string;
  option_group_name: string;
  option_value_name: string;
  price_delta: number;
}

export interface OrderItemSnapshot {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string | null;
  station_id?: string | null;
  station_name?: string | null;
  status: OrderItemStatus;
  options: OrderItemOptionSnapshot[];
  created_at: string;
}

export interface OrderStatusEvent {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  actor_user_id?: string | null;
  reason?: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  table_session_id: string;
  table_number: string;
  order_number: string; // e.g. "TT-1042"
  status: OrderStatus;
  subtotal: number;
  discount: number;
  tax: number;
  service_charge: number;
  total: number;
  payment_status: PaymentStatus;
  idempotency_key: string;
  public_token: string; // Unguessable token for customer tracking link
  items: OrderItemSnapshot[];
  created_at: string;
  updated_at: string;
}
