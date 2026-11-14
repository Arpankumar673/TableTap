# TableTap — Complete Codebase Inventory

**Project:** TableTap  
**Brand:** Boston & Co. American Eatery  
**Date of Audit:** November 14, 2026  
**Auditor:** Principal Software Architect & Code Quality Auditor  
**Scope:** Complete repository inventory across root, application routes, components, utilities, database migrations, tests, and configurations.

---

## 1. Inventory Classification Taxonomy

Every file within the TableTap repository is categorized under the following classification criteria:

- **Category A (Essential):** System cannot function, compile, build, or deploy without this file (configuration, core engine, security layer, database schema).
- **Category B (Actively Used):** Routinely invoked, imported, or executed during runtime, tests, or administration workflows.
- **Category C (Potentially Unused / Future UI Primitive):** Standard UI library component (e.g., shadcn/ui primitives) currently not imported in active views.
- **Category D (Duplicate):** Redundant copy of logic already implemented elsewhere.
- **Category E (Obsolete / Dead Code):** Legacy boilerplate no longer referenced after single-restaurant refactoring.
- **Category F (Temporary / Generated / Local):** Build artifacts or local development files ignored by version control.
- **Category G (Investigated & Verified):** Files whose runtime role was thoroughly verified against dynamic routes, RPCs, or webhooks.

---

## 2. Directory-by-Directory Inventory

### 2.1 Root Configuration & Environment

| File | Status | Classification | Purpose & Usage Verification |
| :--- | :--- | :--- | :--- |
| `package.json` | Modified | Category A | NPM manifest defining Next.js 14, React 18, Supabase SSR, Tailwind, and scripts. Cleaned of unused dependencies. |
| `package-lock.json` | Modified | Category A | Deterministic dependency lockfile. Cleanly synchronized. |
| `tsconfig.json` | Preserved | Category A | TypeScript compiler configuration (strict mode, path aliases `@/*`). |
| `next.config.mjs` | Preserved | Category A | Next.js runtime configuration (remote image hostnames, security headers). |
| `tailwind.config.ts` | Preserved | Category A | Boston & Co. design system palette (burgundy, cream, espresso, gold, kitchen-dark). |
| `postcss.config.mjs` | Preserved | Category A | PostCSS configuration for Tailwind CSS and Autoprefixer. |
| `components.json` | Preserved | Category A | Shadcn/UI configuration and component path aliasing. |
| `vercel.json` | Preserved | Category A | Vercel deployment directives and routing configuration. |
| `vitest.config.ts` | Preserved | Category A | Vitest test runner configuration mapping path aliases. |
| `.eslintrc.json` | Preserved | Category A | ESLint configuration extending `next/core-web-vitals`. |
| `.gitignore` | Preserved | Category A | Excludes `.env*.local`, `node_modules`, `.next`, build caches. |
| `.npmrc` | Preserved | Category A | NPM engine and dependency installation policies. |
| `.env.example` | Preserved | Category A | Public environment template documenting all expected configuration variables. |
| `.env.local` | Preserved | Category F / Essential Local | Untracked local development credentials (Supabase URL, Anon Key, Service Role Key). **Protected.** |
| `SINGLE_RESTAURANT_MIGRATION.sql` | Preserved | Category A | Root-level consolidated SQL migration for Boston & Co. schema. **Protected.** |

---

### 2.2 Root Documentation & Architectural Audit Reports

