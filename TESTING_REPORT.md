# TableTap — Verification & Testing Report (Single-Restaurant Architecture)

**Executed On:** 12 November 2026  
**Workspace:** `C:\Projects\TableTap`  
**Framework:** Next.js `14.2.35` / React `18.3.1` / Vitest `2.1.9`

---

## 1. Automated Verification Results (Observed After Final Refactor Edits)

| Check | Command | Exit Code | Observed Result |
|---|---|---|---|
| **Production Build** | `npm run build` | `0` | `Next.js 14.2.35` compiled cleanly; `Generating static pages (21/21)`; `Middleware 87.2 kB` |
| **Type Check** | `npm run type-check` | `0` | `tsc --noEmit` completed with 0 errors across `src/`, `tests/`, and `.next/types/` |
| **Linting** | `npm run lint` | `0` | `✔ No ESLint warnings or errors` |
| **Unit Tests** | `npm test` (`vitest run`) | `0` | `Test Files 4 passed (4)`, `Tests 23 passed (23)` in `613ms` |
| **Leftover Reference Audit** | PowerShell `Select-String` across `src/`, `tests/` | `0` | Zero matches for `restaurant_id`, `restaurant_memberships`, `restaurant_tables`, `/onboarding`, `/register`, `/r/`, `owner`, or `Tenant` |

---

## 2. Unit Test Suite Breakdown (`tests/`)

### 2.1 `tests/order-state.test.ts` (6 passed)
- Validates single-restaurant lifecycle: `new -> accepted -> preparing -> ready -> completed`.
- Rejects backward and terminal transitions (`completed -> new`, `cancelled -> accepted`, `new -> completed`, `ready -> new`).
- Verifies cancellation authority (`kitchen` allowed on `new`/`accepted`, denied on `preparing`; `admin` allowed on `preparing`/`ready`).
- Validates primary kitchen action button sequence (`Accept Order -> Start Preparing -> Mark Ready -> Mark Completed`).
- Validates 12m warning and 20m delayed ticket urgency thresholds.
- Validates station item progression (`pending -> preparing -> ready`).

### 2.2 `tests/pricing.test.ts` (7 passed)
- `roundCurrency` floating-point accuracy.
- Canonical variant + add-on price calculation with tax & service charge.
- Rejection of missing required option groups, excess `max_select`, sold-out products, and out-of-range quantities.
- Non-negative discount clamping.

### 2.3 `tests/security.test.ts` (5 passed)
- Cryptographic `generateSecureToken()` uniqueness & `hashToken()` SHA-256 determinism.
- Per-key sliding-window rate limiting (`checkRateLimit`).
- Timing-safe Razorpay checkout & webhook HMAC-SHA256 verification.

### 2.4 `tests/validation.test.ts` (5 passed)
- Staff login Zod schema validation.
- Strict `orderSubmissionSchema` validation (UUID idempotency key & quantity `1..50`).
- `orderStatusUpdateSchema` lifecycle status acceptance (`new`, `completed`).
- Negative product price rejection.
- Table seating capacity and single-restaurant tax rate bounds.

---

## 3. Production Build Route Verification (`21/21` Routes Compiled)

- **Customer & Public:** `/`, `/menu`, `/demo`, `/t/[token]`, `/order/[publicToken]`, `/setup-required`
- **Staff Auth:** `/login`, `/forgot-password`
- **Kitchen:** `/kitchen`
- **Admin:** `/admin`, `/admin/orders`, `/admin/menu`, `/admin/tables`, `/admin/analytics`, `/admin/settings`
- **APIs:** `/api/qr/resolve`, `/api/orders`, `/api/payments/razorpay/create-order`, `/api/payments/razorpay/verify`, `/api/payments/razorpay/webhook`

---

## 4. Database Verification Suite Status

- **SQL Test Script:** [rls_single_restaurant_verification.sql](file:///C:/Projects/TableTap/supabase/tests/rls_single_restaurant_verification.sql)
- **Live Execution Status:** **Pending manual execution** in Supabase Dashboard SQL Editor after executing [SINGLE_RESTAURANT_MIGRATION.sql](file:///C:/Projects/TableTap/SINGLE_RESTAURANT_MIGRATION.sql).
- **Covered Assertions (wrapped in `BEGIN; ... ROLLBACK;`):**
  1. `anon` QR resolution (`resolve_table_qr`) and session opening.
  2. Server-side canonical pricing (`1047.90`) and initial `'new'` status via `create_customer_order`.
  3. Idempotency duplicate prevention.
  4. Direct anonymous reads blocked on `orders` and `table_qr_tokens`.
  5. Privilege escalation trigger (`prevent_profile_role_escalation`) blocks `kitchen` user updating `profiles.role = 'admin'`.
  6. Lifecycle advance (`new -> accepted -> preparing -> ready -> completed`) via `update_order_status_secure`.
  7. Revoked QR invalidation verification.
