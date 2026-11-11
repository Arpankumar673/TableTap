# 08 — Security, Testing and Release Checklist

## 1. Security baseline
- Enable RLS on all tables exposed through Supabase APIs.
- Default-deny access; add explicit policies.
- Keep service-role and payment secrets server-side only.
- Validate all inputs server-side using schemas.
- Derive restaurant/table/session context from verified tokens, not arbitrary client IDs.
- Use unguessable QR/session/order tracking tokens; support revocation and expiry.
- Rate-limit QR resolution, login and order submission.
- Use idempotency keys for order creation and payment callbacks.
- Validate order state transitions on the server.
- Verify payment webhooks using provider signatures; never trust browser success redirects.
- Avoid storing card data.
- Log security-relevant actions without leaking tokens or personal data.
- Use HTTPS in all environments outside local development.
- Establish data retention, backup and restore policies.

## 2. Test strategy
### Unit tests
- Price calculation, option validation, tax/discount calculation.
- Order state transition rules.
- QR token validation and expiry.
- Role/permission helper functions.

### Integration tests
- Order creation transaction.
- Menu availability and price revalidation.
- Tenant isolation and RLS.
- Kitchen status updates.
- Payment webhook idempotency when payment is implemented.

### End-to-end tests
- Admin creates menu and table.
- QR opens the correct menu/table.
- Customer customizes item and places order.
- Kitchen receives and updates order.
- Customer sees status update.
- Admin reviews completed order and totals.

### Non-functional tests
- Mobile responsiveness from 320 px upward.
- Keyboard navigation and accessible labels.
- Image loading/performance.
- Realtime reconnect and missed-event recovery.
- Concurrent order submission and duplicate prevention.
- Basic load test for expected pilot traffic.

## 3. Release checklist
- [ ] Production Supabase project and RLS reviewed.
- [ ] Database migrations applied and backed up.
- [ ] Environment variables configured in hosting.
- [ ] No secrets in client bundle or repository.
- [ ] QR tokens tested, printable and revocable.
- [ ] Tax, service charge, discounts and rounding approved.
- [ ] Order status and cancellation rules approved.
- [ ] Payment provider test and webhook verification completed if enabled.
- [ ] Kitchen tablet/browser tested on actual restaurant network.
- [ ] Customer flow tested on Android and iOS browsers.
- [ ] Monitoring and error alerts configured.
- [ ] Backup/restore and rollback plan documented.
- [ ] Pilot restaurant sign-off obtained.
