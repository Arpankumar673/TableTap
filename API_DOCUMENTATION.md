# TableTap — API, Server Actions & RPC Documentation

**Version:** `0.2.0`  
**Base URL:** `{NEXT_PUBLIC_APP_URL}` (default `http://localhost:3000`)  
**Backend:** Next.js 14 App Router Route Handlers & Server Actions + Supabase PostgreSQL RPCs

---

## 1. REST API Route Handlers

### 1.1 Resolve Table QR Token
**`POST /api/qr/resolve`**

Resolves a scanned QR raw secret into an active dining table session by hashing with SHA-256 server-side and calling `public.resolve_table_qr(p_token_hash)`.

- **Rate Limit:** 40 requests / 60s per client IP (`qr_resolve:{ip}`)
- **Request Body:**
```json
{
  "rawToken": "string (8..256 chars)"
}
```
- **Responses:**
  - `200 OK`: `{ "valid": true, "restaurant_id": "uuid", "restaurant_name": "string", "restaurant_slug": "string", "is_accepting_orders": true, "currency": "INR", "tax_rate": 5.0, "service_charge_rate": 0.0, "table_id": "uuid", "table_number": "T-01", "table_label": "Window", "session_id": "uuid", "session_token": "hex" }`
  - `400 Bad Request`: Malformed payload or RPC error
  - `404 Not Found`: Invalid, revoked, or inactive table/restaurant QR token
  - `429 Too Many Requests`: Rate limit exceeded
  - `503 Service Unavailable`: Supabase environment variables unconfigured

---

### 1.2 Submit Customer Order
**`POST /api/orders`**

Validates payload via `orderSubmissionSchema`, strips any client pricing assumptions, and delegates transactional creation and server-side canonical price computation to `public.create_customer_order(...)`.

- **Rate Limit:** 20 requests / 60s per client IP (`order_submit:{ip}`)
- **Request Body:**
```json
{
  "sessionToken": "string (min 10 chars)",
  "idempotencyKey": "uuid-v4",
  "customerNotes": "string (optional)",
  "items": [
    {
      "productId": "uuid",
      "variantId": "uuid | null",
      "quantity": 1,
      "optionValueIds": ["uuid"],
      "notes": "string (optional)"
    }
  ]
}
```
- **Responses:**
  - `201 Created`: Order snapshot JSON returned by `create_customer_order` (including `order_id`, `order_number`, `public_token`, `total`, `duplicate` boolean)
  - `400 Bad Request`: Validation error or business rule failure (sold-out product, missing required options, closed session)
  - `429 Too Many Requests`: Rate limit exceeded
  - `503 Service Unavailable`: Supabase backend unconfigured

---

### 1.3 Initiate Razorpay Checkout Order
**`POST /api/payments/razorpay/create-order`**

Looks up canonical `order.total` using `get_order_by_public_token`, rejects already-paid orders, creates a Razorpay order via Razorpay REST API, and records a `pending` row in `public.payments` when `SUPABASE_SERVICE_ROLE_KEY` is configured.

- **Rate Limit:** 15 requests / 60s per client IP (`rzp_create:{ip}`)
- **Request Body:**
```json
{
  "publicToken": "string (min 10 chars)"
}
```
- **Responses:**
  - `200 OK`: `{ "razorpayOrderId": "order_...", "amount": 104790, "currency": "INR", "keyId": "rzp_test_..." }`
  - `404 Not Found`: Order not found for `publicToken`
  - `409 Conflict`: Order `payment_status === "paid"`
  - `503 Service Unavailable`: Database or Razorpay server credentials unconfigured

---

### 1.4 Verify Razorpay Client Signature
**`POST /api/payments/razorpay/verify`**

Performs timing-safe HMAC-SHA256 verification of `${razorpayOrderId}|${razorpayPaymentId}` against `RAZORPAY_KEY_SECRET`, then marks `payments.status = 'successful'` and `orders.payment_status = 'paid'`.

