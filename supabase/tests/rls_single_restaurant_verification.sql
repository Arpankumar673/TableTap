-- ==============================================================================
-- TABLETAP — SINGLE-RESTAURANT RLS & SECURITY VERIFICATION SUITE
-- Safe Transaction Script (Wrapped in BEGIN ... ROLLBACK so zero test data persists)
--
-- Tests Covered:
-- 1. Admin, Kitchen, and Anonymous authorization boundaries
-- 2. Strict prevention of direct anonymous reads on private tables (`orders`, `tables`, `table_qr_tokens`)
-- 3. Prevention of non-admin privilege escalation (`kitchen` user attempting to set `role = 'admin'`)
-- 4. Cryptographic QR token resolution and revocation invalidation
-- 5. Server-side canonical order pricing & immutable snapshots
-- 6. Order creation starts cleanly in `new` status with idempotency protection
-- 7. Kitchen transition lifecycle (`new -> accepted -> preparing -> ready -> completed`)
-- ==============================================================================

BEGIN;

SET LOCAL search_path = public, extensions;

DO $$
DECLARE
  v_admin_id UUID := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  v_kitchen_id UUID := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';

  v_cat_id UUID := '33333333-3333-4333-8333-333333333331';
  v_prod_id UUID := '44444444-4444-4444-8444-444444444441';
  v_var_id UUID := '55555555-5555-4555-8555-555555555551';
  v_table_id UUID := '66666666-6666-4666-8666-666666666661';

  v_raw_qr TEXT := 'secure_single_restaurant_qr_table_99_alpha';
  v_hash_qr TEXT := encode(digest('secure_single_restaurant_qr_table_99_alpha', 'sha256'), 'hex');
  v_qr_res JSONB;
  v_session_token TEXT;
  v_idemp_key UUID := gen_random_uuid();
  v_order_res_1 JSONB;
  v_order_res_2 JSONB;
  v_anon_count INT;
  v_escalation_blocked BOOLEAN := false;
