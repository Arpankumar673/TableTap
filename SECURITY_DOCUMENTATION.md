# TableTap — Security Architecture Documentation (Single-Restaurant)

**Version:** `0.2.0`  
**Model:** Defense-in-depth Single-Restaurant Security (PostgreSQL RLS + Cryptographic Table QRs + Server-Side Pricing)

---

## 1. Role-Based Authorization & Privilege Escalation Guard

- **Minimal Roles (`user_role`):** Strictly `'admin'` and `'kitchen'` stored on `public.profiles.role`.
- **Server-Assigned Roles Only:** `handle_new_auth_user()` assigns `'admin'` only if present in trusted `auth.users.raw_app_meta_data` (controlled exclusively via Supabase Admin API / SQL), defaulting to least-privilege `'kitchen'`.
- **Role Escalation Trigger:** `prevent_profile_role_escalation()` raises a PostgreSQL exception if any non-admin authenticated user attempts to alter `profiles.role` or `profiles.active`.
- **Route Protection:** `src/middleware.ts` enforces Supabase session authentication on `/admin/*` and `/kitchen/*`; Server Components & Actions verify `requireStaffRole(["admin"])` or `requireStaffRole(["admin", "kitchen"])`.

---

## 2. Cryptographic Table QR & Session Security

- **Unguessable Tokens:** Each dining table (`public.tables`) receives a 24-byte `base64url` random token stored hashed (`SHA-256`) in `table_qr_tokens.token_hash`.
- **Zero URL Table Tampering:** Customers cannot spoof `table_id` via query parameters. `/t/[token]` resolves the SHA-256 hash into an opaque `session_token` (`table_sessions`) and redirects to `/menu?session=...`; `/api/orders` derives the physical table exclusively inside PostgreSQL from `session_token`.
- **Instant Revocation:** Revoking or regenerating a table QR immediately sets `active = false` and `revoked_at`, blocking future scans.
- **Anonymous Isolation:** `anon` has **zero** direct `SELECT`, `INSERT`, or `UPDATE` access to `tables`, `table_qr_tokens`, `table_sessions`, `orders`, `order_items`, `payments`, or `profiles`.

---

## 3. Canonical Pricing, Idempotency & Payment Verification

- **Server-Side Pricing:** Client-submitted prices/totals are ignored; `create_customer_order` reads authoritative prices, variants, add-on deltas, taxes, and service charges directly from PostgreSQL and records immutable snapshots.
- **Duplicate Order Prevention:** Unique constraint on `orders.idempotency_key` returns `{ duplicate: true }` if retried.
- **Razorpay Signatures:** Timing-safe `HMAC-SHA256` verification protects `/api/payments/razorpay/verify` and `/api/payments/razorpay/webhook`.
- **Secret Isolation:** `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` stay strictly server-side (`createAdminClient()` throws if executed in browser context).
