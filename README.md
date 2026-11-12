# TableTap

> **Single-Restaurant QR Dine-In Ordering & Operations Management System**

TableTap digitizes dine-in ordering for a single hospitality venue with zero app installation required by guests. Diners scan a unique cryptographic QR code at their table (`/t/[token]`), browse the digital menu (`/menu`), customize dishes, submit server-validated orders, track live kitchen preparation (`/order/[publicToken]`), request their bill, or pay online via Razorpay.

---

## Three Strictly Scoped Interfaces

1. **Customer Ordering Website (`/menu`, `/t/[token]`, `/order/[publicToken]`, `/demo`):**
   - Mobile-first editorial culinary experience (`#FCFBF7` cream, `#1B5E3A` forest green, `#DC3522` tomato red, `#F58220` spice).
   - Category navigation, instant search, and `Veg` / `Non-Veg` / `Vegan` / `Egg` dietary indicators.
   - Variant & add-on customizer, table session banner, persistent cart, and idempotent checkout.
   - Live 5-stage order progress (`New -> Accepted -> Preparing -> Ready -> Completed`) + `Request Bill` + Razorpay / Counter payment.

2. **Kitchen Display System (`/kitchen`):**
   - High-contrast dark operations console for `kitchen` and `admin` logins.
   - Supabase Realtime WebSocket queue + 15s polling fallback, station filters, elapsed timers & delay alerts, item status controls, and audio chime with mute toggle.

3. **Restaurant Admin Dashboard (`/admin/*`):**
   - **Overview & Analytics (`/admin`, `/admin/analytics`):** KPI metrics, Recharts revenue charts, top dishes, and CSV export.
   - **Menu & Items (`/admin/menu`):** Categories, dishes, variants, modifier groups, image uploads, and 1-click 14-category sample catalog seeder.
   - **Tables & QR Codes (`/admin/tables`):** Physical table registry, cryptographic QR generation/regeneration/revocation, single PNG download, bulk ZIP download, and print cards.
   - **Orders & Settings (`/admin/orders`, `/admin/settings`):** Order inspection, counter settlement, singleton restaurant configuration, preparation stations, and kitchen account provisioning.

---

## Quickstart (`C:\Projects\TableTap`)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure `.env.local`
Copy `.env.example` to `.env.local` and configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, and optional `RAZORPAY_*` keys.

### 3. Run Single-Restaurant SQL Migration in Supabase
Open **Supabase Dashboard -> SQL Editor -> New query**, paste the contents of:
```text
C:\Projects\TableTap\SINGLE_RESTAURANT_MIGRATION.sql
```
and click **Run**. Then create your Admin user in Supabase Auth and promote them:
```sql
UPDATE public.profiles SET role = 'admin', active = true WHERE email = 'your-admin@example.com';
```

### 4. Run Local Development & Verification
```bash
npm run dev          # Start at http://localhost:3000
npm test             # Run 23 Vitest unit tests
npm run type-check   # Strict TypeScript verification
npm run lint         # ESLint check
npm run build        # Production Next.js 14.2.35 build
```

---

## Documentation Index
- [SINGLE_RESTAURANT_ARCHITECTURE.md](SINGLE_RESTAURANT_ARCHITECTURE.md)
- [DATABASE_MIGRATION_REPORT.md](DATABASE_MIGRATION_REPORT.md)
- [REMOVED_FEATURES_REPORT.md](REMOVED_FEATURES_REPORT.md)
- [IMPLEMENTATION_REPORT.md](IMPLEMENTATION_REPORT.md)
- [TESTING_REPORT.md](TESTING_REPORT.md)
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- [SECURITY_DOCUMENTATION.md](SECURITY_DOCUMENTATION.md)
- [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md)
- [PROJECT_STATUS.md](PROJECT_STATUS.md)
- [CHANGELOG.md](CHANGELOG.md)
