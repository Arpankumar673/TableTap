# TableTap — Single-Restaurant API, Server Actions & RPC Documentation

**Version:** `0.2.0` (Single-Restaurant Architecture)  
**Base URL:** `{NEXT_PUBLIC_APP_URL}` (default `http://localhost:3000`)

---

## 1. REST API Route Handlers (`src/app/api/`)

### 1.1 `POST /api/qr/resolve`
Hashes the scanned QR secret (`rawToken`) with SHA-256 and calls `public.resolve_table_qr(p_token_hash)`.
- **Rate Limit:** 40 requests / 60s per client IP.
- **Returns:** `{ valid, restaurant_name, is_accepting_orders, currency, tax_rate, service_charge_rate, table_id, table_number, table_label, session_id, session_token }`.

### 1.2 `POST /api/orders`
Validates cart submission via `orderSubmissionSchema` and delegates canonical calculation & snapshot persistence to `public.create_customer_order(...)`.
- **Rate Limit:** 20 requests / 60s per client IP.
- **Note:** Client never passes `table_id`, `unit_price`, or `total`; PostgreSQL derives the table strictly from `sessionToken`.

### 1.3 `POST /api/payments/razorpay/create-order`
Reads canonical order total via `get_order_by_public_token`, rejects already-paid orders, creates a Razorpay order, and writes a `pending` row to `public.payments`.
- **Rate Limit:** 15 requests / 60s per client IP.

### 1.4 `POST /api/payments/razorpay/verify` & `POST /api/payments/razorpay/webhook`
Verifies Razorpay HMAC-SHA256 signatures timing-safely and updates `payments.status` and `orders.payment_status`.

---

## 2. Server Actions (`src/app/actions/`)

All actions enforce `requireStaffRole(["admin"])` via [session.ts](file:///C:/Projects/TableTap/src/lib/auth/session.ts):
- **`src/app/actions/admin-menu.ts`**: `seedSampleCatalogAction()` — Seeds preparation stations, 14 categories, products, variants, customization groups, and 4 starter QR tables (`public.tables`).
- **`src/app/actions/admin-tables.ts`**: `createTableWithQrAction`, `regenerateTableQrAction`, `revokeTableQrAction`, `toggleTableActiveAction`, `updateTableDetailsAction`, `closeTableSessionAction`.
- **`src/app/actions/admin-settings.ts`**: `updateRestaurantSettingsAction`, `createStationAction`, `provisionKitchenLoginAction` (creates a `kitchen` Auth user with `app_metadata: { role: "kitchen" }`).

---

## 3. Supabase PostgreSQL RPCs

| RPC Function | Roles | Purpose |
|---|---|---|
| `resolve_table_qr(p_token_hash)` | `anon`, `authenticated` | Validates active QR hash & opens/reuses active `table_sessions` row |
| `create_customer_order(p_session_token, p_idempotency_key, p_items, p_customer_notes)` | `anon`, `authenticated` | Validates open session + idempotency, calculates canonical pricing, creates order in `'new'` status with snapshots |
| `get_order_by_public_token(p_public_token)` | `anon`, `authenticated` | Returns tracked order receipt, items, and status timeline |
| `get_session_orders(p_session_token)` | `anon`, `authenticated` | Lists session orders and `bill_requested` flag |
| `request_table_bill(p_session_token)` | `anon`, `authenticated` | Marks active session `bill_requested = true` |
| `resolve_session_context(p_session_token)` | `anon`, `authenticated` | Resolves active `table_id`, `table_number`, `table_label` banner metadata |
| `update_order_status_secure(p_order_id, p_new_status, p_reason)` | `authenticated` | Enforces `is_staff()`, lifecycle & cancel guards, timestamps, item sync & audit events |
| `update_order_item_status_secure(p_order_item_id, p_new_status)` | `authenticated` | Updates station item status and advances parent order automatically |
| `get_current_user_role()`, `is_admin()`, `is_staff()` | `authenticated` | Authorization helpers backing RLS policies |