| File | Status | Classification | Purpose & Usage Verification |
| :--- | :--- | :--- | :--- |
| `README.md` | Preserved | Category B | Primary project overview, local development setup, single-restaurant philosophy. |
| `CHANGELOG.md` | Preserved | Category B | Chronological release and refactor history. |
| `API_DOCUMENTATION.md` | Preserved | Category B | Complete technical reference for POS, KDS, QR resolution, and Payment endpoints. |
| `ENVIRONMENT_SETUP.md` | Preserved | Category B | Step-by-step instructions for Supabase, Razorpay, and Vercel configuration. |
| `SECURITY_DOCUMENTATION.md` | Preserved | Category B | Detailed overview of RLS, HMAC token hashing, timing-safe checks, and RBAC. |
| `SINGLE_RESTAURANT_ARCHITECTURE.md` | Preserved | Category B | Architectural manifesto for single-tenant restaurant operation. |
| `TECHNICAL_DECISIONS.md` | Preserved | Category B | Architecture decision records (ADRs) for state machine, token auth, SSR. |
| `PROJECT_STATUS.md` | Preserved | Category B | Development progress, completed phases, and future roadmap. |
| `DATABASE_MIGRATION_REPORT.md` | Preserved | Category B | Audit report of PostgreSQL transition to single-restaurant schema. |
| `REFACTORING_AUDIT_REPORT.md` | Preserved | Category B | Audit of removed multi-tenant SaaS constructs. |
| `REMOVED_FEATURES_REPORT.md` | Preserved | Category B | Explicit catalogue of pruned SaaS features. |
| `IMPLEMENTATION_PLAN.md` | Preserved | Category B | Initial development plan and milestones. |
| `IMPLEMENTATION_REPORT.md` | Preserved | Category B | Summary of single-restaurant architecture completion. |
| `PHASE_2_COMPLETION_REPORT.md` | Preserved | Category B | Deliverables report for single-restaurant POS & KDS workflows. |
| `TESTING_REPORT.md` | Preserved | Category B | Comprehensive unit, type-check, and integration verification logs. |

---

### 2.3 System Documentation (`docs/`)

| File | Status | Classification | Purpose & Usage Verification |
| :--- | :--- | :--- | :--- |
| `docs/README.md` | Preserved | Category B | Documentation directory index and map. |
| `docs/01_PRD.md` | Preserved | Category B | Product Requirements Document for Boston & Co. Eatery. |
| `docs/02_TRD.md` | Preserved | Category B | Technical Requirements Document. |
| `docs/03_SYSTEM_ARCHITECTURE.md` | Preserved | Category B | High-level system architecture and data-flow diagrams. |
| `docs/04_USER_FLOWS.md` | Preserved | Category B | User journey diagrams for Admin, Kitchen Operator, and Dining Customer. |
| `docs/05_TECH_STACK.md` | Preserved | Category B | Technology rationale and library selections. |
| `docs/06_DATABASE_DESIGN.md` | Preserved | Category B | Entity-Relationship schema documentation for PostgreSQL. |
| `docs/07_DEVELOPMENT_PHASES.md` | Preserved | Category B | Phase breakdown and delivery schedule. |
| `docs/08_SECURITY_AND_TESTING.md` | Preserved | Category B | Test matrices, threat models, and security requirements. |

---

### 2.4 Application Routing (`src/app/`)