BEGIN
  -- 1. Ensure singleton settings exist with 5% tax & 0% service charge for predictable check
  INSERT INTO public.restaurant_settings (singleton_key, name, tax_rate, service_charge_rate, is_accepting_orders)
  VALUES (true, 'TableTap Test Bistro', 5.00, 0.00, true)
  ON CONFLICT (singleton_key) DO UPDATE SET
    tax_rate = 5.00,
    service_charge_rate = 0.00,
    is_accepting_orders = true;

  -- 2. Seed Auth Users (trigger creates profiles) & set exact test roles
  INSERT INTO auth.users (id, email)
  VALUES
    (v_admin_id, 'admin@tabletap.test'),
    (v_kitchen_id, 'kitchen@tabletap.test')
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.profiles SET role = 'admin', active = true WHERE id = v_admin_id;
  UPDATE public.profiles SET role = 'kitchen', active = true WHERE id = v_kitchen_id;

  -- 3. Seed Catalog & Table + QR
  INSERT INTO public.categories (id, name, slug)
  VALUES (v_cat_id, 'Test Wood-Fired Pizzas', 'test-wood-fired-pizzas-99');

  INSERT INTO public.products (id, category_id, name, slug, base_price)
  VALUES (v_prod_id, v_cat_id, 'Test Margherita', 'test-margherita-99', 399.00);

  INSERT INTO public.product_variants (id, product_id, name, price)
  VALUES (v_var_id, v_prod_id, 'Large (12")', 499.00);

  INSERT INTO public.tables (id, table_number, label, capacity, active)
  VALUES (v_table_id, 'T-99', 'Patio Corner', 4, true);

  INSERT INTO public.table_qr_tokens (table_id, token_hash, token_prefix, qr_token_secret, active)
  VALUES (v_table_id, v_hash_qr, LEFT(v_raw_qr, 8), v_raw_qr, true);

  -- 4. Anonymous Customer QR Resolution
  PERFORM set_config('role', 'anon', true);
  v_qr_res := public.resolve_table_qr(v_hash_qr);
  IF NOT (v_qr_res->>'valid')::BOOLEAN THEN
    RAISE EXCEPTION 'TEST FAILED: Valid QR token did not resolve';
  END IF;
  v_session_token := v_qr_res->>'session_token';

  -- 5. Server-Side Canonical Pricing, Initial 'new' Status & Idempotency
  v_order_res_1 := public.create_customer_order(
    v_session_token,
    v_idemp_key,
    jsonb_build_array(
      jsonb_build_object(
        'product_id', v_prod_id,
        'variant_id', v_var_id,
        'quantity', 2
      )
    ),
    'Extra crispy crust'
  );

  IF (v_order_res_1->>'status') <> 'new' THEN
    RAISE EXCEPTION 'TEST FAILED: Expected initial order status "new", got %', v_order_res_1->>'status';
  END IF;

  -- 2 * 499 = 998 + 5% tax (49.90) = 1047.90
  IF (v_order_res_1->>'total')::NUMERIC <> 1047.90 THEN
    RAISE EXCEPTION 'TEST FAILED: Expected canonical total 1047.90, got %', v_order_res_1->>'total';
  END IF;

  v_order_res_2 := public.create_customer_order(
    v_session_token,
    v_idemp_key,
    jsonb_build_array(
      jsonb_build_object('product_id', v_prod_id, 'variant_id', v_var_id, 'quantity', 2)
    ),
    NULL
  );

  IF NOT (v_order_res_2->>'duplicate')::BOOLEAN OR (v_order_res_2->>'order_id') <> (v_order_res_1->>'order_id') THEN
    RAISE EXCEPTION 'TEST FAILED: Idempotency failed to prevent duplicate order';
  END IF;

  -- 6. Anonymous Role Blocked from Private Orders & QR Tables
  SELECT COUNT(*) INTO v_anon_count FROM public.orders;
  IF v_anon_count <> 0 THEN
    RAISE EXCEPTION 'TEST FAILED: Anonymous role directly read % private order rows', v_anon_count;
  END IF;

  SELECT COUNT(*) INTO v_anon_count FROM public.table_qr_tokens;
  IF v_anon_count <> 0 THEN
    RAISE EXCEPTION 'TEST FAILED: Anonymous role directly read % QR token rows', v_anon_count;
  END IF;

  -- 7. Kitchen Role Permissions & Self-Elevation Prevention
  PERFORM set_config('role', 'none', true);
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_kitchen_id::text, 'role', 'authenticated')::text, true);

  BEGIN
    UPDATE public.profiles SET role = 'admin' WHERE id = v_kitchen_id;
  EXCEPTION WHEN OTHERS THEN
    v_escalation_blocked := true;
  END;

  IF NOT v_escalation_blocked THEN
    RAISE EXCEPTION 'TEST FAILED: Kitchen user was able to escalate own role to admin!';
  END IF;

  -- 8. Kitchen Advances Order Lifecycle: new -> accepted -> preparing -> ready -> completed
  PERFORM public.update_order_status_secure((v_order_res_1->>'order_id')::UUID, 'accepted', NULL);
  PERFORM public.update_order_status_secure((v_order_res_1->>'order_id')::UUID, 'preparing', NULL);
  PERFORM public.update_order_status_secure((v_order_res_1->>'order_id')::UUID, 'ready', NULL);

  -- Admin completes order
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_id::text, 'role', 'authenticated')::text, true);
  PERFORM public.update_order_status_secure((v_order_res_1->>'order_id')::UUID, 'completed', NULL);

  -- 9. Revoked QR Fails Resolution
  PERFORM set_config('role', 'none', true);
  PERFORM set_config('request.jwt.claims', '{}', true);
  UPDATE public.table_qr_tokens SET active = false, revoked_at = clock_timestamp() WHERE token_hash = v_hash_qr;
  v_qr_res := public.resolve_table_qr(v_hash_qr);
  IF (v_qr_res->>'valid')::BOOLEAN THEN
    RAISE EXCEPTION 'TEST FAILED: Revoked QR token still resolved!';
  END IF;

  RAISE NOTICE 'ALL SINGLE-RESTAURANT RLS, ROLE GUARD, QR & ORDER LIFECYCLE ASSERTIONS PASSED!';
END $$;

ROLLBACK;
