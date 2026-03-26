Build a production-ready QR-based restaurant ordering system for a single restaurant named "Sidhu Punjabi Restaurant" using React (frontend) and Supabase (backend with PostgreSQL, Auth, Realtime, and Storage).

---

🎯 PRODUCT OVERVIEW

The system allows customers to scan a QR code placed on each table to access a digital menu, place orders with special instructions, choose payment method (online via Razorpay or offline cash), and optionally download an invoice. The system also includes an admin dashboard to manage menu items, view orders, track revenue, and receive real-time updates. SMS notifications should be sent to the kitchen/admin when new orders are placed.

---

📱 CUSTOMER FEATURES

1. QR Code Ordering

* Each table has a unique QR code
* Scanning QR opens menu URL with table identifier
* No login or user authentication required

2. Menu System

* Display categorized menu (e.g., Veg, Chinese, Roti, Rice, etc.)
* Each item supports multiple variants (Half, Full, Plate, etc.)
* Show item name, price, description, and availability
* Implement category filters and search

3. Cart & Ordering

* Add items with selected variant
* Adjust quantity
* Add special instructions (e.g., less spicy, no onion)
* Show cart summary with total amount

4. Checkout Flow

* Two payment options:
  a. Pay Online (Razorpay)
  b. Pay Offline (Cash)
* After order placement:

  * If online → process payment and mark as paid
  * If offline → mark as pending payment

5. Invoice System

* Generate invoice (PDF) after order
* Allow download on customer device
* Store invoice URL in database

6. Feedback System

* Allow user to rate (1–5 stars) and leave comment after order

7. Call Waiter Feature

* Button to notify staff
* Sends request to admin panel in real-time

---

🧑‍💼 ADMIN FEATURES

1. Dashboard

* Total orders
* Total revenue
* Top selling dishes
* Filters: Today, Last 7 Days, Last 30 Days

2. Order Management

* View all orders in real-time
* Show table number, items, payment status
* No order status tracking required

3. Menu Management

* Add, edit, delete menu items
* Add categories
* Add variants (Half, Full, etc.)
* Upload item images
* Changes should reflect instantly in menu

4. Waiter Calls

* View incoming waiter requests
* Mark as resolved

5. SMS Notification

* Send SMS to kitchen/admin when new order is placed
* Include table number and ordered items

---

🗄️ DATABASE DESIGN (SUPABASE - POSTGRESQL)

Tables Required:

* tables (table_number, qr_code)
* categories
* menu_items
* menu_item_variants
* orders (table_id, total_amount, payment_status, payment_method, invoice_url)
* order_items (item, variant, quantity, instruction)
* feedback (rating, comment)
* waiter_calls (table_id, status)

Requirements:

* Use indexing for performance
* Normalize data properly
* Support scalability for high traffic

---

⚡ REAL-TIME FEATURES

* Use Supabase Realtime for:

  * New orders appearing instantly in admin dashboard
  * Waiter call notifications

---

💳 PAYMENT INTEGRATION

* Integrate Razorpay for online payments
* Create order on backend
* Verify payment signature securely
* Do not trust frontend response

---

📩 SMS INTEGRATION

* Use SMS API (Fast2SMS or Twilio)
* Trigger SMS when order is placed
* Include order details

---

📄 INVOICE GENERATION

* Generate PDF invoice using jsPDF or backend function
* Include:

  * Restaurant name
  * Table number
  * Ordered items
  * Total amount
  * Payment method

---

🎨 UI/UX REQUIREMENTS

* Mobile-first responsive design (priority)
* No horizontal scrolling
* Clean and consistent layout
* Equal height cards
* Max width container (max-w-md centered)
* Touch-friendly buttons (minimum height 44px)
* Fast loading and smooth interactions

---

🔐 SECURITY REQUIREMENTS

* Enable Supabase Row Level Security (RLS)
* Protect admin routes with authentication
* Store API keys in environment variables
* Validate all inputs (prevent empty orders)
* Sanitize user inputs (prevent XSS)
* Verify Razorpay payments on backend
* Implement rate limiting for order creation

---

🚀 PERFORMANCE REQUIREMENTS

* Use pagination for large data
* Optimize queries with indexes
* Use lazy loading for images
* Avoid unnecessary re-renders in React

---

📦 DEPLOYMENT

* Frontend: Vercel
* Backend: Supabase
* Use environment variables for secrets

---

🎯 GOAL

Build a fully functional, scalable, secure, and mobile-first restaurant ordering system that can be used in real-world conditions and is ready for deployment and potential commercialization.
