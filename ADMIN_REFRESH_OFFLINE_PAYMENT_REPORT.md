# TABLETAP — ADMIN DASHBOARD REFRESH & OFFLINE PAYMENTS REPORT

**Client & Brand:** Boston & Co. American Eatery  
**System:** Single-Restaurant Digital Operating System (TableTap)  
**Date:** November 15, 2026  
**Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Supabase PostgreSQL, Vercel  

---

## 1. Executive Summary

This initiative delivered two essential production features for Boston & Co. American Eatery:
1. **Admin Dashboard On-Demand Refresh**: An interactive, non-blocking refresh mechanism added directly to the Admin Dashboard header, enabling administrators to retrieve up-to-the-minute operational metrics, table occupancy, sales trends, and live orders directly from Supabase without full page reloads, without clearing filters, and without creating duplicate subscriptions.
2. **Transition to Offline Payments ("Pay at Restaurant")**: The customer ordering experience was transitioned exclusively to offline payment collection (settle via Cash, UPI, or Card at table or counter). All customer-facing online payment gateway dependencies (Razorpay script injection, modal popups, and pay-now buttons) were safely disabled while preserving server-side canonical billing, itemized taxes, and full kitchen notification workflows. In the admin dashboard, orders now clearly reflect the "Pay at Restaurant" method with "Pending" status until recorded as collected by an authorized administrator with an immutable timestamp.

---

## 2. Requirements & Implementation Breakdown

### Requirement 1: Admin Dashboard Refresh Option

- **Location & Visual Ergonomics**:
  - Placed prominently in the primary Admin Dashboard header adjacent to the "Table QR Manager" and "Menu Management" quick actions.
  - Features the Lucide React `RefreshCw` icon.
  - Responsive design: Shows `<RefreshCw /> Refresh` with full text on desktop/laptop displays ($ \ge 640\text{px} $), and seamlessly collapses to a compact, touch-friendly icon button on mobile viewports ($< 640\text{px}$).
- **Data Refresh Scope**:
  - Fetches the latest database records across 5 parallel Supabase queries:
    1. `orders`: Today's gross revenue and total orders count.
    2. `orders` by status: Pending (`new`), Preparing (`accepted`, `preparing`), and Completed (`ready`, `completed`) ticket counts.
    3. `tables` & `table_sessions`: Active tables occupancy count and active table bill request alerts.
    4. `order_items`: Top 5 popular dishes ranked by actual ordered quantity and canonical gross revenue.
    5. `orders` (7-day trend): Canonical daily revenue and order volume buckets for the Recharts SVG sales chart.
    6. `orders` (recent table submissions): First 8 recent dine-in orders with status badges and settlement indicators.
- **Spinning Animation & Concurrency Lock**:
  - Displays a smooth spinning indicator (`animate-spin text-burgundy-700`) during in-flight fetches.
  - Temporarily disables the button (`disabled={isRefreshing}`) and enforces an internal concurrency guard (`if (isRefreshing) return;`) to reject duplicate simultaneous clicks.
- **User Feedback & Status Alerts**:
  - Displays a clean, dismissible notification banner upon completion:
    - Success: `Dashboard refreshed with latest data.` (with green checkmark, automatically hides after 3.5 seconds).
    - Error: Inline error message if network or Supabase queries fail.
- **Last Updated Timestamp**:
  - Added a small, legible timestamp in the header subtitle: `Last updated: [HH:MM:SS AM/PM]`.
- **Integrity**:
  - Zero browser reloads (`window.location.reload` is NOT used).
  - Preserves client component state, date range selections, and table filters.
  - No duplicate Supabase real-time channels are created.

### Requirement 2: Temporarily Remove Online Payments

- **Offline-Only Customer Experience**:
  - Customer checkout now operates in **Offline / Pay at Restaurant** mode exclusively.
