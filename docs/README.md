# TableTap — Project Documentation Pack

**Version:** 1.0  
**Date:** 5 November 2026  
**Product direction:** Multi-restaurant SaaS, QR-based dine-in ordering.

## Included documents
1. `01_PRD.md` — Product requirements and scope.
2. `02_TRD.md` — Functional and non-functional technical requirements.
3. `03_SYSTEM_ARCHITECTURE.md` — System components, boundaries and architecture.
4. `04_USER_FLOWS.md` — Customer, kitchen and admin flows.
5. `05_TECH_STACK.md` — Selected technologies and rationale.
6. `06_DATABASE_DESIGN.md` — Initial data model and key constraints.
7. `07_DEVELOPMENT_PHASES.md` — Milestones, deliverables and acceptance gates.
8. `08_SECURITY_AND_TESTING.md` — Security baseline, testing strategy and release checklist.

## Product decisions recorded
- Build TableTap as a **multi-tenant SaaS** from the foundation.
- Initial ordering mode is **dine-in QR ordering**. Customers can browse a public menu, but must arrive through a valid table QR/session to submit a dine-in order.
- Three interfaces only: **Customer**, **Kitchen**, and **Restaurant Admin**.
- No staff-management module and no waiter dashboard.
- Kitchen workflow uses **one kitchen display with automatic routing by configured preparation station** (for example, Pizza, Grill, Drinks). This is station routing, not a separate staff-management product.
- Customer visual direction: **hybrid premium editorial menu + fast ordering** based on the supplied restaurant menu references.
- Kitchen visual direction: high-contrast, fast operational display.
- Admin visual direction: clean, professional SaaS dashboard.
- Preferred stack: Next.js, TypeScript, Tailwind CSS, shadcn/ui, Supabase PostgreSQL/Auth/Realtime/Storage, Vercel. Payment gateway integration is deferred until the ordering and billing rules are validated.

## Important implementation note
This pack is a baseline specification, not a claim that implementation is complete. Confirm restaurant-specific tax, service-charge, cancellation, payment, printer and kitchen-routing rules before production launch.
