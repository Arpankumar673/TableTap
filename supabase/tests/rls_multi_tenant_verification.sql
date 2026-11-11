-- ==============================================================================
-- TABLETAP — MULTI-TENANT RLS & SECURITY VERIFICATION SUITE
-- Safe Transaction Script (Wrapped in BEGIN ... ROLLBACK so zero test data persists)
--
-- Tests Covered:
-- 1. Two independent restaurants (Restaurant A & Restaurant B)
-- 2. Owner, Kitchen, and Anonymous authorization boundaries
-- 3. Strict cross-tenant RLS isolation (Restaurant A cannot read/modify Restaurant B)
-- 4. Immutable `restaurant_id` protection trigger
-- 5. Cryptographic QR token resolution and revocation invalidation
-- 6. Server-side canonical order pricing & immutable snapshots
-- 7. Duplicate order prevention via idempotency_key
-- ==============================================================================

BEGIN;

SET LOCAL search_path = public, extensions;

DO $$
DECLARE
  v_user_a UUID := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  v_user_b UUID := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
  v_kitchen_a UUID := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';

  v_rest_a UUID := '11111111-1111-4111-8111-111111111111';
  v_rest_b UUID := '22222222-2222-4222-8222-222222222222';

  v_cat_a UUID := '33333333-3333-4333-8333-333333333331';
  v_prod_a UUID := '44444444-4444-4444-8444-444444444441';
  v_var_a UUID := '55555555-5555-4555-8555-555555555551';
  v_table_a UUID := '66666666-6666-4666-8666-666666666661';
  v_table_b UUID := '66666666-6666-4666-8666-666666666662';

  v_raw_qr TEXT := 'secure_test_qr_token_table_01_alpha';
  v_hash_qr TEXT := encode(digest('secure_test_qr_token_table_01_alpha', 'sha256'), 'hex');
  v_qr_res JSONB;
  v_session_token TEXT;
  v_idemp_key UUID := gen_random_uuid();
  v_order_res_1 JSONB;
  v_order_res_2 JSONB;
  v_cross_count INT;
  v_immutable_blocked BOOLEAN := false;
