# TableTap — Security Architecture & Controls Documentation

**Version:** `0.2.0`  
**Security Model:** Defense-in-depth Multi-Tenant SaaS (PostgreSQL RLS + Cryptographic Guest Sessions + Server-Side Canonical Pricing)

---

## 1. Multi-Tenant Data Isolation

1. **Tenant Scoping on Every Business Entity:**  
   All restaurant operational entities carry a non-nullable `restaurant_id UUID REFERENCES public.restaurants(id)` foreign key (`categories`, `preparation_stations`, `products`, `product_variants`, `option_groups`, `option_values`, `product_option_groups`, `restaurant_tables`, `table_qr_tokens`, `table_sessions`, `orders`, `order_items`, `order_item_options`, `order_status_events`, `payments`).
2. **Database-Level Row Level Security (RLS):**  
   PostgreSQL RLS is enabled across all 18 public tables in `supabase/SQL_SETUP_COMPLETE.sql`. Cross-tenant queries return `0` rows automatically at the database engine layer even if an application query omits a manual `WHERE restaurant_id = ...` filter.
3. **Immutable `restaurant_id` Trigger:**  
   `public.prevent_restaurant_id_change()` is attached via `BEFORE UPDATE` triggers across 9 core tenant tables (`categories`, `preparation_stations`, `products`, `product_variants`, `option_groups`, `restaurant_tables`, `table_sessions`, `orders`, `order_items`), throwing a PostgreSQL exception on any attempt to reassign a row between tenants.
4. **Role-Based Access Control (RBAC):**  
   Minimal 3-role membership hierarchy stored in `public.restaurant_memberships`:
   - `owner`: Full tenant governance, menu/table/QR/analytics management, billing view, and kitchen tablet user provisioning.
   - `admin`: Restaurant profile, menu/options, tables/QRs, order audits, and payments.
   - `kitchen`: Kitchen Display System access (`orders` and `order_items` station status updates). Cannot create/delete products, view billing/payments, or manage memberships.

---

## 2. Cryptographic QR Codes & Guest Session Isolation

- **Zero Login Friction Without Direct Table Exposure:**  
  Anonymous guests (`anon` role) have **zero** direct `SELECT` / `INSERT` / `UPDATE` privileges on `table_qr_tokens`, `table_sessions`, `orders`, `order_items`, or `payments`.
- **SHA-256 Token Hashing:**  
  Table QRs encode `/t/<rawToken>`, generated via `crypto.randomBytes(24).toString("base64url")`. Public resolution (`POST /api/qr/resolve`) computes `SHA-256(rawToken)` via `hashToken()` and calls `resolve_table_qr(p_token_hash)`. Only `table_qr_tokens` owners/admins can retrieve `qr_token_secret` inside the authenticated admin dashboard for printing/ZIP export.
- **Instant Revocation & Table Deactivation:**  
  Regenerating or revoking a QR immediately sets `active = false` and `revoked_at = clock_timestamp()`, causing previously printed stickers to return `404` on `/api/qr/resolve` and `/t/[token]`.
- **Scoped Tracking Tokens:**  
  Guest order tracking uses unguessable `public_token` credentials evaluated inside `SECURITY DEFINER` RPC `get_order_by_public_token(p_public_token)` rather than exposing sequential IDs or broad `SELECT` access on `orders`.

---

## 3. Server-Side Order Pricing & Idempotency

- **Zero Client Price Trust:**  
  `orderSubmissionSchema` (`src/lib/validation/order.ts`) accepts only `sessionToken`, `idempotencyKey`, `customerNotes`, `productId`, `variantId`, `quantity` (`1..50`), and `optionValueIds`. Unit prices, add-on deltas, taxes, and service charges are queried directly from canonical rows inside `create_customer_order` (PostgreSQL) and `calculateOrderPricing` (`src/lib/pricing/calculator.ts`).
- **Immutable Financial Snapshots:**  
  Placed orders persist `table_number_snapshot`, `product_name_snapshot`, `variant_name_snapshot`, `station_name_snapshot`, `unit_price_snapshot`, `total_price_snapshot`, and `price_delta_snapshot` so later menu edits never corrupt historical receipts or analytics.
- **Idempotency Deduplication:**  
  `orders.idempotency_key` has a unique constraint; retrying the same client submission key returns the existing order (`duplicate: true`) rather than inserting duplicate kitchen tickets.

---

## 4. API & Payment Security Controls

- **Rate Limiting:**  
  Sliding-window per-IP limiter (`checkRateLimit` in `src/lib/security/tokens.ts`) protects `/api/qr/resolve` (`40/min`), `/api/orders` (`20/min`), and `/api/payments/razorpay/create-order` (`15/min`).
- **Payment Signature Verification:**  
  - Checkout verification (`/api/payments/razorpay/verify`) validates `HMAC-SHA256(razorpayOrderId|razorpayPaymentId, RAZORPAY_KEY_SECRET)` using `crypto.timingSafeEqual` (`timingSafeEqualHex`).
  - Webhook verification (`/api/payments/razorpay/webhook`) validates `HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)` against `x-razorpay-signature` before updating `payments` and `orders.payment_status`.
- **Secret Boundary:**  
  `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` are never prefixed with `NEXT_PUBLIC_`. `src/lib/supabase/admin.ts` explicitly throws if imported inside a browser runtime (`typeof window !== "undefined"`).
- **Supabase Storage Isolation:**  
  Bucket `restaurant-assets` restricts writes (`INSERT`, `UPDATE`, `DELETE`) to authenticated `owner`/`admin` members whose folder prefix (`(storage.foldername(name))[1]`) matches their authorized `restaurant_id`.

---

## 5. Framework Security Audit Remediation

- **Vulnerability Review:** Phase 1 originally pinned `next@14.2.24`. Per Next.js advisory `security-update-2025-12-11` affecting React/Next.js 14 Server Actions & App Router runtimes, `next` and `eslint-config-next` were upgraded to patched **`14.2.35`** while retaining `react@18.3.1` stability.
- **Verification:** Verified post-upgrade with `npm run type-check`, `npm run lint`, `npm test`, and `npm run build` (`▲ Next.js 14.2.35`).