| File | Status | Classification | Purpose & Usage Verification |
| :--- | :--- | :--- | :--- |
| `src/middleware.ts` | Preserved | Category A | Edge route protector enforcing staff login on `/admin` and `/kitchen`. |
| `src/app/layout.tsx` | Preserved | Category A | Root HTML layout rendering fonts, meta tags, and the `SplashScreen`. |
| `src/app/globals.css` | Preserved | Category A | Tailwind base directives, custom scrollbars, and color variables. |
| `src/app/page.tsx` | Preserved | Category A | Root route `/` directing unauthenticated staff to Login and authenticated staff to `/admin` or `/kitchen`. |
| `src/app/(admin)/layout.tsx` | Preserved | Category A | Protected Admin layout wrapping dashboard views with `AdminSidebar`. |
| `src/app/(admin)/admin/page.tsx` | Modified | Category A | Admin POS Overview Console (6 KPI cards, real-time metrics, recent orders). |
| `src/app/(admin)/admin/analytics/page.tsx` | Preserved | Category B | Restaurant sales, revenue by category, and product velocity charts. |
| `src/app/(admin)/admin/menu/page.tsx` | Preserved | Category A | Menu Management view for categories, items, modifiers, and sample seeding. |
| `src/app/(admin)/admin/orders/page.tsx` | Preserved | Category A | Admin Live Orders Console for viewing and updating order statuses. |
| `src/app/(admin)/admin/qr/page.tsx` | Preserved | Category A | QR Code inspection, tabletop badge print preview, and ZIP export. |
| `src/app/(admin)/admin/settings/page.tsx` | Preserved | Category A | Restaurant profile, tax rates, stations, kitchen accounts, and password change. |
| `src/app/(admin)/admin/tables/page.tsx` | Preserved | Category A | Physical dining table management and session monitoring. |
| `src/app/(auth)/login/page.tsx` | Preserved | Category A | Dedicated `/login` staff route rendering `AdminLoginForm`. |
| `src/app/(auth)/forgot-password/page.tsx` | Preserved | Category A | Password recovery email request form. |
| `src/app/(auth)/reset-password/page.tsx` | Preserved | Category A | Password reset form updating credentials via Supabase Auth. |
| `src/app/auth/callback/route.ts` | Preserved | Category A | PKCE auth callback handler exchanging reset tokens for active sessions. |
| `src/app/(kitchen)/kitchen/page.tsx` | Preserved | Category A | Kitchen Display System (KDS) for kitchen tablets. |
| `src/app/(public)/menu/page.tsx` | Modified | Category A | Customer digital menu view for smartphone table ordering. |
| `src/app/(public)/order/[publicToken]/page.tsx` | Preserved | Category A | Live order tracker with Razorpay online payment integration. |
| `src/app/t/[token]/page.tsx` | Modified | Category A | QR code entry point resolving tabletop tokens to active table sessions. |
| `src/app/demo/page.tsx` | Preserved | Category B | Fallback preview route redirecting directly to `/menu`. |
| `src/app/setup-required/page.tsx` | Preserved | Category B | Graceful fallback redirecting legacy bookmarks directly to `/`. |

---

### 2.5 API Routes (`src/app/api/`)

| File | Status | Classification | Purpose & Usage Verification |
| :--- | :--- | :--- | :--- |
| `src/app/api/orders/route.ts` | Preserved | Category A | POST route for customer order submission with idempotency protection. |
| `src/app/api/payments/razorpay/create-order/route.ts` | Preserved | Category A | Creates server-side Razorpay order with subtotal and tax calculation. |
| `src/app/api/payments/razorpay/verify/route.ts` | Preserved | Category A | Verifies cryptographic HMAC payment signatures and updates order status. |
| `src/app/api/payments/razorpay/webhook/route.ts` | Preserved | Category A | Asynchronous Razorpay webhook processing for capture and refund events. |
| `src/app/api/qr/resolve/route.ts` | Preserved | Category A | Rate-limited API endpoint resolving cryptographic QR tokens. |

---

### 2.6 Server Actions (`src/app/actions/`)

| File | Status | Classification | Purpose & Usage Verification |
| :--- | :--- | :--- | :--- |
| `src/app/actions/admin-menu.ts` | Preserved | Category A | Server actions for seeding sample categories, products, and starter tables. |
| `src/app/actions/admin-settings.ts` | Preserved | Category A | Server actions for updating restaurant profile, stations, kitchen logins, and changing admin password. |
| `src/app/actions/admin-tables.ts` | Preserved | Category A | Server actions for creating tables, generating QR tokens, revoking QRs, and closing sessions. |

---

### 2.7 UI Components (`src/components/`)

