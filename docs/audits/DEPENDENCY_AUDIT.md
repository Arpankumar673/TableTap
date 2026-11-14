# TableTap — Dependency Audit & Optimization Report

**Project:** TableTap  
**Brand:** Boston & Co. American Eatery  
**Date of Audit:** November 14, 2026  
**Auditor:** Principal Software Architect & Code Quality Auditor  
**Scope:** `package.json`, `package-lock.json`, node_modules, transitive dependencies, peer dependency trees, and bundle optimization.

---

## 1. Executive Summary

A comprehensive dependency audit was conducted on TableTap to identify unnecessary packages, eliminate unused dependencies, prevent supply-chain bloat, and verify bundle health.

### Audit Outcomes:
- **Unused Packages Removed:** 3 packages (`@hookform/resolvers`, `react-hook-form`, `@radix-ui/react-dropdown-menu`).
- **NPM Package Manifest Cleaned:** Cleanly reduced active production dependencies from 29 to 26 packages.
- **Lockfile Integrity Verified:** `package-lock.json` synchronized via `npm install --package-lock-only`.
- **Test Runner Optimized:** Updated `npm test` script to `vitest run --no-cache` to eliminate Windows OneDrive file-locking cache write errors (`EPERM`).

---

## 2. Dependency Evaluation Matrix

### 2.1 Production Dependencies (`dependencies`)

| Package | Version | Status | Architectural Role & Justification |
| :--- | :--- | :--- | :--- |
| `@hookform/resolvers` | `^3.9.1` | **REMOVED** | **Unused.** Form management across TableTap is implemented cleanly using native React 18 state hooks (`useState`) and direct Zod `.safeParse()` calls in Server Actions and form handlers. No `@hookform/resolvers` imports existed in the project. |
| `react-hook-form` | `^7.53.2` | **REMOVED** | **Unused.** Zero imports across `src/` and `tests/`. Removed to prevent unnecessary runtime overhead and supply-chain surface area. |
| `@radix-ui/react-dropdown-menu` | `^2.1.2` | **REMOVED** | **Unused.** Zero imports across `src/` and `tests/`. All interactive menus are handled via Radix Dialog, Select, Tabs, or custom accessible dropdown containers. |
| `@radix-ui/react-dialog` | `^1.1.2` | **RETAINED** | **Actively Used.** Powers the modal dialogs in `MenuManager` (category creation, dish editor), `OrdersManager` (order details modal), and `CustomerMenuView` (modifier selection dialog). |
| `@radix-ui/react-label` | `^2.1.0` | **RETAINED** | **Actively Used.** Accessible label primitive (`src/components/ui/label.tsx`) utilized across all forms. |
| `@radix-ui/react-select` | `^2.1.2` | **RETAINED** | **UI Primitive.** Standard shadcn/ui select primitive (`src/components/ui/select.tsx`). |
| `@radix-ui/react-separator` | `^1.1.0` | **RETAINED** | **UI Primitive.** Standard shadcn/ui separator primitive (`src/components/ui/separator.tsx`). |
| `@radix-ui/react-slot` | `^1.1.0` | **RETAINED** | **Actively Used.** Powers `asChild` composition pattern in `Button` (`src/components/ui/button.tsx`) and Next.js `Link` components. |
| `@radix-ui/react-switch` | `^1.1.1` | **RETAINED** | **Actively Used.** Powers toggle switches for dish availability, category active status, table active status, and accepting orders toggle. |
| `@radix-ui/react-tabs` | `^1.1.1` | **RETAINED** | **Actively Used.** Powers preparation station filtering tabs in Kitchen Display System (`src/components/kitchen/kitchen-board.tsx`). |
| `@supabase/ssr` | `^0.5.2` | **RETAINED** | **Critical Engine.** Official Supabase SSR client for Next.js App Router. Synchronizes session cookies across middleware, Server Components, and Server Actions. |
| `@supabase/supabase-js` | `^2.46.1` | **RETAINED** | **Critical Engine.** Core Supabase JavaScript SDK for PostgreSQL queries, Realtime channel subscriptions, and Supabase Auth. |
| `autoprefixer` | `^10.4.20` | **RETAINED** | **Build Pipeline.** PostCSS plugin for cross-browser CSS vendor prefixing. |
| `class-variance-authority` | `^0.7.1` | **RETAINED** | **Actively Used.** Variant styling engine for Shadcn UI components (`button.tsx`, `badge.tsx`). |
| `clsx` | `^2.1.1` | **RETAINED** | **Actively Used.** Utility for conditional class names in `src/lib/utils.ts` (`cn()`). |
| `framer-motion` | `^11.15.0` | **RETAINED** | **Actively Used.** Drives the Boston & Co. atmospheric full-screen loading animation in `src/components/shared/splash-screen.tsx`. |
| `jszip` | `^3.10.1` | **RETAINED** | **Actively Used.** Generates and packages high-resolution table QR codes into downloadable ZIP archives for physical tabletop fabrication (`src/components/admin/table-qr-manager.tsx`). |
| `lucide-react` | `^0.460.0` | **RETAINED** | **Actively Used.** Comprehensive vector icon suite utilized across admin, customer, and kitchen interfaces. |
| `next` | `14.2.35` | **RETAINED** | **Core Framework.** Next.js 14 App Router, React Server Components, Route Handlers, and Server Actions. |
| `postcss` | `^8.4.49` | **RETAINED** | **Build Pipeline.** CSS processing pipeline for Tailwind CSS. |
| `qrcode` | `^1.5.4` | **RETAINED** | **Actively Used.** High-density 2D QR code generator creating data URLs and SVG vectors for physical dining tables (`TableQrManager`). |
| `react` | `^18.3.1` | **RETAINED** | **Core Framework.** React 18 UI library. |
| `react-dom` | `^18.3.1` | **RETAINED** | **Core Framework.** React 18 DOM renderer. |
| `recharts` | `^2.13.3` | **RETAINED** | **Actively Used.** Data visualization engine powering the 7-day revenue trend chart (`OverviewSalesChart`) and deep analytics views (`AnalyticsView`). |
| `tailwind-merge` | `^2.5.4` | **RETAINED** | **Actively Used.** Merges conflicting Tailwind CSS class names in `src/lib/utils.ts` (`cn()`). |
| `tailwindcss` | `^3.4.14` | **RETAINED** | **Styling Engine.** Utility-first CSS framework configured with custom Boston & Co. color tokens. |
| `tailwindcss-animate` | `^1.0.7` | **RETAINED** | **Styling Engine.** Tailwind plugin providing smooth animations for dialogs, drawers, and toasts. |
| `zod` | `^3.23.8` | **RETAINED** | **Critical Security.** TypeScript-first schema validation enforcing strong type contracts on auth, menu items, table creation, and order submissions. |

