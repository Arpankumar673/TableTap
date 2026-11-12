# TableTap — Environment Setup & Local Development Guide

This guide explains how to configure `.env.local`, apply the single-restaurant database migration in Supabase, and run TableTap (`C:\Projects\TableTap`).

---

## 1. Prerequisites
- **Node.js:** v18.17+ or v20+
- **Package Manager:** npm (v10+ or v11+)
- **Supabase Project:** Free or Pro project at [supabase.com](https://supabase.com)
- **Razorpay (Optional):** Test or Live mode keys if enabling online payment on `/order/[publicToken]`

---

## 2. Configure `.env.local`

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Populate `.env.local`:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
NEXT_PUBLIC_DEFAULT_CURRENCY=INR
NEXT_PUBLIC_DEFAULT_LOCALE=en-IN

# Optional Razorpay Online Checkout
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
```

---

## 3. Manual Database Setup & Migration (Supabase SQL Editor)

1. Open **Supabase Dashboard -> SQL Editor -> New query**.
2. Open `C:\Projects\TableTap\SINGLE_RESTAURANT_MIGRATION.sql`, copy the entire script, and click **Run**.
3. Create your primary Admin user in **Supabase Dashboard -> Authentication -> Users -> Add user**, then promote the user in SQL Editor:
   ```sql
   UPDATE public.profiles SET role = 'admin', active = true WHERE email = 'your-admin@example.com';
   ```
4. *(Optional Verification)* Run `C:\Projects\TableTap\supabase\tests\rls_single_restaurant_verification.sql` in SQL Editor (`BEGIN; ... ROLLBACK;`).

---

## 4. Local Commands & Vercel Deployment

```bash
npm install
npm run dev          # Development server at http://localhost:3000
npm test             # 23 Vitest unit tests
npm run type-check   # TypeScript verification
npm run lint         # ESLint check
npm run build        # Production build
```

For Vercel deployment (`vercel.json` specifies `"framework": "nextjs"`):
- Ensure **Framework Preset** = **Next.js** and **Output Directory** override is **OFF** (`.next`, not `dist`).
- Add all `.env.local` variables to Vercel **Environment Variables**.