- **Request Body:**
```json
{
  "publicToken": "string",
  "razorpayOrderId": "string",
  "razorpayPaymentId": "string",
  "razorpaySignature": "hex-hmac-sha256"
}
```
- **Responses:**
  - `200 OK`: `{ "verified": true, "status": "paid" }`
  - `400 Bad Request`: Signature verification failed or malformed payload
  - `404 Not Found`: Order missing
  - `503 Service Unavailable`: Razorpay or `SUPABASE_SERVICE_ROLE_KEY` unconfigured

---

### 1.5 Razorpay Asynchronous Webhook
**`POST /api/payments/razorpay/webhook`**

Validates the raw request body against header `x-razorpay-signature` using `RAZORPAY_WEBHOOK_SECRET` and processes `payment.captured` and `payment.failed` events idempotently using `provider_order_id` and `notes.tabletap_order_id`.

---

## 2. Next.js Server Actions (`src/app/actions/`)

All Server Actions call `requireRestaurantRole(...)` in `src/lib/auth/session.ts` to verify Supabase session and tenant membership before mutating data.

### `src/app/actions/admin-menu.ts`
- `seedSampleCatalogAction()`: Seeds 14 menu categories, sample products, variants, and 4 starter QR tables (`T-01`..`T-04`) for an empty restaurant (requires `owner` or `admin`).

### `src/app/actions/admin-tables.ts`
- `createTableWithQrAction(input)`: Creates a dining table and cryptographic base64url QR token + SHA-256 hash (`owner` or `admin`).
- `regenerateTableQrAction(tableId)`: Revokes prior active QR tokens for a table and issues a fresh cryptographic secret + hash.
- `revokeTableQrAction(tableId)`: Marks active QR tokens revoked immediately (`active = false`, `revoked_at` set).
- `toggleTableActiveAction(tableId, active)`: Enables/disables table ordering.
- `updateTableDetailsAction(...)`: Updates table label, seating capacity, and active status.
- `closeTableSessionAction(sessionId)`: Closes an open dining session and clears active table bill requests.

### `src/app/actions/admin-settings.ts`
- `updateRestaurantSettingsAction(input)`: Updates restaurant profile, currency, tax rate, service charge, opening hours, and order acceptance flag (`owner` or `admin`).
- `createStationAction(input)`: Adds a preparation station (`name`, `color_hex`, `sort_order`).
- `provisionKitchenLoginAction(input)`: Creates a dedicated Kitchen Display System (`kitchen`) Supabase Auth user via `createAdminClient()` and links `restaurant_memberships` (`owner` only).

---

## 3. Supabase PostgreSQL RPC Functions

| RPC Function | Access Role | Purpose |
|---|---|---|
| `onboard_restaurant(p_name, p_slug, p_currency, p_timezone, p_phone, p_address)` | `authenticated` | Atomically creates restaurant, owner membership, and 5 default preparation stations |
| `resolve_table_qr(p_token_hash)` | `anon`, `authenticated` | Validates active QR hash and opens/reuses open `table_sessions` row |
| `create_customer_order(p_session_token, p_idempotency_key, p_items, p_customer_notes)` | `anon`, `authenticated` | Validates session, checks idempotency, calculates canonical server prices/taxes, writes immutable snapshots & initial status event |
| `get_order_by_public_token(p_public_token)` | `anon`, `authenticated` | Safely fetches single order receipt, item snapshots, options, and status timeline without exposing private tenant rows |
| `get_session_orders(p_session_token)` | `anon`, `authenticated` | Returns all orders and bill request status bound to a guest `session_token` |
| `request_table_bill(p_session_token)` | `anon`, `authenticated` | Flags `table_sessions.bill_requested = true` for counter/admin alert |
| `resolve_session_context(p_session_token)` | `anon`, `authenticated` | Resolves active table number/label banner metadata for customer menu header |
| `update_order_status_secure(p_order_id, p_new_status, p_reason)` | `authenticated` | Enforces membership role check, state transition rules, and inserts audit row in `order_status_events` |
| `update_order_item_status_secure(p_order_item_id, p_new_status)` | `authenticated` | Advances individual station item preparation status for members (`kitchen`, `admin`, `owner`) |
| `get_user_restaurant_role(target_restaurant_id)` | `authenticated` | Returns active `user_role` for `auth.uid()` |
| `is_restaurant_member(target_restaurant_id)` | `authenticated` | Boolean helper used across RLS policies |