- **Cart & Checkout Dialog (`customer-menu-view.tsx`)**:
  - Displays complete, transparent bill breakdown:
    - Item Subtotal
    - Canonical Taxes (e.g. 5% GST)
    - Service Charge (if applicable)
    - Total Payable Amount
  - Added a dedicated offline payment guidance card:
    - Icon: `Banknote` in Boston burgundy.
    - Title: **Pay at the restaurant**
    - Subtitle: *No online payment required now. Settle your bill via Cash, UPI, or Card at your table or counter after dining.*
  - The **"Place Order"** button submits the order directly to the kitchen via `POST /api/orders` $\rightarrow$ `create_customer_order` RPC without launching any online payment gateway.
- **Order Confirmation & Tracking Page (`/order/[publicToken]`)**:
  - Removed the Razorpay Checkout JS SDK script injection (`https://checkout.razorpay.com/v1/checkout.js`).
  - Removed `handleRazorpayPayment()`, online payment gateway modal listeners, and the "Pay Now Online" CTA.
  - Added an elegant receipt status card:
    - Displays Payment Method: **Pay at Restaurant**.
    - If payment is not yet collected: Amber badge **Payment Pending**, message directing customer to settle at table or counter via Cash, UPI, or Card, along with the exact final payable total.
    - If payment has been collected: Emerald badge **Paid**, message confirming payment collection.
  - Customers can review their itemized receipt, variant options, and real-time kitchen preparation status without being blocked on payment.

### Requirement 3: Admin Order Management & Payment Collection

- **Orders Manager Table (`orders-manager.tsx`)**:
  - Added explicit **Payment Method** column displaying `Pay at Restaurant` with a banknote icon.
  - Updated **Payment Status** column: Displays **Pending** (amber badge) until collected, and **Paid** (emerald badge) once collected.
- **Order Inspection & Settlement Modal**:
  - Totals breakdown now explicitly shows:
    - Subtotal, Tax, Service Charge, Grand Total.
    - Payment Method: `Pay at Restaurant`.
    - Payment Status: `Paid` or `Pending`.
  - Authorized Admin Action:
    - When an order has pending payment and is not cancelled: Displays the **"Mark as Paid"** action button.
    - Accidental Duplicate Protection: Button disables immediately upon click (`busy={true}`) and is permanently hidden once the order is marked paid.
    - Audit Trail & Timestamp: Records an entry in the `payments` table with `provider: "pay_at_restaurant"`, `status: "successful"`, and `created_at: ISO timestamp`. Updates `orders.payment_status` to `'paid'` and records `updated_at`.
    - Once paid, the modal displays a verified badge: `Payment Collected (Pay at Restaurant)`.
- **Security & Authorization**:
  - Only authenticated admin users can mark orders as paid; anonymous customers cannot access the admin manager or update orders directly (enforced via Supabase RLS).

### Requirement 4: Kitchen Display System (KDS) Verification

- **Immediate Ticket Reception**:
  - Confirmed that online payment removal has **zero negative impact** on kitchen operations.
  - Orders submitted via the digital menu are placed into PostgreSQL with initial status `'new'` and payment status `'unpaid'`.
  - The kitchen display board subscribes to `orders` where status is in `('new', 'accepted', 'preparing', 'ready', 'completed')`, independent of payment status.
  - Kitchen ticket sound alerts, elapsed timers (5m/15m/20m delay alert), station routing, and ticket status advancement work seamlessly.

### Requirement 5: Backend & Database Compatibility

- **Database Preservation**:
  - Existing database schemas, historical payments, and audit tables remain 100% intact and unaltered.
  - No schema migrations or deletions of payment tables were performed.
- **Safe Guarding of Online Payment Endpoints**:
  - In `src/app/api/payments/razorpay/create-order/route.ts`, added a feature-flag check `ONLINE_PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_ONLINE_PAYMENTS === "true"`.
  - Since the flag is disabled, any external attempt to create a Razorpay checkout order returns a clean 400 response (`Online payments are temporarily disabled. Please settle your bill directly at the restaurant.`).
  - `src/lib/payments/razorpay.ts` (cryptographic HMAC verification, config helpers) remains fully intact to maintain unit test coverage and allow instant reintroduction when online payments are desired in the future.

