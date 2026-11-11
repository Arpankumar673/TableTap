# 02 — Technical Requirements Document (TRD)

## 1. System overview
A web application with three experiences:
- Public customer ordering experience.
- Authenticated kitchen display.
- Authenticated restaurant admin.

The application uses a shared Next.js codebase with route groups and shared domain logic. Supabase provides PostgreSQL, authentication, object storage and realtime events. Sensitive operations run on trusted server-side code (Next.js server actions/route handlers or a dedicated service if later required).

## 2. Proposed application structure
```text
apps/web/
  app/
    (public)/
      r/[restaurantSlug]/menu/
      order/[publicOrderToken]/
    (auth)/
      login/
    (admin)/
      dashboard/
      menu/
      categories/
      tables/
      orders/
      settings/
    (kitchen)/
      kitchen/
  components/
    customer/
    kitchen/
    admin/
    shared/
  features/
    menu/
    cart/
    ordering/
    tables/
    kitchen/
    reporting/
  lib/
    supabase/
    validation/
    pricing/
    permissions/
  types/
  tests/
supabase/
  migrations/
  seed/
```

## 3. Frontend requirements
- Next.js App Router and TypeScript.
- Server Components by default; Client Components only for interactive elements.
- Tailwind CSS for design tokens and responsive layout.
- shadcn/ui for accessible primitives, customized to the TableTap visual system.
- Framer Motion only for purposeful, lightweight transitions.
- Lucide React for icons.
- Recharts for admin reporting.
- Use `next/image` or an equivalent optimized image pipeline; define image dimensions and responsive sizes.
- Use schema validation (Zod) for forms and request payloads.
- Avoid duplicating business rules between client and server.

## 4. Backend and data requirements
- Supabase PostgreSQL is the system of record.
- Supabase Auth for admin/kitchen authentication.
- Supabase Storage for restaurant logos and menu images.
- Supabase Realtime for order and kitchen status updates.
- All tenant-owned tables include `restaurant_id` or are linked through a tenant-scoped parent.
- Enforce Row Level Security (RLS) on every exposed table.
- Privileged server credentials must never be shipped to the browser.
- Order creation and pricing must be transactional or implemented in a database function/secure server transaction to avoid partial writes.
- Store immutable order-item snapshots to preserve historical receipts after menu changes.

## 5. API/domain operations
Use server-side operations with authenticated/validated input. Exact route names can be finalized during implementation.

| Operation | Purpose | Access |
|---|---|---|
| Create restaurant | Create tenant/workspace | Authenticated onboarding |
| Manage category/product | CRUD menu | Restaurant admin |
| Manage table | Create/archive table | Restaurant admin |
| Generate/revoke QR | Rotate table token | Restaurant admin |
| Resolve QR | Validate token and open/join session | Public, rate-limited |
| Get public menu | Return published menu | Public |
| Create order | Validate session/cart/prices and create order | Public session token, rate-limited |
| Get order status | Return limited order state | Public order token/session |
| Kitchen queue | Retrieve station orders | Kitchen/admin |
| Update order item | Move item through workflow | Kitchen/admin |
| Update order status | Change permitted order status | Kitchen/admin |
| Admin metrics | Aggregated reporting | Restaurant admin |

## 6. Order state model
Recommended order-level states:
- `pending` — submitted and awaiting kitchen acceptance.
- `accepted` — kitchen accepted the order.
- `preparing` — preparation has started.
- `ready` — all required items are ready.
- `served` — delivered to the table.
- `completed` — bill/session closed.
- `cancelled` — cancelled with reason.

Recommended item-level states:
- `pending`, `preparing`, `ready`, `cancelled`.

Rules:
- Order-level status is derived from item states where station routing is active, except explicit admin cancellation/closure.
- A transition must be validated server-side.
- Every status transition writes an audit/history record with actor, timestamp and previous/new state.
- Payment state is separate: `unpaid`, `pending`, `paid`, `failed`, `refunded`, `partially_refunded`.

## 7. QR and session requirements
- QR code contains an HTTPS URL with a cryptographically random token.
- Store only a hash of the QR token where feasible; compare securely during resolution.
- Token must be revocable and rotatable.
- QR resolution must validate restaurant/table active state.
- Table session token should be distinct from QR token and have bounded lifetime/closure rules.
- Do not trust a client-provided `restaurant_id`, `table_id`, unit price or total.
- Consider a short-lived signed session cookie/token after QR resolution.
- Rate-limit QR resolution and order submission; add bot/abuse controls as usage grows.

## 8. Realtime requirements
- Subscribe only to the relevant restaurant/table/order channels.
- Validate access before subscribing; do not expose private order data on guessable channels.
- Persist all state changes in PostgreSQL; realtime is a notification mechanism, not the source of truth.
- On reconnect, refetch current state to recover missed events.
- Provide a modest polling fallback for degraded realtime connectivity.
- Prevent duplicate processing using unique event/order identifiers.

## 9. Performance and reliability
- Customer menu should prioritize fast first content and optimized images.
- Use pagination or bounded queries for historical orders.
- Kitchen queue should avoid full-page refresh and excessive subscriptions.
- Add database indexes for tenant, table, order status and created-at query patterns.
- Define backup/restore and incident response procedures before commercial launch.
- Log errors with request correlation IDs; never log secrets, full payment credentials or unnecessary personal data.

## 10. Compatibility
- Responsive mobile customer flow, minimum supported viewport 320 CSS px.
- Kitchen/admin optimized for tablet and desktop, while remaining responsive.
- Current stable versions of major evergreen browsers.
- No native app installation required for customers.

## 11. Environment configuration
Maintain separate development, staging and production Supabase projects where possible.
Required environment variables should be documented in `.env.example`. Public Supabase URL/anon key may be exposed only with correct RLS; service-role key and payment secrets remain server-side. Never commit `.env` files.

## 12. Deployment
- Deploy Next.js application on Vercel or equivalent.
- Apply database migrations through a controlled deployment pipeline.
- Use preview deployments for pull requests, staging for acceptance testing and production for live restaurants.
- Configure custom domains, HTTPS, environment variables, monitoring and rollback procedure.
