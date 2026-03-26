Build a production-grade QR-based restaurant ordering system for a single restaurant ("Sidhu Punjabi Restaurant") using React (frontend) and Supabase (backend).

Follow this system design strictly.

---

🏗️ ARCHITECTURE OVERVIEW

Use a client-server architecture:

Frontend:

* React (Vite) + Tailwind CSS
* Handles UI, state, and user interactions

Backend:

* Supabase (PostgreSQL database + Realtime + Storage)
* Supabase Edge Functions for secure APIs (payments, SMS)

External Services:

* Razorpay (payment gateway)
* Fast2SMS or Twilio (SMS notifications)

---

📁 FRONTEND ARCHITECTURE (REACT)

Use modular, scalable folder structure:

src/
pages/
Menu.jsx
Cart.jsx
Checkout.jsx
Success.jsx
AdminDashboard.jsx
Orders.jsx
MenuManager.jsx

components/
DishCard.jsx
CategoryFilter.jsx
VariantSelector.jsx
CartItem.jsx
WaiterButton.jsx

context/
CartContext.jsx

services/
supabaseClient.js
orderService.js
paymentService.js

hooks/
useCart.js
useOrders.js

---

📱 FRONTEND FLOW

1. QR Scan → Open:
   /menu/:tableId

2. Menu Page:

   * Fetch categories and menu_items with variants
   * Display category tabs
   * Filter items by category
   * Add to cart with variant selection

3. Cart Page:

   * Show selected items
   * Quantity control
   * Special instructions input
   * Calculate total

4. Checkout Page:

   * Display summary
   * Options:

     * Pay Online (Razorpay)
     * Pay Offline (Cash)

5. Success Page:

   * Show confirmation
   * Download invoice

6. Waiter Button:

   * Trigger API to insert into waiter_calls

---

🗄️ BACKEND DESIGN (SUPABASE)

Use PostgreSQL with normalized schema:

Tables:

* tables
* categories
* menu_items
* menu_item_variants
* orders
* order_items
* feedback
* waiter_calls

---

⚡ DATABASE RELATIONSHIPS

* One table → many orders
* One order → many order_items
* One menu_item → many variants
* One category → many menu_items

---

📊 INDEXING (CRITICAL FOR SCALE)

Create indexes:

* orders(table_id, created_at DESC)
* menu_items(category_id)
* order_items(order_id)

---

🔐 SECURITY IMPLEMENTATION

1. Enable Row Level Security (RLS) on all tables

2. Policies:

* Public can:

  * Read menu_items, categories
  * Insert orders, order_items, feedback, waiter_calls
* Admin only:

  * Modify menu_items, categories

3. Use environment variables:

* Razorpay secret
* SMS API key

4. Validate all inputs:

* No empty cart
* Quantity > 0
* Valid table_id

---

💳 PAYMENT SYSTEM DESIGN

Use Razorpay with secure backend verification:

Step 1:
Frontend calls Edge Function → create Razorpay order

Step 2:
Frontend opens Razorpay checkout

Step 3:
On success → send payment details to Edge Function

Step 4:
Verify signature using HMAC SHA256

Step 5:
Update order:

* payment_status = "paid"
* payment_method = "online"

---

📩 SMS SYSTEM DESIGN

Trigger SMS from Edge Function:

* On new order insert
* Fetch table number + items
* Send SMS to admin/kitchen number

---

⚡ REAL-TIME SYSTEM

Use Supabase Realtime:

* Subscribe to "orders" table (INSERT)
* Subscribe to "waiter_calls"

Admin dashboard auto-updates on:

* New order
* Waiter call

---

📄 INVOICE SYSTEM

Generate invoice after order:

Option A (Frontend):

* Use jsPDF

Option B (Preferred):

* Generate via Edge Function
* Store in Supabase Storage
* Save URL in orders.invoice_url

---

🔄 ORDER PROCESSING FLOW

1. User adds items to cart

2. Clicks place order

3. Insert into:

   * orders table
   * order_items table

4. Trigger:

   * SMS
   * Realtime update

5. Payment:

   * Online → verify → mark paid
   * Offline → mark pending

6. Generate invoice

---

📊 ADMIN DASHBOARD DESIGN

Metrics:

* Total orders
* Total revenue
* Top dishes

Queries:

* Aggregate SUM(total_amount)
* GROUP BY menu_items

Filters:

* Today
* Last 7 days
* Last 30 days

---

🎨 UI SYSTEM DESIGN

* Mobile-first layout
* Max width container (max-w-md)
* Grid layout (2 columns mobile)
* Equal-height cards
* Sticky cart button
* Smooth transitions

---

🚀 PERFORMANCE OPTIMIZATION

* Use pagination for orders
* Lazy load images
* Use React Query or SWR for caching
* Avoid unnecessary re-renders

---

🔔 ERROR HANDLING

* Show user-friendly messages
* Handle payment failures
* Retry SMS if failed
* Log errors in Supabase

---

📦 DEPLOYMENT

* Frontend → Vercel
* Supabase → backend
* Store secrets in env variables

---

🎯 FINAL GOAL

Build a secure, scalable, mobile-first restaurant ordering system with real-time updates, payment integration, and admin control, ready for real-world deployment.