---

## 3. Files Modified and Created

| File Path | Status | Description of Changes |
| :--- | :---: | :--- |
| `src/components/admin/admin-overview-view.tsx` | **NEW** | Interactive client component for the Admin Overview with Lucide `RefreshCw` button, spinning state, concurrency guard, last updated timestamp, responsive compact/desktop layout, and dismissible status notification. |
| `src/app/(admin)/admin/page.tsx` | **MODIFIED** | Refactored Server Component to pre-load initial dashboard data and pass it to `<AdminOverviewView initialData={...} />` for optimal SSR performance. |
| `src/components/customer/customer-menu-view.tsx` | **MODIFIED** | Added "Pay at the restaurant" guidance card inside the cart checkout modal; customer places orders without online payment requirements. |
| `src/app/(public)/order/[publicToken]/page.tsx` | **MODIFIED** | Removed Razorpay SDK dynamic loading and "Pay Now Online" button; replaced with offline "Pay at Restaurant" payment status card and pending/paid indicators. |
| `src/components/admin/orders-manager.tsx` | **MODIFIED** | Added "Payment Method: Pay at Restaurant" column and inspect modal display; implemented "Mark as Paid" with timestamp recording, duplicate submission locks, and status transitions. |
| `src/app/api/payments/razorpay/create-order/route.ts` | **MODIFIED** | Added safe offline-only guard rejecting new Razorpay checkout orders while preserving codebase structure for future re-enablement. |
| `tests/offline-payments.test.ts` | **NEW** | Vitest unit tests verifying offline billing breakdown, unpaid-to-paid state transitions, and duplicate payment protection. |

---

## 4. Verification & Testing Results

### 1. TypeScript Strict Type-Check
```bash
npm run type-check
```
- **Result**: `0 errors` (Clean compilation across all 23 Next.js routes and client components).

### 2. ESLint Static Code Analysis
```bash
npm run lint
```
- **Result**: `✔ No ESLint warnings or errors`.

### 3. Automated Unit Test Suite
```bash
npm test
```
- **Result**: `5/5 test suites passed (28/28 tests passed)`:
  - `tests/order-state.test.ts`: 6/6 passed (Kitchen urgency & state machine transitions)
  - `tests/pricing.test.ts`: 7/7 passed (Canonical server pricing & options calculation)
  - `tests/offline-payments.test.ts`: 4/4 passed (Offline payment flow, breakdown, and duplicate guard)
  - `tests/security.test.ts`: 5/5 passed (Cryptographic tokens, HMAC signatures & rate limiting)
  - `tests/validation.test.ts`: 6/6 passed (Zod schema validation)

### 4. Next.js Production Build
```bash
npm run build
```
- **Result**: All 23 static and dynamic routes compiled and optimized cleanly with zero build warnings.

---

## 5. Summary of Verification Checklist

- [x] **Admin dashboard refresh works**: Fetches fresh revenue, order counts, table occupancy, and sales trend.
- [x] **Spinning refresh icon**: Displays `animate-spin` on Lucide `RefreshCw` during fetch.
- [x] **Concurrency guard**: Disables button and prevents simultaneous duplicate refresh requests.
- [x] **Responsive refresh button**: Full label on desktop, compact icon button on mobile.
- [x] **Last updated timestamp**: Displays formatted time of the last successful refresh.
- [x] **Customer ordering without online payment**: Cart dialog shows transparent total with "Pay at Restaurant" notice.
- [x] **No Razorpay popup or checkout button in customer flow**: Razorpay SDK script and buttons completely removed from tracking and checkout views.
- [x] **Kitchen dashboard unaffected**: Kitchen continues receiving new orders immediately in real-time.
- [x] **Admin offline settlement**: Authorized admin can mark orders as paid with collection timestamp recorded.
- [x] **Duplicate payment prevention**: Button disables during processing and is hidden once marked paid.
- [x] **Backend compatibility**: Zero breaking database schema changes; existing payment records preserved.