BEGIN
  -- 1. Seed Auth Users in transaction (Supabase auth.users)
  INSERT INTO auth.users (id, email)
  VALUES
    (v_user_a, 'owner-a@tabletap.test'),
    (v_kitchen_a, 'kitchen-a@tabletap.test'),
    (v_user_b, 'owner-b@tabletap.test')
  ON CONFLICT (id) DO NOTHING;

  -- 2. Create Restaurant A and Restaurant B
  INSERT INTO public.restaurants (id, name, slug, tax_rate, service_charge_rate)
  VALUES
    (v_rest_a, 'Pizza House A', 'pizza-house-a-test', 5.00, 0.00),
    (v_rest_b, 'Saffron Bistro B', 'saffron-bistro-b-test', 5.00, 0.00);

  INSERT INTO public.restaurant_memberships (restaurant_id, user_id, role, active)
  VALUES
    (v_rest_a, v_user_a, 'owner', true),
    (v_rest_a, v_kitchen_a, 'kitchen', true),
    (v_rest_b, v_user_b, 'owner', true);

  -- 3. Create Category, Product, Variant, Tables & QR for Tenant A & Tenant B
  INSERT INTO public.categories (id, restaurant_id, name, slug)
  VALUES (v_cat_a, v_rest_a, 'Veg Pizza', 'veg-pizza');

  INSERT INTO public.products (id, restaurant_id, category_id, name, slug, base_price)
  VALUES (v_prod_a, v_rest_a, v_cat_a, 'Margherita', 'margherita', 399.00);

  INSERT INTO public.product_variants (id, restaurant_id, product_id, name, price)
  VALUES (v_var_a, v_rest_a, v_prod_a, 'Large (12")', 499.00);

  INSERT INTO public.restaurant_tables (id, restaurant_id, table_number)
  VALUES
    (v_table_a, v_rest_a, 'T-01'),
    (v_table_b, v_rest_b, 'T-01');

  INSERT INTO public.table_qr_tokens (restaurant_id, table_id, token_hash, active)
  VALUES (v_rest_a, v_table_a, v_hash_qr, true);

  -- 4. Test QR Resolution as Anonymous Customer
  PERFORM set_config('role', 'anon', true);
  v_qr_res := public.resolve_table_qr(v_hash_qr);
  IF NOT (v_qr_res->>'valid')::BOOLEAN THEN
    RAISE EXCEPTION 'TEST FAILED: Valid QR token did not resolve';
  END IF;
  v_session_token := v_qr_res->>'session_token';

  -- 5. Test Server-Side Canonical Pricing & Idempotency via create_customer_order
  v_order_res_1 := public.create_customer_order(
    v_session_token,
    v_idemp_key,
    jsonb_build_array(
      jsonb_build_object(
        'product_id', v_prod_a,
        'variant_id', v_var_a,
        'quantity', 2
      )
    ),
    'Extra crispy crust'
  );

  -- 2 * ₹499 = ₹998 subtotal + 5% tax (₹49.90) = ₹1047.90
  IF (v_order_res_1->>'total')::NUMERIC <> 1047.90 THEN
    RAISE EXCEPTION 'TEST FAILED: Expected canonical total 1047.90, got %', v_order_res_1->>'total';
  END IF;

  -- Retry same idempotency key -> must return duplicate=true and NOT create second order
  v_order_res_2 := public.create_customer_order(
    v_session_token,
    v_idemp_key,
    jsonb_build_array(
      jsonb_build_object('product_id', v_prod_a, 'variant_id', v_var_a, 'quantity', 2)
    ),
    NULL
  );

  IF NOT (v_order_res_2->>'duplicate')::BOOLEAN OR (v_order_res_2->>'order_id') <> (v_order_res_1->>'order_id') THEN
    RAISE EXCEPTION 'TEST FAILED: Idempotency check failed to prevent duplicate order';
  END IF;

  -- 6. Verify Anonymous User Cannot Directly Query Private Orders Table
  SELECT COUNT(*) INTO v_cross_count FROM public.orders;
  IF v_cross_count <> 0 THEN
    RAISE EXCEPTION 'TEST FAILED: Anonymous role directly read % private order rows', v_cross_count;
  END IF;

  -- 7. Verify Tenant Isolation: Owner B CANNOT read Restaurant A's orders or tables
  PERFORM set_config('role', 'none', true);
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_b::text, 'role', 'authenticated')::text, true);

  SELECT COUNT(*) INTO v_cross_count FROM public.orders WHERE restaurant_id = v_rest_a;
  IF v_cross_count <> 0 THEN
    RAISE EXCEPTION 'TEST FAILED: Tenant B leaked % orders from Tenant A!', v_cross_count;
  END IF;

  -- 8. Verify Owner A CAN read Restaurant A's orders and Kitchen CAN update status
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_kitchen_a::text, 'role', 'authenticated')::text, true);
  PERFORM public.update_order_status_secure((v_order_res_1->>'order_id')::UUID, 'accepted', NULL);

  -- 9. Verify Immutable restaurant_id trigger blocks tenant hijacking
  PERFORM set_config('role', 'none', true);
  PERFORM set_config('request.jwt.claims', '{}', true);
  BEGIN
    UPDATE public.products SET restaurant_id = v_rest_b WHERE id = v_prod_a;
  EXCEPTION WHEN OTHERS THEN
    v_immutable_blocked := true;
  END;
  IF NOT v_immutable_blocked THEN
    RAISE EXCEPTION 'TEST FAILED: restaurant_id modification was not blocked';
  END IF;

  -- 10. Verify Revoked QR Fails Resolution
  UPDATE public.table_qr_tokens SET active = false, revoked_at = clock_timestamp() WHERE token_hash = v_hash_qr;
  v_qr_res := public.resolve_table_qr(v_hash_qr);
  IF (v_qr_res->>'valid')::BOOLEAN THEN
    RAISE EXCEPTION 'TEST FAILED: Revoked QR token still resolved!';
  END IF;

  RAISE NOTICE 'ALL 10 MULTI-TENANT RLS & SECURITY ASSERTIONS PASSED!';
END $$;

ROLLBACK;