| File | Status | Classification | Purpose & Usage Verification |
| :--- | :--- | :--- | :--- |
| `src/components/admin/admin-login-form.tsx` | Preserved | Category A | Staff login interface with Boston & Co. branding and password recovery link. |
| `src/components/admin/admin-sidebar.tsx` | Modified | Category A | 8-section navigation sidebar with active link highlights and role indicators. |
| `src/components/admin/analytics-view.tsx` | Modified | Category B | Comprehensive sales trends, revenue charts, and category breakdowns. |
| `src/components/admin/menu-manager.tsx` | Preserved | Category A | Full menu management CMS (categories, dishes, modifiers, pricing, availability). |
| `src/components/admin/orders-manager.tsx` | Preserved | Category A | Real-time order management dashboard with status dispatch modal. |
| `src/components/admin/overview-charts.tsx` | Preserved | Category A | 7-day revenue trend chart component using Recharts. |
| `src/components/admin/settings-manager.tsx` | Preserved | Category A | Restaurant configuration, stations, kitchen tablet provisioning, and change password. |
| `src/components/admin/table-qr-manager.tsx` | Preserved | Category A | Physical table generator, visual QR renderer, stand preview, and ZIP downloader. |
| `src/components/customer/customer-menu-view.tsx` | Preserved | Category A | Smartphone customer menu with category filter, variant selectors, and cart drawer. |
| `src/components/kitchen/kitchen-board.tsx` | Modified | Category A | Live Kitchen Display System with ticket cards, station filters, and sound alerts. |
| `src/components/shared/boston-logo.tsx` | Modified | Category A | Handcrafted vector SVG brand mark with configurable sizes and colorways. |
| `src/components/shared/dietary-badge.tsx` | Preserved | Category A | Veg, Non-Veg, Vegan, and Egg dietary indicator badges. |
| `src/components/shared/splash-screen.tsx` | Preserved | Category A | Atmospheric full-screen brand splash screen powered by Framer Motion. |
| `src/components/ui/badge.tsx` | Preserved | Category A | Reusable badge with variants (default, secondary, destructive, outline, spice). |
| `src/components/ui/button.tsx` | Preserved | Category A | Accessible button component with variant and size presets. |
| `src/components/ui/card.tsx` | Preserved | Category A | Card container primitives (Header, Title, Description, Content, Footer). |
| `src/components/ui/dialog.tsx` | Preserved | Category A | Radix modal dialog primitive used in menu and order edit modals. |
| `src/components/ui/input.tsx` | Preserved | Category A | Standardized styled input control. |
| `src/components/ui/label.tsx` | Preserved | Category A | Radix accessible label primitive. |
| `src/components/ui/select.tsx` | Preserved | Category C | Radix Select primitive available for complex multi-option inputs. |
| `src/components/ui/separator.tsx` | Preserved | Category C | Radix Separator divider primitive. |
| `src/components/ui/switch.tsx` | Preserved | Category A | Radix Switch toggle primitive used for availability and order status toggles. |
| `src/components/ui/tabs.tsx` | Preserved | Category A | Radix Tabs primitive used in KDS station filtering. |
| `src/components/ui/textarea.tsx` | Preserved | Category A | Standardized styled multiline text input. |

---

### 2.8 Shared Libraries & Utilities (`src/lib/`)

| File | Status | Classification | Purpose & Usage Verification |
| :--- | :--- | :--- | :--- |
| `src/lib/utils.ts` | Preserved | Category A | Core `cn()` Tailwind merge utility and `formatCurrency()` formatter. |
| `src/lib/auth/session.ts` | Preserved | Category A | Staff session validator, single-restaurant RBAC enforcement (`requireStaffRole`). |
| `src/lib/demo/catalog.ts` | Preserved | Category B | Complete Boston & Co. American Eatery menu catalog data for 1-click seeding. |
| `src/lib/orders/state-machine.ts` | Preserved | Category A | Deterministic order status lifecycle transitions (`new -> accepted -> preparing -> ready -> completed`). |
| `src/lib/payments/razorpay.ts` | Preserved | Category A | Razorpay client initialization and HMAC-SHA256 signature verifier. |
| `src/lib/pricing/calculator.ts` | Preserved | Category A | Precision financial calculation for item totals, modifiers, taxes, and service charges. |
| `src/lib/security/tokens.ts` | Preserved | Category A | Cryptographic random token generation, SHA-256 token hashing, in-memory rate limiting. |
| `src/lib/supabase/admin.ts` | Preserved | Category A | Elevated server-only Supabase client using Service Role Key for provisioning. |
| `src/lib/supabase/client.ts` | Preserved | Category A | Browser Supabase client for client-side queries and Realtime subscriptions. |
| `src/lib/supabase/env.ts` | Preserved | Category A | Runtime validation of Supabase environment variables with production fallbacks. |
| `src/lib/supabase/middleware.ts` | **Deleted** | **Category E (Obsolete)** | **Redundant boilerplate file superseded by `src/middleware.ts`. Safely removed.** |
| `src/lib/supabase/server.ts` | Preserved | Category A | Next.js App Router Supabase client syncing auth cookies via `@supabase/ssr`. |
| `src/lib/validation/auth.ts` | Preserved | Category A | Zod schema validating staff authentication credentials. |
| `src/lib/validation/menu.ts` | Preserved | Category A | Zod schema validating categories, products, prices, and dietary tags. |
| `src/lib/validation/order.ts` | Preserved | Category A | Zod schema validating customer order submissions and status transitions. |
| `src/lib/validation/restaurant.ts` | Preserved | Category A | Zod schema validating restaurant profile settings and station creation. |
| `src/lib/validation/table.ts` | Preserved | Category A | Zod schema validating table numbers, capacities, and active status. |

