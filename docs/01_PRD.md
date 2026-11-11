# 01 — Product Requirements Document (PRD)

## 1. Product summary
TableTap is a QR-based restaurant ordering and operations platform. A restaurant creates its menu and tables, generates a unique QR code for each table, and places the QR codes at the tables. Diners scan a code, browse the restaurant's digital menu, customize items, submit orders and follow order progress. Orders appear in the kitchen display and the restaurant admin dashboard in near real time.

TableTap is designed as a multi-tenant SaaS: multiple independent restaurants can use the same platform while their data, menus, tables, orders and settings remain isolated.

## 2. Problem statement
Traditional dine-in ordering can involve waiting for a menu, waiting for a server to take an order, manual order transcription, and customers repeatedly asking about order status. Printed menus are also harder to update. Restaurants need a simple digital workflow without forcing customers to install an app.

## 3. Goals
- Let diners place an order by scanning a table-specific QR code.
- Reduce manual order-taking and order transcription.
- Give kitchen staff a clear, real-time queue of incoming orders.
- Let restaurant owners manage menus, prices, availability, tables and QR codes.
- Support multiple restaurants securely from one SaaS platform.
- Provide a premium, mobile-first menu experience inspired by the supplied menu references.

## 4. Non-goals for the initial release
- Staff management, staff scheduling or payroll.
- Waiter dashboard or waiter task assignment.
- Delivery fleet management or marketplace discovery.
- Native iOS/Android apps.
- Advanced AI recommendations, demand forecasting or inventory optimization.
- Multi-branch enterprise controls beyond the foundational tenant model.
- Full accounting/ERP functionality.

## 5. Users and roles
### Customer (guest)
Scans a table QR, views menu, customizes items, places orders and tracks their order. No app installation or account is required for the MVP.

### Restaurant owner/admin
Authenticated user who configures the restaurant, menu, tables, QR codes, order visibility, business settings and reports.

### Kitchen operator
Authenticated operational user who uses the kitchen display to accept/start/complete preparation steps. This is a limited application permission, not a staff-management module. For MVP, an owner can provision a kitchen login directly; no staff directory or scheduling is included.

## 6. Core user journeys
1. Restaurant admin creates a restaurant workspace.
2. Admin creates categories, products, variants, add-ons and preparation stations.
3. Admin creates tables and generates unique QR codes.
4. Customer scans a table QR and lands on the restaurant menu with table context.
5. Customer adds products and options to cart.
6. Server validates the table session, current menu availability, prices and order total.
7. Order is committed to the database and appears in the kitchen queue.
8. Kitchen updates item/order preparation status.
9. Customer order-tracking view updates in real time.
10. Admin reviews orders, table activity and sales summaries.

## 7. Functional requirements

### FR-01 Restaurant onboarding
- Admin can create a restaurant workspace with name, slug, logo, contact details, currency and timezone.
- Slugs must be unique.
- Each record must be associated with a restaurant tenant.

### FR-02 Menu categories
- Admin can create, edit, reorder, publish/unpublish and delete categories where safe.
- Categories support name, description, image, display order and active status.

### FR-03 Menu products
- Admin can create and edit products with name, description, image, price, category, dietary marker (veg/non-veg/other), availability and preparation station.
- Admin can mark products sold out without deleting them.
- Prices shown to customers must be read from trusted server/database data, never trusted from client-submitted totals.

### FR-04 Variants and add-ons
- Products may have required or optional option groups.
- Examples: pizza size, crust, toppings, extra cheese, beverage size.
- Option groups support minimum/maximum selections and price adjustments.
- Validation must reject invalid combinations and unavailable options.

### FR-05 Table and QR management
- Admin can create, edit, deactivate and archive tables.
- Each table has a unique, revocable QR token.
- QR URL resolves to the restaurant and table context.
- QR tokens must be unguessable; do not expose sequential database IDs as authorization tokens.
- Admin can preview, download and print table QR codes.
- Regenerating a QR invalidates the old token.