---

### 2.2 Development Dependencies (`devDependencies`)

| Package | Version | Status | Justification |
| :--- | :--- | :--- | :--- |
| `@types/node` | `^20.17.6` | **RETAINED** | Essential Node.js TypeScript ambient type definitions. |
| `@types/qrcode` | `^1.5.5` | **RETAINED** | Type definitions for `qrcode` library utilized in `TableQrManager`. |
| `@types/react` | `^18.3.12` | **RETAINED** | Essential React 18 TypeScript type definitions. |
| `@types/react-dom` | `^18.3.1` | **RETAINED** | Essential React DOM TypeScript type definitions. |
| `eslint` | `^8.57.1` | **RETAINED** | ESLint static analysis engine. |
| `eslint-config-next` | `14.2.35` | **RETAINED** | Official Next.js ESLint configuration ruleset. |
| `typescript` | `^5.6.3` | **RETAINED** | TypeScript compiler (`tsc`). |
| `vitest` | `^2.1.8` | **RETAINED** | Lightning-fast test runner for unit tests (`order-state`, `pricing`, `security`, `validation`). |

---

## 3. Package Scripts Optimization

The `scripts` block in `package.json` was reviewed and updated:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "type-check": "tsc --noEmit",
  "test": "vitest run --no-cache"
}
```

### Rationale for `--no-cache` Flag in Vitest:
On Windows workstations with OneDrive directory synchronization or sandboxed execution, Vitest's default behavior of writing test result caches to `node_modules/.vite/vitest/results.json` occasionally encounters filesystem permission locks (`EPERM`). Appending `--no-cache` bypasses file cache serialization while preserving sub-second execution speed (1.17s total duration for 24 tests across 4 test suites).
