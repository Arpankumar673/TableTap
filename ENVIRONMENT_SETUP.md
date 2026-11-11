# TableTap — Environment Setup & Local Development Guide

This guide walks you through configuring your local environment and connecting Supabase and Razorpay to run TableTap (`C:\Projects\TableTap`).

---

## 1. Prerequisites
- **Node.js:** v18.17+ or v20+
- **Package Manager:** npm (v10+ or v11+)
- **Supabase Account:** Free or Pro project at [supabase.com](https://supabase.com)
- **Razorpay Account (Optional for online checkout):** Test Mode API keys from Razorpay Dashboard (Pay-at-Counter works without Razorpay keys)

---

## 2. Initial Setup

### Step 1: Workspace Location
```bash
cd C:\Projects\TableTap
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Populate `.env.local` with your project credentials:
```env
# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Public Configuration (Exposed to browser)
# Retrieve from Supabase Dashboard -> Project Settings -> API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# Supabase Server-Only Configuration (CRITICAL: Never prefix with NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key

# Default Currency & Localization
NEXT_PUBLIC_DEFAULT_CURRENCY=INR
NEXT_PUBLIC_DEFAULT_LOCALE=en-IN

# Razorpay Payments Integration (Test Mode / Live Mode)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
```

> **Graceful Fallback:**  
> Visiting `/` or `/demo` works without database credentials configured. Protected routes redirect to `/setup-required` with instructions when Supabase environment variables are missing.

---

## 3. Manual Database Initialization (Required)

1. Open your project inside the **Supabase Dashboard**.
2. Navigate to **SQL Editor -> New query**.
3. Copy the entire contents of:
   ```text
   C:\Projects\TableTap\supabase\SQL_SETUP_COMPLETE.sql
   ```
4. Paste into the SQL Editor and click **Run**.
   *(This script is idempotent and non-destructive: it creates all 18 tables, 6 enums, helper functions, 11 RPCs, RLS policies, immutable `restaurant_id` triggers, `restaurant-assets` storage bucket, and Realtime publication settings.)*
5. *(Optional verification)* Open a new query with `C:\Projects\TableTap\supabase\tests\rls_multi_tenant_verification.sql` and click **Run** to execute the transaction-rolled-back 10-assertion multi-tenant RLS check (`NOTICE: ALL 10 MULTI-TENANT RLS & SECURITY ASSERTIONS PASSED!`).

---

## 4. Dependency Installation & Running Locally
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

> **Windows IPv6 DNS Note:** If corporate/ISP IPv6 routing stalls npm downloads, run with `NODE_OPTIONS=--dns-result-order=ipv4first`.

---

## 5. Verification Commands
```bash
npm test             # Run Vitest unit test suite (22 tests)
npm run type-check   # Validate TypeScript types (tsc --noEmit)
npm run lint         # Run Next.js ESLint checks
npm run build        # Compile production Next.js App Router bundle
```
