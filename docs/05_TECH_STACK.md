# 05 — Technology Stack Decision

## 1. Selected stack

| Layer | Selection | Use |
|---|---|---|
| Framework | Next.js (App Router) | Customer, kitchen and admin web experiences |
| Language | TypeScript | Safer application code |
| Styling | Tailwind CSS | Responsive design system |
| UI primitives | shadcn/ui + Radix UI | Accessible reusable controls |
| Motion | Framer Motion | Subtle transitions only |
| Icons | Lucide React | Consistent iconography |
| Charts | Recharts | Admin analytics |
| Validation | Zod | Runtime input validation |
| Forms | React Hook Form | Complex admin forms |
| Backend platform | Supabase | Managed backend platform |
| Database | PostgreSQL | Relational system of record |
| Authentication | Supabase Auth | Admin/kitchen login |
| Realtime | Supabase Realtime | Order and kitchen updates |
| File storage | Supabase Storage | Menu images and restaurant assets |
| QR generation | `qrcode` or equivalent maintained package | Generate printable QR assets |
| Payments | Razorpay (planned) | Indian online payment support, after business rules |
| Hosting | Vercel | Next.js deployment |
| Testing | Vitest, Testing Library, Playwright | Unit, component and end-to-end testing |
| Monitoring | Vercel monitoring / Sentry (optional) | Runtime errors and performance |

## 2. Why this stack
- Next.js provides routing, server rendering and server-side operations in one framework.
- TypeScript improves maintainability as the product grows.
- Tailwind and shadcn/ui enable a consistent premium design system without locking the product into a generic template.
- Supabase reduces infrastructure overhead while providing PostgreSQL, Auth, Realtime and Storage.
- PostgreSQL supports transactional orders, relational menu options and tenant isolation.
- Vercel offers a straightforward deployment path for Next.js.

## 3. Frontend design system
### Customer: premium editorial + fast commerce
- Warm neutral surfaces and generous food photography.
- Strong editorial category headings.
- Compact, readable product rows/cards with visible price and Add action.
- Semantic veg/non-veg indicators.
- Sticky category navigation and cart summary.
- Keep images optimized and avoid heavy animations.

### Kitchen: operational display
- High contrast, large readable type and clear status grouping.
- Order age and table number immediately visible.
- Station filters and all-station overview.
- Keyboard/touch-friendly status controls.
- Alert sound must be user-controllable.

### Admin: professional SaaS
- Sidebar navigation, page title, key metrics, data tables and forms.
- Consistent empty/loading/error states.
- Charts only where they aid decisions.
- Responsive layout for laptop/tablet.

## 4. Suggested design tokens
- Base: warm white / cream and neutral charcoal.
- Accent: forest green.
- Semantic: green for vegetarian, red for non-vegetarian, amber/orange for attention/promotions.
- Status colors: use a consistent accessible palette with text labels; never communicate status by color alone.
- Typography: one expressive display face for selected customer headings plus a highly legible sans-serif for body and controls.

## 5. Version policy
Use current stable releases at project initialization, pin dependencies with a lockfile, and review framework/provider release notes before upgrades. Do not hard-code version numbers in this long-lived specification.
