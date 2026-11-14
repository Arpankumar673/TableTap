# TableTap — Codebase Cleanup Changelog

**Project:** TableTap  
**Brand:** Boston & Co. American Eatery  
**Date of Audit:** November 14, 2026  
**Auditor:** Principal Software Architect & Code Quality Auditor  
**Scope:** Chronological and file-by-file log of all deletions, modifications, dependency prunings, and verified retentions.

---

## 1. Files Deleted

| File Path | Classification | Justification |
| :--- | :--- | :--- |
| `src/lib/supabase/middleware.ts` | **Obsolete / Dead Code** | This file contained a legacy `updateSession(request: NextRequest)` function from an early template. The live Next.js middleware is located at [`src/middleware.ts`](file:///c:/Users/arpan/OneDrive/Desktop/TableTap/src/middleware.ts) and directly performs cookie synchronization, protected route authorization (`/admin`, `/kitchen`), and graceful redirects. Zero files in the repository imported `src/lib/supabase/middleware.ts`. Safely deleted with zero regressions. |

---

## 2. Files Modified

| File Path | Nature of Modification | Architectural Reason |
| :--- | :--- | :--- |
| `package.json` | Dependency Cleanup & Script Optimization | 1. Removed unused production packages: `@hookform/resolvers`, `react-hook-form`, `@radix-ui/react-dropdown-menu`.<br>2. Appended `--no-cache` to `test` script (`vitest run --no-cache`) to ensure seamless execution across Windows and CI environments without `EPERM` filesystem lock warnings. |
| `package-lock.json` | Deterministic Lockfile Synchronization | Synchronized lockfile cleanly via `npm install --package-lock-only` to reflect the removal of unused packages. |
| `src/app/(admin)/admin/page.tsx` | Dead Code & Unused Variable Pruning | 1. Removed unused `TrendingUp` import from `lucide-react`.<br>2. Removed unused variables `averageOrderValue`, `totalOrdersCount`, and `grossRevenue7d` (lines 78–85), which were computed but never rendered. |
| `src/app/(public)/menu/page.tsx` | Unused Import Pruning | Removed unused `redirect` (from `next/navigation`) and `getSupabasePublicEnv` (from `@/lib/supabase/env`), leftover from the elimination of `/setup-required`. |
| `src/app/t/[token]/page.tsx` | Unused Import Pruning | Removed unused `getSupabasePublicEnv` import from `@/lib/supabase/env`. |
| `src/components/admin/admin-sidebar.tsx` | Meaningful Prop Utilization | Integrated `userRole` into the footer status indicator (`{userRole} • Security Active`) instead of leaving it an unused prop in `AdminSidebarProps`. |
| `src/components/admin/analytics-view.tsx` | Unused Import Pruning | Removed unused `Calendar` icon import from `lucide-react`. |
| `src/components/kitchen/kitchen-board.tsx` | Dead Code Pruning & Prop Utilization | 1. Removed unused `Flame` icon import from `lucide-react`.<br>2. Utilized `restaurantName` in the Kitchen Display header subtitle (`{restaurantName} • Tap order actions or individual station items to update live status`). |
| `src/components/shared/boston-logo.tsx` | Vector Preset Simplification | Pruned unused keys `text1`, `text2`, `stroke`, `rx` from `sizeMap` presets. The SVG uses a standard 340×136 `viewBox`, so internal vector elements scale automatically with `width` and `height`. |
| `tests/validation.test.ts` | Test Coverage Expansion | Added comprehensive unit tests validating password management constraints (minimum 8 characters, non-empty validation, mismatch detection, and identical old/new password prevention). |

---

## 3. Dependencies Removed

| Package Name | Category | Removal Rationale |
| :--- | :--- | :--- |
| `@hookform/resolvers` | Production Dependency | No references or usages across the codebase. Replaced by direct Zod schema parsing. |
| `react-hook-form` | Production Dependency | No forms in TableTap utilize `react-hook-form`. All forms use controlled React state. |
| `@radix-ui/react-dropdown-menu` | Production Dependency | No dropdown menu primitives are imported. Navigation uses direct Links and interactive modals use Radix Dialog. |

---

## 4. Critical Files Intentionally Retained

The following core modules were audited and intentionally retained without architectural disruption:

| File Path | Role | Retention Rationale |
| :--- | :--- | :--- |
| `src/app/setup-required/page.tsx` | Fallback Route | Retained as a clean 10-line server redirect to `/`. Prevents 404 errors for any users with cached browser bookmarks to `/setup-required`. |
| `src/components/ui/select.tsx` | UI Primitive | Retained as a standard shadcn/ui select primitive for future multi-select filter controls. |
| `src/components/ui/separator.tsx` | UI Primitive | Retained as an accessible Radix divider primitive. |
| `src/lib/demo/catalog.ts` | Seeder Data | Retained for 1-click sample menu seeding (`seedSampleCatalogAction`) in `src/app/actions/admin-menu.ts`. |
| `SINGLE_RESTAURANT_MIGRATION.sql` | SQL Migration | Essential migration blueprint. Strictly protected under Rule 1. |
| `supabase/migrations/*` | Database Schema | Historical and active PostgreSQL schema migrations. Strictly protected under Rule 1. |
| `tests/*.test.ts` | Vitest Test Suite | 4 comprehensive test suites providing automated regression protection for core business logic. |
| `docs/*.md` & Root Audit Reports | Documentation | Architectural Decision Records and technical reference manuals documenting the transition to a single-restaurant architecture. |
