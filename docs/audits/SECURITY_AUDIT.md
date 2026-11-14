# TableTap — Security Architecture & Vulnerability Audit

**Project:** TableTap  
**Brand:** Boston & Co. American Eatery  
**Date of Audit:** November 14, 2026  
**Auditor:** Principal Software Architect & Code Quality Auditor  
**Scope:** Authentication, authorization, Row Level Security (RLS), environment variables, cryptographic token protection, rate limiting, and supply-chain security.

---

## 1. Executive Summary

A security audit of TableTap was conducted to verify that single-restaurant isolation, role-based access control (RBAC), database permissions, and secret handling comply with high-security production standards.

### Overall Security Status: **SECURE / HARDENED**
- **Row Level Security (RLS):** Enabled and strictly enforced on all 12 PostgreSQL tables.
- **Service Role Key Isolation:** Strictly confined to server-only runtime contexts. Zero exposure in client bundles or public environment variables.
- **Password Security:** All passwords managed exclusively by Supabase Auth with bcrypt hashing. Plaintext passwords are never stored in PostgreSQL.
- **Re-Authentication on Credential Changes:** Admin password updates require verification of the existing password before updating.
- **Cryptographic Token Protection:** Table QR codes store exclusively SHA-256 hashes (`token_hash`) in the database; raw tokens are never persisted.
- **Timing-Attack Resistance:** Payment webhook HMAC signatures are compared using constant-time byte comparisons (`timingSafeEqualHex`).
- **Abuse Mitigation:** Rate limiting applied to QR code resolution, order submissions, and payment order generation.

---

## 2. Authentication & Authorization Architecture

### 2.1 Single-Restaurant Staff RBAC
TableTap defines two operational roles in `src/types/roles.ts`:
- **`admin`:** Full administrative authority over restaurant profile, menu categories, products, prices, tables, QR generation, staff accounts, and revenue analytics.
- **`kitchen`:** Restricted access limited strictly to the Kitchen Display System (`/kitchen`) to view incoming order tickets, filter by station, and advance order preparation status.

