import crypto from "crypto";
import { describe, expect, it } from "vitest";
import {
  checkRateLimit,
  generateSecureToken,
  hashToken,
  timingSafeEqualHex,
} from "../src/lib/security/tokens";
import {
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from "../src/lib/payments/razorpay";

describe("Security Tokens, Rate Limiting & Payment Signatures", () => {
  it("generates unique cryptographic base64url QR tokens", () => {
    const t1 = generateSecureToken(24);
    const t2 = generateSecureToken(24);
    expect(t1).not.toBe(t2);
    expect(t1.length).toBeGreaterThanOrEqual(32);
    expect(/^[A-Za-z0-9_-]+$/.test(t1)).toBe(true);
  });

  it("hashes tokens deterministically with SHA-256", () => {
    const raw = "sample-secret-qr-token";
    const h1 = hashToken(raw);
    const h2 = hashToken(`  ${raw}  `);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
    expect(timingSafeEqualHex(h1, h2)).toBe(true);
    expect(timingSafeEqualHex(h1, hashToken("different"))).toBe(false);
  });

  it("enforces sliding-window rate limits per identifier", () => {
    const key = `test-ip-${Date.now()}`;
    expect(checkRateLimit(key, 2, 10_000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 10_000).allowed).toBe(true);
    const third = checkRateLimit(key, 2, 10_000);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("verifies Razorpay checkout HMAC-SHA256 signatures strictly", () => {
    const secret = "rzp_test_secret_12345";
    const orderId = "order_ABC123";
    const paymentId = "pay_XYZ789";

    const validSig = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    expect(
      verifyRazorpayPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: validSig,
        keySecret: secret,
      })
    ).toBe(true);

    // Tampered payment ID must fail
    expect(
      verifyRazorpayPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: "pay_TAMPERED",
        razorpaySignature: validSig,
        keySecret: secret,
      })
    ).toBe(false);

    // Wrong secret must fail
    expect(
      verifyRazorpayPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: validSig,
        keySecret: "wrong_secret",
      })
    ).toBe(false);
  });

  it("verifies Razorpay webhook payload HMAC-SHA256 signatures", () => {
    const webhookSecret = "whsec_tabletap_999";
    const rawBody = JSON.stringify({ event: "payment.captured", payload: {} });
    const sig = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    expect(
      verifyRazorpayWebhookSignature({
        rawBody,
        signatureHeader: sig,
        webhookSecret,
      })
    ).toBe(true);

    expect(
      verifyRazorpayWebhookSignature({
        rawBody: rawBody + " ",
        signatureHeader: sig,
        webhookSecret,
      })
    ).toBe(false);
  });
});
