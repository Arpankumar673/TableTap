# 07 — Development Phases and Delivery Plan

## Delivery approach
Build a usable end-to-end vertical slice early, then harden and expand. Do not build analytics or payment integrations before the core QR-to-kitchen flow works.

| Phase | Scope | Key deliverables | Exit criteria |
|---|---|---|---|
| 0. Product foundation | Confirm business rules, user journeys, design direction | Approved PRD/TRD, wireframes, acceptance criteria | Scope and policies signed off |
| 1. Project setup | Next.js, TypeScript, Tailwind, linting, tests, environments | Running app, CI baseline, design tokens | Build and checks pass |
| 2. Database & security foundation | Supabase project, migrations, tenant model, RLS | Schema, seed data, RLS tests | Cross-tenant access tests pass |
| 3. Authentication & admin shell | Admin/kitchen login, protected routes, navigation | Role-aware shells | Unauthorized routes blocked |
| 4. Restaurant & menu management | Restaurant settings, categories, products, images, variants, add-ons | Functional menu CMS | Admin can publish a complete menu |
| 5. Tables & QR | Table CRUD, token generation/revocation, printable QR | Table management | Each QR resolves to correct table; revoked QR fails |
| 6. Customer menu & cart | Premium responsive menu, search/categories, product customizer, cart | Public customer ordering UI | Customer can build a valid cart on mobile |
| 7. Order engine | Server validation, pricing, idempotency, order snapshots | Secure order creation | Duplicate/invalid/changed-price cases handled |
| 8. Kitchen display | Live queue, station routing, status transitions, reconnect recovery | Kitchen dashboard | Order appears and status updates propagate |
| 9. Customer tracking & admin orders | Tracking view, admin order management, table activity | End-to-end dine-in flow | Full scan-to-ready journey passes |
| 10. Billing & payments | Bill rules, cash/pay-at-counter, payment gateway if approved | Payment and receipt flow | Reconciliation and failure tests pass |
| 11. Reporting & polish | Sales summaries, top products, exports, performance/accessibility | Admin reporting and UX polish | Metrics reconcile against orders |
| 12. Pilot & launch | Restaurant pilot, staff orientation for kitchen use, monitoring, backup/rollback | Production release | Pilot acceptance and incident plan complete |

## Suggested milestone gates
### MVP gate
Phases 1–9 complete. One restaurant can configure a menu and tables, customers can order by QR, kitchen can process orders, and customer/admin can see status.

### Commercial pilot gate
MVP plus billing rules, operational testing, monitoring, backups, security review and real restaurant pilot.

### SaaS scale gate
Tenant onboarding automation, subscription/billing for restaurants, advanced analytics, multi-branch support and operational tooling.

## Definition of done for each phase
- Acceptance criteria met.
- Unit/integration tests added for business logic.
- RLS and authorization implications reviewed.
- Loading, empty, error and offline/reconnect states handled.
- Responsive and accessibility checks completed.
- Database migration and rollback implications documented.
- No secrets committed; environment documentation updated.
- Phase report records changes, test results, known issues and next steps.