### 2.2 Server-Side Session Enforcement (`requireStaffRole`)
Implemented in [`src/lib/auth/session.ts`](file:///c:/Users/arpan/OneDrive/Desktop/TableTap/src/lib/auth/session.ts):
```typescript
export async function requireStaffRole(allowedRoles: UserRole[] = ["admin"]): Promise<StaffContext>
```
- Invoked at the layout and page level across all `/admin/*` and `/kitchen` routes.
- Validates active Supabase session cookies via `@supabase/ssr`.
- Queries the PostgreSQL `profiles` table to verify user role and active status (`active: true`).
- If unauthenticated, immediately redirects to `/login`.
- If role is unauthorized, redirects to the permitted operational view (e.g., kitchen user attempting to visit `/admin` is redirected to `/kitchen`).

### 2.3 Edge Middleware Protection (`src/middleware.ts`)
- Edge middleware runs prior to route invocation for all incoming requests.
- Intercepts requests to `/admin` and `/kitchen`.
- Verifies session tokens before protected page components execute.
- Redirects unauthenticated access directly to `/login?redirectTo=<path>`.

---

## 3. Password Management & Recovery Security

### 3.1 Admin Password Change Flow
Located in [`src/app/actions/admin-settings.ts`](file:///c:/Users/arpan/OneDrive/Desktop/TableTap/src/app/actions/admin-settings.ts) (`changeAdminPasswordAction`):
1. **Role Verification:** Validates caller has active `admin` session via `requireStaffRole(["admin"])`.
2. **Current Password Re-Authentication:** Re-authenticates the administrator's email and current password against Supabase Auth (`auth.signInWithPassword`). If verification fails, the operation is rejected immediately.
3. **Password Complexity & Match:** Enforces minimum 8 characters, confirmation equality, and ensures new password differs from current password.
4. **Secure Update:** Updates the password directly in Supabase Auth via `updateUserById` or `auth.updateUser`.
5. **Zero Plaintext Storage:** Plaintext passwords never touch application database tables or logs.

### 3.2 Forgot Password Recovery Flow
1. **Dispatch:** Administrator enters email at [`/forgot-password`](file:///c:/Users/arpan/OneDrive/Desktop/TableTap/src/app/(auth)/forgot-password/page.tsx). Calls `supabase.auth.resetPasswordForEmail` with redirect URL pointing to `${origin}/auth/callback?next=/reset-password`.
2. **PKCE Code Exchange:** The incoming link hits [`src/app/auth/callback/route.ts`](file:///c:/Users/arpan/OneDrive/Desktop/TableTap/src/app/auth/callback/route.ts). The server exchanges the authorization code for a session via `exchangeCodeForSession(code)` and forwards to `/reset-password`.
3. **Password Reset:** [`/reset-password`](file:///c:/Users/arpan/OneDrive/Desktop/TableTap/src/app/(auth)/reset-password/page.tsx) accepts the new password and confirms it via `supabase.auth.updateUser({ password })`.

---

## 4. Secret Management & Environment Isolation

### 4.1 Service Role Key Safety
- **Rule:** `SUPABASE_SERVICE_ROLE_KEY` bypasses PostgreSQL Row Level Security (RLS) and must never be exposed to browser code.
- **Verification:**
  - Audited [`src/lib/supabase/env.ts`](file:///c:/Users/arpan/OneDrive/Desktop/TableTap/src/lib/supabase/env.ts): `getSupabaseServerEnv()` explicitly asserts `typeof window === "undefined"` and throws a security violation error if invoked from browser code.
  - No hardcoded service role keys exist in repository code or client-side bundles.
  - Elevated admin client creation (`createAdminClient()` in `src/lib/supabase/admin.ts`) is strictly server-only.

### 4.2 Local vs. Production Environment Keys
- `.env.local` contains active local credentials and is strictly excluded by `.gitignore`.
- `.env.example` provides public documentation of variable names with zero sensitive keys.

---

## 5. PostgreSQL Row Level Security (RLS) Matrix

All tables in the Boston & Co. database have Row Level Security enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`):

| Table | Anonymous Customer Permissions | Authenticated Staff Permissions |
| :--- | :--- | :--- |
| `restaurant_settings` | `SELECT` public profile only | `ALL` restricted to `admin` |
| `categories` | `SELECT` active categories only | `ALL` restricted to `admin` |
| `products` | `SELECT` active products only | `ALL` restricted to `admin` |
| `product_variants` | `SELECT` active variants only | `ALL` restricted to `admin` |
| `option_groups` | `SELECT` active groups only | `ALL` restricted to `admin` |
| `option_values` | `SELECT` active options only | `ALL` restricted to `admin` |
| `tables` | No direct access | `ALL` restricted to `admin` |
| `table_qr_tokens` | Handled via stored procedure `resolve_table_qr` | `ALL` restricted to `admin` |
| `table_sessions` | `SELECT` active session for customer's table | `ALL` restricted to `admin` |
| `orders` | `SELECT` order by public token; `INSERT` via API | `SELECT, UPDATE` for `admin` and `kitchen` |
| `order_items` | `SELECT` order items for visible order | `SELECT, UPDATE` for `admin` and `kitchen` |
| `profiles` | No direct access | `SELECT, UPDATE` for own profile |

---

## 6. Cryptographic Token Protection & Anti-Abuse

### 6.1 QR Code Token Hashing
- Table QR codes contain an unguessable 64-character hexadecimal token generated using Node.js `crypto.randomBytes(32)`.
- When a table QR is scanned, the raw token is transmitted over TLS to `/t/[token]`.
- The application computes `SHA-256(rawToken)` and executes the database function `resolve_table_qr(p_token_hash)`.
- **Security Benefit:** Even in the event of an unauthorized database snapshot read, an attacker cannot generate valid QR codes because the raw pre-images are not stored.

### 6.2 Rate Limiting
Implemented in [`src/lib/security/tokens.ts`](file:///c:/Users/arpan/OneDrive/Desktop/TableTap/src/lib/security/tokens.ts):
- `checkRateLimit(key, maxRequests, windowMs)` uses an in-memory sliding window cache.
- Applied to:
  - QR token resolution: Max 40 requests / 60 seconds per IP.
  - Customer order submissions: Max 12 submissions / 60 seconds per IP.
  - Razorpay order creation: Max 20 requests / 60 seconds per IP.

### 6.3 Timing-Safe Payment Verification
- Razorpay payment signatures (`razorpay_signature`) are computed as `HMAC-SHA256(order_id + "|" + payment_id, secret)`.
- Verified using `timingSafeEqualHex` in [`src/lib/payments/razorpay.ts`](file:///c:/Users/arpan/OneDrive/Desktop/TableTap/src/lib/payments/razorpay.ts), preventing byte-by-byte timing attacks.