### FR-06 Table sessions
- A valid QR opens or joins an active table session according to restaurant configuration.
- Session state includes open/closed status and timestamps.
- Orders are attached to a table session.
- Admin can close a session after settlement/turnover.
- MVP must define behavior for stale QR sessions and table turnover.

### FR-07 Customer menu and cart
- Mobile-first responsive menu with category navigation, search, product details, dietary labels, images and clear prices.
- Customer can add/remove items, change quantity, select options and add item-level notes.
- Cart persists during the browser session where practical.
- Customer must see table number before checkout.
- Customer can browse without a valid table context, but cannot submit a dine-in order without one.

### FR-08 Order placement
- Customer submits an order with an idempotency key to prevent accidental duplicates.
- Server revalidates product availability, options, prices, tax/service-charge rules and table session.
- Order number is human-readable but not a security credential.
- Order records store a snapshot of item names, selected options and prices at order time.
- Customer receives an order confirmation and tracking link/session view.

### FR-09 Kitchen display
- Display incoming orders in a clear queue with table, order age, items, options, notes and station.
- Status lifecycle: `new → accepted → preparing → ready → served/closed`; cancellation/rejection requires a reason and permitted transition.
- Kitchen can update item-level status where station routing is enabled.
- New orders and status changes update in real time, with polling/reconnect fallback.
- Show sound/visual alert for new orders; provide a visible mute control.

### FR-10 Admin order management
- Admin can view/filter orders by status, date and table.
- Admin can inspect order details and status history.
- Admin can cancel/refund only according to configured payment and business rules.
- Admin can mark an order served/closed where appropriate.

### FR-11 Billing and payments
- MVP supports pay-at-counter/cash recording and configurable bill calculation.
- Online payments are an integration phase, not a prerequisite for QR ordering.
- Store payment status separately from order status.
- Support item subtotal, discount, tax, service charge (if configured), rounding and grand total.
- Tax rates and invoice requirements must be confirmed with the restaurant and accountant before production.

### FR-12 Basic reporting
- Admin dashboard shows orders, gross sales, average order value and top products for selected periods.
- Reports must clearly distinguish placed, completed, cancelled and paid orders.
- CSV export can be added after core operations are stable.

## 8. UX and visual requirements
### Customer
- Premium editorial food presentation with large photography and strong category sections, based on the supplied menu references.
- Fast ordering controls: clear prices, compact product summaries, prominent Add button and persistent cart.
- Suggested palette: warm cream/white base, charcoal text, forest green for vegetarian cues, tomato red for non-vegetarian cues, orange for promotions. These are semantic accents, not mandatory global fills.
- Avoid sacrificing readability for oversized imagery. Mobile performance is a priority.

### Kitchen
- High-contrast operational UI with large type, strong status colors, low interaction count and clear elapsed time.
- Orders grouped by preparation station while preserving a restaurant-wide view.
- Designed for tablet/desktop touch screens.

### Admin
- Clean SaaS dashboard with consistent navigation, data tables, filters, forms, charts and responsive layout.
- Visual system should be calmer and more utility-focused than the customer menu.

## 9. MVP success metrics
- QR scan-to-menu load success rate.
- Menu-to-cart conversion rate.
- Cart-to-order completion rate.
- Median time from order submission to kitchen visibility.
- Percentage of orders successfully synchronized to kitchen.
- Order error/duplicate rate.
- Admin menu update completion time.
- Customer order-status page availability.

## 10. Acceptance criteria
- A restaurant admin can create a restaurant, menu and at least two tables.
- Each table QR opens the correct restaurant and table context.
- Invalid/revoked QR tokens cannot create orders.
- Customer can configure an item and place a valid order.
- Server calculates totals from trusted data.
- The order appears in the correct kitchen queue without manual refresh under normal connectivity.
- Kitchen status updates are visible to the customer and admin.
- Tenant A cannot read or modify Tenant B's records.
- Core customer flow works on common mobile screen sizes and does not require app installation.
