# TableTap — Verification & Testing Report

**Version:** `0.2.0`  
**Executed On:** 2026-11-11  
**Workspace:** `C:\Projects\TableTap`  
**Framework:** Next.js `14.2.35` / React `18.3.1` / Vitest `2.1.9`

---

## 1. Automated Verification Summary

| Check | Command | Status | Scope / Result |
|---|---|---|---|
| **Unit Tests** | `npm test` (`vitest run`) | **PASSED** | `Test Files 4 passed (4)`, `Tests 22 passed (22)` in `791ms` |
| **Type Check** | `npm run type-check` (`tsc --noEmit`) | **PASSED** | Exit code `0` across all source and test files |
| **Linting** | `npm run lint` (`next lint`) | **PASSED** | `✔ No ESLint warnings or errors` |
| **Production Build** | `npm run build` (`next build`) | **PASSED** | Exit code `0`, `22/22` static/dynamic App Router routes built cleanly |
| **Dependency Integrity** | `npm ls --depth=0` | **PASSED** | Exit code `0`, zero peer dependency conflicts |

---

## 2. Unit Test Suite Breakdown (`tests/`)

### 2.1 `tests/pricing.test.ts` (7 passed)
- `roundCurrency` floating-point edge rounding to 2 decimals.
- Canonical calculation combining product variant price, add-on deltas, quantity, percentage tax, and service charge.
- Rejection of missing required option groups (`min_select`).
- Rejection when optional add-ons exceed `max_select`.
- Rejection of unavailable/sold-out products.
- Rejection of invalid/non-positive or out-of-range item quantities.
- Safe clamping of discounts so final totals never become negative.

### 2.2 `tests/order-state.test.ts` (6 passed)
- Forward lifecycle transition enforcement (`pending -> accepted -> preparing -> ready -> served -> completed`).
- Prevention of invalid backward/terminal transitions (`completed`, `cancelled`).
- Role-specific cancellation rules (`kitchen` cannot cancel accepted orders; `admin`/`owner` can cancel).
- Primary KDS next-action button label/status resolution.
- Urgency threshold classification (`normal` <12m, `warning` >=12m, `delayed` >=20m).
- Individual item-level station progression (`pending -> preparing -> ready -> served`).

### 2.3 `tests/security.test.ts` (5 passed)
- Cryptographic randomness and uniqueness of `generateSecureToken()` QR tokens.
- Deterministic SHA-256 hex digest behavior in `hashToken()`.
- Sliding-window per-key rate limiting enforcement (`checkRateLimit`).
- Timing-safe HMAC-SHA256 verification for Razorpay checkout signatures (`verifyRazorpayPaymentSignature`).
- Timing-safe HMAC-SHA256 verification for Razorpay webhooks (`verifyRazorpayWebhookSignature`).

### 2.4 `tests/validation.test.ts` (4 passed)
- Zod validation for login (`loginSchema`) and restaurant owner registration (`registerOwnerSchema`).
- Strict `orderSubmissionSchema` validation (UUID `idempotencyKey`, quantity bounds `1..50`).
- Negative price rejection on `productSchema`.
- Table seating capacity and restaurant tax configuration bounds.

---

## 3. Production Build Route Manifest (`next build`)

All 22 App Router endpoints and 87 kB Edge Middleware compiled cleanly with `▲ Next.js 14.2.35`:
- **Customer & Public:** `/`, `/demo`, `/t/[token]`, `/r/[slug]`, `/order/[publicToken]`, `/setup-required`
- **Auth & Onboarding:** `/login`, `/register`, `/forgot-password`, `/onboarding`
- **Kitchen:** `/kitchen`
- **Admin:** `/admin`, `/admin/orders`, `/admin/menu`, `/admin/tables`, `/admin/analytics`, `/admin/settings`
- **API Routes:** `/api/qr/resolve`, `/api/orders`, `/api/payments/razorpay/create-order`, `/api/payments/razorpay/verify`, `/api/payments/razorpay/webhook`

---

## 4. Database & Live Supabase Integration Verification Scope

- **Static SQL Verification Suite Provided:** `supabase/tests/rls_multi_tenant_verification.sql`
- **Status:** **Not yet executed against a live Supabase instance** (per architecture rules requiring manual execution of `supabase/SQL_SETUP_COMPLETE.sql` by the project owner in Supabase Dashboard).
- **10 Covered Assertions (wrapped in safe `BEGIN; ... ROLLBACK;`):**
  1. Concurrent creation of independent tenants (Restaurant A & Restaurant B).
  2. Role separation (`owner`, `kitchen`, `anon`).
  3. Anonymous QR resolution via `resolve_table_qr` & active table session creation.
  4. Canonical server-side total calculation (`2 * 499 + 5% tax = 1047.90`).
  5. Idempotency deduplication preventing duplicate orders.
  6. Direct anonymous `SELECT` blocked on private `orders` table (`0` rows).
  7. Cross-tenant isolation check (`owner-b` sees `0` orders belonging to Restaurant A).
  8. Kitchen authorization check via `update_order_status_secure`.
  9. Immutable `restaurant_id` protection trigger raising exception on tenant reassignment.
  10. Revoked QR invalidation verification.