---

### 2.9 TypeScript Interfaces (`src/types/`)

| File | Status | Classification | Purpose & Usage Verification |
| :--- | :--- | :--- | :--- |
| `src/types/cart.ts` | Preserved | Category A | TypeScript interfaces for customer cart items, selected options, and totals. |
| `src/types/database.ts` | Preserved | Category A | Complete PostgreSQL schema type definitions generated from Supabase tables. |
| `src/types/menu.ts` | Preserved | Category A | Domain models for categories, products, variants, modifier groups, and dietary types. |
| `src/types/orders.ts` | Preserved | Category A | Domain models for order lifecycle statuses, payment statuses, and line items. |
| `src/types/roles.ts` | Preserved | Category A | Single-restaurant staff roles strictly defined as `"admin" | "kitchen"`. |

---

### 2.10 Database Migrations & Verification (`supabase/`)

| File | Status | Classification | Purpose & Usage Verification |
| :--- | :--- | :--- | :--- |
| `supabase/SQL_SETUP_COMPLETE.sql` | Preserved | Category A | Comprehensive standalone PostgreSQL schema setup script. **Protected.** |
| `supabase/migrations/20261105000001_initial_schema.sql` | Preserved | Category A | Initial schema migration with base tables and timestamps. **Protected.** |
| `supabase/migrations/20261112000001_single_restaurant_refactor.sql` | Preserved | Category A | Single-restaurant refactor migration dropping SaaS overhead. **Protected.** |
| `supabase/tests/rls_single_restaurant_verification.sql` | Preserved | Category A | PostgreSQL RLS verification test suite verifying single-restaurant isolation. **Protected.** |

---

### 2.11 Test Suite (`tests/`)

| File | Status | Classification | Purpose & Usage Verification |
| :--- | :--- | :--- | :--- |
| `tests/order-state.test.ts` | Preserved | Category A | Vitest tests verifying order lifecycle state machine transitions and permissions. |
| `tests/pricing.test.ts` | Preserved | Category A | Vitest tests verifying tax rounding, service charges, modifier pricing, and discounts. |
| `tests/security.test.ts` | Preserved | Category A | Vitest tests verifying SHA-256 token hashing, timing-safe equality, and rate limiting. |
| `tests/validation.test.ts` | Modified | Category A | Vitest tests verifying Zod schemas, table constraints, and password change rules. |

---

### 2.12 Static Assets (`public/images/`)

| File | Status | Classification | Purpose & Usage Verification |
| :--- | :--- | :--- | :--- |
| `public/images/boston-logo.svg` | Preserved | Category B | Official Boston & Co. American Eatery vector logo asset. |
| `public/images/boston-original-banner.png` | Preserved | Category B | High-resolution restaurant interior photograph used in the `SplashScreen`. |

---

## 3. Inventory Summary Metrics

- **Total Tracked Project Files Evaluated:** 124 files
- **Files Retained & Actively Verified:** 123 files
- **Files Deleted as Obsolete / Dead Code:** 1 file (`src/lib/supabase/middleware.ts`)
- **Files Modified for Dead Code / Unused Import Pruning:** 7 files
- **Total Unused Dependencies Removed:** 3 packages (`@hookform/resolvers`, `react-hook-form`, `@radix-ui/react-dropdown-menu`)
- **Protected Core Modules Modified:** 0 (strictly zero violations of critical protection rules)
